# Wdrożenie NeuroLab na Ubuntu 24.04

Instrukcja zakłada: Nginx obsługuje już inne aplikacje, PostgreSQL działa lokalnie,
a dostęp SSH odbywa się za pomocą użytkownika i hasła. Aplikacja będzie działać
pod `https://neurolab.ntwit.pl`, na wewnętrznym porcie `127.0.0.1:3117`.
Żaden z poniższych kroków nie wymaga zmiany konfiguracji innych subdomen.

> Przed rozpoczęciem sprawdź kopie zapasowe, wolne miejsce i konfigurację
> serwera. Dane pacjentów wymagają odpowiedniej ochrony; hasło SSH jest mniej
> bezpieczne niż dedykowany klucz. Ogranicz dostęp do konta wdrożeniowego,
> włącz ochronę środowiska GitHub i 2FA. Nie wpisuj żadnych haseł do repozytorium,
> logów Actions ani zrzutów ekranu.

## 1. DNS i weryfikacja serwera

1. Dodaj rekord DNS `A`: `neurolab.ntwit.pl` → `77.55.208.178`.
   Jeśli istnieje rekord `AAAA`, musi również wskazywać właściwy serwer IPv6;
   w przeciwnym razie usuń go u operatora DNS.
2. Połącz się ze swoim istniejącym kontem administracyjnym:

   ```bash
   ssh UZYTKOWNIK@77.55.208.178
   ```

3. Sprawdź istniejący proxy i wolny port. Jeśli port 3117 jest zajęty, wybierz
   inny i zmień go konsekwentnie w usłudze systemd, Nginx oraz
   `scripts/deploy.sh`, **przed** wdrożeniem.

   ```bash
   sudo nginx -t
   sudo systemctl status nginx --no-pager
   sudo ss -ltnp
   getent ahostsv4 neurolab.ntwit.pl
   ```

   Upewnij się, że nie istnieje już inny blok Nginx z `server_name neurolab.ntwit.pl`
   (`sudo nginx -T` pokazuje całą konfigurację). Nie usuwaj istniejących witryn
   ani nie zmieniaj domyślnego vhosta. Porty 80 i 443 muszą być osiągalne
   publicznie dla tej domeny; nie otwieraj portu 3117 na zewnątrz.

## 2. Node.js, narzędzia i konto

Użyj **osobnego** konta wdrożeniowego z logowaniem hasłem i powłoką Bash.
Podstaw jego istniejącą nazwę w miejsce `LOGIN_DEPLOY` i przeprowadź kroki
administracyjne z konta mającego `sudo`. Konto wdrożeniowe będzie też kontem
procesu aplikacji i musi móc odczytać sekret aplikacji oraz zapisywać wyłącznie
katalogi NeuroLab.

```bash
export DEPLOY_USER=LOGIN_DEPLOY
id "$DEPLOY_USER"
sudo apt-get update
sudo apt-get install -y curl ca-certificates openssl nginx certbot python3-certbot-nginx postgresql-client
```

Wymagany jest Node.js 22 (co najmniej 22.12) oraz `pg_dump` o wersji głównej
nie starszej niż serwer PostgreSQL. Sprawdź `pg_dump --version` i wersję serwera
(`sudo -u postgres psql -c 'SHOW server_version;'`); w razie potrzeby zainstaluj
pasującego klienta PostgreSQL. Poniżej przykład **osobnej** instalacji Node 22
dla Linux x86_64, bez podmiany Node używanego przez inne aplikacje. Sprawdź
architekturę przez `uname -m`; na ARM pobierz odpowiednie archiwum `linux-arm64`.
W razie potrzeby wybierz aktualny patch Node 22 z oficjalnych wydań.

