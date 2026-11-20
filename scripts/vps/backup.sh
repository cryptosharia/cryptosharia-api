#!/bin/sh
set -eu
: "${VPS_ENV_FILE:?Set VPS_ENV_FILE and load its variables into the environment}"
: "${1:?Usage: backup.sh OUTPUT.dump}"
[ ! -e "$1" ] || { echo 'Output already exists' >&2; exit 1; }
umask 077
# Use a temporary file so a failed dump never appears complete.
tmp="$1.partial.$$"
trap 'rm -f "$tmp"' EXIT HUP INT TERM
docker compose --env-file "$VPS_ENV_FILE" -f compose.vps.yml exec -T postgres sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner --no-privileges' > "$tmp"
[ -s "$tmp" ] || { echo 'Empty dump' >&2; exit 1; }
mv "$tmp" "$1"
