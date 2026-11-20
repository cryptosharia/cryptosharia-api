#!/bin/sh
set -eu
: "${VPS_ENV_FILE:?Set VPS_ENV_FILE to the local VPS env file}"
[ -f "$VPS_ENV_FILE" ] || { echo 'Env file missing' >&2; exit 1; }
command -v docker >/dev/null || { echo 'Docker CLI missing' >&2; exit 1; }
docker compose version >/dev/null
docker network inspect cryptosharia_proxy >/dev/null
docker compose --env-file "$VPS_ENV_FILE" -f compose.vps.yml config --quiet
echo 'Compose configuration and proxy network validated. Check credential consistency and backups separately.'
