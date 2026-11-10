Generated with [vike.dev/new](https://vike.dev/new) ([version 681](https://www.npmjs.com/package/create-vike/v/0.0.681)) using this command:

```sh
npm create vike@latest --- --react --tailwindcss --telefunc --hono --postgres
```

## Formularze

Na liście szablonów przycisk „Klonuj” otwiera kreator z kopią układu
wybranego formularza. Wpisz nazwę nowego szablonu i zapisz go; oryginał
pozostaje bez zmian. Układ kopii można również edytować przed zapisaniem.

## Pacjenci

Strona główna zawiera szybkie akcje oraz pięciu pacjentów z najnowszą datą
wizyty. W przypadku równych dat kolejność ustala identyfikator pacjenta malejąco.

Lista `/patients` wyświetla 100 pacjentów na stronę. Wyszukiwanie obejmuje
identyfikator pacjenta i zapisane wartości pól formularzy pacjenta oraz wizyt; kilka fraz łączy
warunek OR. Datę wizyty można połączyć z wyszukiwaniem fraz. Data ostatniej
wizyty to najpóźniejsza data z rejestru wizyt; gdy rejestr jest pusty,
wyświetlana jest data pierwszej wizyty zapisana przy tworzeniu pacjenta.

Formularz jest oznaczany jako ukończony po przejściu wymaganych pól i
pomyślnym zapisie. Status jest przechowywany w danych JSON pacjenta; starsze
formularze bez tego statusu nie są automatycznie uznawane za ukończone.
Wyszukiwanie załączników obejmuje tylko zapisaną nazwę pliku.

Kliknięcie identyfikatora na liście lub w wynikach wyszukiwania otwiera
`/patient/:id`, gdzie widoczne są wszystkie przypisane formularze, ich status
i do pięciu pierwszych zapisanych wartości każdego z nich. Przycisk „Podgląd”
otwiera stronę z pełnym układem formularza i zapisanymi odpowiedziami.
Na stronie podglądu formularza pacjenta przycisk „Drukuj formularz” drukuje
sam formularz wraz z zapisanymi odpowiedziami.
Nieukończony formularz można uzupełnić lub zapisać jako wersję roboczą.
Zmiany w wybranym formularzu są zapisywane po użyciu przycisku zapisu;
zamknięcie edytora je odrzuca.

Pacjenta można przenieść do kosza z listy lub strony szczegółów. Nie pojawia się
wtedy w zwykłych listach ani wynikach wyszukiwania, a jego formularze i wizyty
pozostają zachowane. Na stronie `/trash` można go przywrócić. Jego unikalny
identyfikator pozostaje zajęty również podczas pobytu w koszu.
Przed uruchomieniem tej funkcji wykonaj `npm run postgres:migrate`, aby dodać
kolumnę `patient.is_deleted`; istniejący pacjenci pozostaną aktywni.

Na stronie pacjenta przycisk „Wizyta” tworzy wizytę z co najmniej jednym
wybranym formularzem; „Rejestr wizyt” otwiera listę wizyt danego pacjenta
z wyszukiwaniem po frazach i dacie. Formularze wizyty są niezależnymi kopiami,
które można później uzupełnić, edytować i obejrzeć.
Przed pierwszym uruchomieniem tej funkcji wykonaj `npm run postgres:migrate`,
aby utworzyć tabelę `visits`. Pierwsza wizyta, przechowywana w danych pacjenta,
jest wyświetlana jako dodatkowy pierwszy wiersz na każdej stronie rejestru;
prowadzi do szczegółów pacjenta. Pozostaje widoczna niezależnie od filtrów i nie
jest wliczana do liczby ani paginacji wizyt w rejestrze. Wyszukiwarka obejmuje
wizyty zapisane w tabeli `visits`.

Testy wyszukiwania można uruchomić przez `node --import tsx --test pages/patients/patients.test.ts`.
Test PostgreSQL wymaga ustawienia `TEST_DATABASE_URL` i korzysta wyłącznie
z tymczasowej tabeli w tej bazie.

## Wdrożenie

Konfiguracja Ubuntu, PostgreSQL, Nginx, Authentik i GitHub Actions jest opisana
w [przewodniku wdrożenia](docs/deployment.md).

## Contents

- [Vike](#vike)
  - [Plus files](#plus-files)
  - [Routing](#routing)
  - [SSR](#ssr)
  - [HTML Streaming](#html-streaming)

## Vike

This app is ready to start. It's powered by [Vike](https://vike.dev) and [React](https://react.dev/learn).

### Plus files

[The + files are the interface](https://vike.dev/config) between Vike and your code.

- [`+config.ts`](https://vike.dev/settings) — Settings (e.g. `<title>`)
- [`+Page.tsx`](https://vike.dev/Page) — The `<Page>` component
- [`+data.ts`](https://vike.dev/data) — Fetching data (for your `<Page>` component)
- [`+Layout.tsx`](https://vike.dev/Layout) — The `<Layout>` component (wraps your `<Page>` components)
- [`+Head.tsx`](https://vike.dev/Head) - Sets `<head>` tags
- [`/pages/_error/+Page.tsx`](https://vike.dev/error-page) — The error page (rendered when an error occurs)
- [`+onPageTransitionStart.ts`](https://vike.dev/onPageTransitionStart) and `+onPageTransitionEnd.ts` — For page transition animations

### Routing

[Vike's built-in router](https://vike.dev/routing) lets you choose between:

- [Filesystem Routing](https://vike.dev/filesystem-routing) (the URL of a page is determined based on where its `+Page.jsx` file is located on the filesystem)
- [Route Strings](https://vike.dev/route-string)
- [Route Functions](https://vike.dev/route-function)

### SSR

SSR is enabled by default. You can [disable it](https://vike.dev/ssr) for all or specific pages.

### HTML Streaming

You can [enable/disable HTML streaming](https://vike.dev/stream) for all or specific pages.