```bash
NODE_VERSION=v22.22.0
cd /tmp
curl -fsSLO "https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-linux-x64.tar.xz"
curl -fsSLO "https://nodejs.org/dist/${NODE_VERSION}/SHASUMS256.txt"
grep "  node-${NODE_VERSION}-linux-x64.tar.xz$" SHASUMS256.txt | sha256sum -c -
sudo tar -xJf "node-${NODE_VERSION}-linux-x64.tar.xz" -C /opt
sudo ln -s "/opt/node-${NODE_VERSION}-linux-x64" /opt/neurolab-node
export PATH="/opt/neurolab-node/bin:$PATH"
node --version
npm --version
```

Nie nadpisuj istniejącego `/opt/neurolab-node` bez sprawdzenia jego zawartości.
Sprawdzanie sumy nie zastępuje niezależnej weryfikacji podpisu wydania Node.
Zmiana `PATH` dotyczy tylko bieżącej sesji; w nowej sesji powtórz `export`, jeśli
chcesz ręcznie używać `node` lub `npm`. Skrypt wdrożenia ustawia własny `PATH`;
nie trzeba zmieniać ustawień globalnych ani konfiguracji innych aplikacji.

Utwórz katalogi i plik środowiska. Wdrożenia i backupy pozostają w oddzielnych
katalogach; plik `.env` nie jest wysyłany z GitHub.

```bash
sudo groupadd --system neurolab
sudo usermod -aG neurolab "$DEPLOY_USER"
DEPLOY_GROUP=neurolab
sudo install -d -o "$DEPLOY_USER" -g "$DEPLOY_GROUP" -m 750 \
  /srv/neurolab /srv/neurolab/releases /srv/neurolab/uploads /srv/neurolab/backups
sudo install -d -o root -g "$DEPLOY_GROUP" -m 750 /etc/neurolab
sudo install -o root -g "$DEPLOY_GROUP" -m 640 /dev/null /etc/neurolab/neurolab.env
```

Nie wykonuj ponownie ostatniego polecenia po skonfigurowaniu aplikacji — nadpisze
plik środowiska. Jeśli grupa `neurolab` już istnieje, sprawdź jej członków i
przeznaczenie przed użyciem. Nowa sesja SSH jest wymagana, aby konto uzyskało
nowe członkostwo w grupie; nie dodawaj do tej grupy nieuprawnionych osób.

## 3. Baza PostgreSQL

Utwórz osobną rolę i bazę; nie używaj administratora PostgreSQL do działania
aplikacji. Jeśli nazwy już istnieją, zatrzymaj się i sprawdź ich właścicieli,
zamiast zmieniać je dla innych aplikacji.

```bash
sudo -u postgres psql -d postgres
```

W `psql`:

```sql
CREATE ROLE neurolab_app LOGIN;
\password neurolab_app
CREATE DATABASE neurolab OWNER neurolab_app;
\q
```

Użyj silnego, losowego hasła w formacie hex (np. wygenerowanego przez
`openssl rand -hex 32`); zapisz je bezpiecznie. Unikniesz w ten sposób potrzeby
kodowania znaków specjalnych w URL. PostgreSQL musi akceptować logowanie hasłem
przez TCP na `127.0.0.1:5432` zgodnie z `pg_hba.conf`; nie zmieniaj globalnych
reguł bez sprawdzenia wpływu na inne aplikacje.

## 4. Sekrety i logowanie Authentik

Edytuj `sudo nano /etc/neurolab/neurolab.env`:

```dotenv
BASE_URL=https://neurolab.ntwit.pl
DATABASE_URL=postgresql://neurolab_app:HASLO_HEX@127.0.0.1:5432/neurolab
SESSION_SECRET=LOSOWY_SEKRET_MINIMUM_32_ZNAKI
AUTHENTIK_ISSUER=https://auth.example.com/application/o/APP_SLUG/
AUTHENTIK_CLIENT_ID=CLIENT_ID
AUTHENTIK_CLIENT_SECRET=CLIENT_SECRET
AUTHENTIK_SCOPES="openid profile email"
```

