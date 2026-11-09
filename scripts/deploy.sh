#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
export PATH=/opt/neurolab-node/bin:/usr/local/bin:/usr/bin:/bin

root=/srv/neurolab
env_file=/etc/neurolab/neurolab.env
release_id="${1:?Missing release identifier}"
if [[ ! "$release_id" =~ ^[0-9]+-[0-9]+-[a-f0-9]{40}$ ]]; then
    echo "Invalid release identifier" >&2
    exit 1
fi

archive="$root/uploads/$release_id.tar.gz"
release="$root/releases/$release_id"
backup="$root/backups/$release_id.dump"
test -r "$archive"
test -r "$env_file"
test ! -e "$release"
test ! -e "$backup"

mkdir "$release"
tar -xzf "$archive" -C "$release"
ln -s "$env_file" "$release/.env"
cd "$release"
npm ci --include=dev
npm run build

node --env-file="$env_file" -e '
const { spawnSync } = require("node:child_process");
const { postgresEnvironment } = require("./scripts/pg-connection.cjs");
const result = spawnSync("pg_dump", ["--no-password", "--format=custom", "--file", process.argv[1]], {
  env: postgresEnvironment(process.env.DATABASE_URL),
  stdio: "inherit"
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
' "$backup"

npm run postgres:migrate

previous=""
if [[ -L "$root/current" ]]; then
    previous="$(readlink -f "$root/current")"
elif [[ -e "$root/current" ]]; then
    echo "$root/current must be a symbolic link" >&2
    exit 1
fi

next="$root/.current-$release_id"
ln -s "$release" "$next"
mv -Tf "$next" "$root/current"

if sudo -n systemctl restart neurolab.service; then
    for attempt in {1..20}; do
        if systemctl is-active --quiet neurolab.service &&
            curl --fail --silent --show-error --max-time 2 http://127.0.0.1:3117/api/auth/me >/dev/null; then
            rm -- "$archive"
            echo "Deployment successful: $release_id"
            exit 0
        fi
        sleep 1
    done
fi

echo "Deployment failed health check; restoring previous release." >&2
if [[ -n "$previous" && -d "$previous" ]]; then
    ln -s "$previous" "$next"
    mv -Tf "$next" "$root/current"
    if ! sudo -n systemctl restart neurolab.service; then
        echo "Failed to restart previous release; manual intervention required." >&2
    fi
else
    echo "No previous release available; manual intervention required." >&2
    if ! sudo -n systemctl stop neurolab.service; then
        echo "Failed to stop unhealthy service." >&2
    fi
fi
echo "Database changes were not rolled back; backup: $backup" >&2
exit 1