Wygeneruj `SESSION_SECRET` poleceniem `openssl rand -hex 48`. Nie używaj
placeholderów. W Authentik utwórz/skonfiguruj klienta OIDC i dodaj dokładny
redirect URI `https://neurolab.ntwit.pl/api/auth/callback`. Login wymaga
działającego Authentik i danych klienta; sama baza nie wystarczy. Jeśli
zastosujesz `AUTHENTIK_REDIRECT_URI`, musi on odpowiadać konfiguracji klienta.

Zweryfikuj połączenie TCP jako użytkownik wdrożeniowy, podając interaktywnie
to samo hasło, które ustawiono dla `neurolab_app`. Polecenie nie korzysta z
`DATABASE_URL`, więc sprawdź także, czy dane w pliku środowiska są identyczne.
`pg_dump` jest również wymagany przez workflow.

```bash
sudo -u "$DEPLOY_USER" psql -X -h 127.0.0.1 -p 5432 -U neurolab_app -d neurolab -W -c "SELECT current_database(), current_user"
```

Jeżeli pojawi się błąd `role "neurolab" does not exist`, sprawdź, czy
użyto powyższych opcji `-h`, `-U` i `-d`; bez nich PostgreSQL może użyć
lokalnego socketu i nazwy użytkownika systemowego. Nie twórz dodatkowej
roli tylko na podstawie tego komunikatu.

Skrypt backupu oczekuje lokalnego adresu PostgreSQL w `DATABASE_URL` bez
parametrów w query stringu. Dane połączenia przekazuje `pg_dump` przez
zmienne środowiskowe, a nie jako argument zawierający hasło.

## 5. Usługa systemd

Utwórz `/etc/systemd/system/neurolab.service` jako root; zastąp `LOGIN_DEPLOY`
nazwą konta z kroku 2:

```ini
[Unit]
Description=NeuroLab Vike application
After=network.target postgresql.service

[Service]
Type=simple
User=LOGIN_DEPLOY
WorkingDirectory=/srv/neurolab/current
EnvironmentFile=/etc/neurolab/neurolab.env
Environment=NODE_ENV=production
Environment=HOST=127.0.0.1
Environment=PORT=3117
ExecStart=/opt/neurolab-node/bin/node /srv/neurolab/current/dist/server/index.mjs
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

Następnie `sudo systemctl daemon-reload` i `sudo systemctl enable neurolab.service`.
Nie uruchamiaj usługi przed pierwszym wdrożeniem, ponieważ katalog `current`
jeszcze nie istnieje.

Workflow potrzebuje tylko restartu oraz zatrzymania **tej jednej** usługi.
Sprawdź rzeczywistą ścieżkę `command -v systemctl` (typowo `/usr/bin/systemctl`),
następnie użyj `sudo visudo -f /etc/sudoers.d/neurolab-deploy` i dodaj, zastępując
login oraz ewentualnie ścieżkę:

```sudoers
LOGIN_DEPLOY ALL=(root) NOPASSWD: /usr/bin/systemctl restart neurolab.service, /usr/bin/systemctl stop neurolab.service
```

Zapisz i sprawdź `sudo visudo -cf /etc/sudoers.d/neurolab-deploy`.
Konto nie potrzebuje pełnego, bezhasłowego sudo. Pamiętaj, że użytkownik
wdrożeniowy może uruchamiać kod jako konto aplikacji i ma dostęp do danych.

## 6. Nginx i HTTPS

Utwórz **nowy** plik `/etc/nginx/sites-available/neurolab.ntwit.pl`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name neurolab.ntwit.pl;

    location / {
        proxy_pass http://127.0.0.1:3117;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Usuń `listen [::]:80;` tylko jeśli Nginx/serwer nie obsługuje IPv6. Utwórz
symlink dla tej witryny i sprawdź konfigurację **przed** przeładowaniem:

```bash
sudo ln -s /etc/nginx/sites-available/neurolab.ntwit.pl /etc/nginx/sites-enabled/neurolab.ntwit.pl
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d neurolab.ntwit.pl
sudo nginx -t
sudo systemctl status certbot.timer --no-pager
```

W Certbot wybierz przekierowanie HTTP → HTTPS. Sprawdź, czy Certbot zmienił
wyłącznie konfigurację nowej domeny. Przed pierwszym wdrożeniem Nginx może
zwracać 502; wydanie certyfikatu wymaga poprawnego DNS oraz dostępu HTTP na
porcie 80. Nie usuwaj ani nie zmieniaj certyfikatów innych usług.

## 7. GitHub Actions

W repozytorium utwórz środowisko **production** (`Settings → Environments`),
opcjonalnie z wymaganym zatwierdzeniem. W jego ustawieniach dodaj:

| Rodzaj | Nazwa | Wartość |
|---|---|---|
| Variable | `DEPLOY_USER` | login SSH z kroku 2 |
| Secret | `SSH_PASSWORD` | hasło SSH tego konta |
| Secret | `SSH_KNOWN_HOSTS` | zweryfikowany pełny wiersz klucza hosta |

`SSH_KNOWN_HOSTS` musi zawierać np. pełny wiersz
`77.55.208.178 ssh-ed25519 AAAA...`, a nie tylko fingerprint. Pobierz kandydat
z zaufanego komputera:

```bash
ssh-keyscan -t ed25519 77.55.208.178 > neurolab-known-hosts
ssh-keygen -lf neurolab-known-hosts -E sha256
```

Niezależnie porównaj fingerprint z wynikiem z konsoli serwera lub innym
zaufanym kanałem:

```bash
sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub -E sha256
```

Tylko po zgodności fingerprintów wklej pełny wiersz z `neurolab-known-hosts`
do secreta. Sam `ssh-keyscan` przez niezaufaną sieć **nie uwierzytelnia**
serwera. Po rotacji klucza hosta powtórz weryfikację i zaktualizuj secret.
SSH musi przyjmować połączenia z runnerów GitHub; jeśli firewall ogranicza
adresy, zapewnij bezpieczny sposób dostępu runnera.

Po wypchnięciu zmian na `master` workflow uruchamia typecheck, build i testy
na osobnym PostgreSQL, następnie przesyła dokładnie zatwierdzony commit.
Można go też uruchomić ręcznie w Actions; wdrożenie jest wykonywane tylko
dla `master`. Nie wdraża niezapisanych ani niezatwierdzonych lokalnych zmian.

Na serwerze workflow tworzy osobny katalog wydania, wykonuje `npm ci` i build,
robi backup bazy w `/srv/neurolab/backups`, uruchamia `npm run postgres:migrate`,
przełącza symlink i restartuje usługę. Sprawdza lokalny endpoint
`/api/auth/me`; ten test potwierdza uruchomienie HTTP, ale nie pełny przebieg
logowania OIDC. W razie nieudanego restartu przywracany jest poprzedni kod.
**Migracje nie są transakcyjne i baza nie jest automatycznie cofana**; po błędzie
sprawdź log, stan schematu oraz zgodność poprzedniego kodu z bazą przed dalszymi
działaniami. Kopie zawierają dane pacjentów: ogranicz dostęp, ustaw retencję,
monitoruj wolne miejsce i wykonuj szyfrowane kopie poza serwerem zgodnie
z polityką ochrony danych.

## 8. Kontrola po wdrożeniu

```bash
sudo systemctl status neurolab.service --no-pager
sudo journalctl -u neurolab.service -n 100 --no-pager
curl -fsS http://127.0.0.1:3117/api/auth/me
curl -I https://neurolab.ntwit.pl/
```

Otwórz stronę przez HTTPS i sprawdź logowanie Authentik, listę pacjentów oraz
tworzenie i odczyt danych testowych zgodnie z zasadami organizacji. Sprawdź
również, że pozostałe subdomeny działają. Przy błędach migracji zachowaj
backup i sprawdź uprawnienia roli oraz log Actions. Wdrożenie nie uruchamia
`database/postgres/setup.sql` — schemat tworzy skrypt `postgres:migrate`.
