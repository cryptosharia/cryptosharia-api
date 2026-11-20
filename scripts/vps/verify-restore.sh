#!/bin/sh
set -eu
: "${1:?Usage: verify-restore.sh INPUT.dump}"
[ -f "$1" ] || { echo 'Dump not found' >&2; exit 1; }
command -v openssl >/dev/null
name="cryptosharia-restore-check-$$"
password=$(openssl rand -hex 24)
cleanup() { docker rm -f "$name" >/dev/null 2>&1 || :; }
trap cleanup EXIT HUP INT TERM
docker run -d --name "$name" --network none -e POSTGRES_PASSWORD="$password" -e POSTGRES_DB=restore_check postgres:18-alpine >/dev/null
i=0
until docker exec "$name" pg_isready -U postgres -d restore_check >/dev/null 2>&1; do
  i=$((i + 1)); [ "$i" -lt 60 ] || { echo 'Restore server did not become ready' >&2; exit 1; }; sleep 1
done
# Neon-managed neon_auth has provider-specific catalog attributes unsupported by
# stock PostgreSQL. This verifies the application-owned schemas only; it is not
# a complete restore test for Neon Auth identities and sessions.
docker exec "$name" psql -U postgres -d restore_check -v ON_ERROR_STOP=1 \
  -c "CREATE SCHEMA IF NOT EXISTS drizzle;" >/dev/null
docker exec -i "$name" pg_restore -U postgres -d restore_check \
  --exit-on-error --no-owner --no-privileges \
  --schema=public --schema=drizzle < "$1"
docker exec "$name" psql -U postgres -d restore_check -v ON_ERROR_STOP=1 -c "SELECT count(*) AS public_tables FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';"
docker exec "$name" psql -U postgres -d restore_check -v ON_ERROR_STOP=1 \
  -c "SELECT 'users' AS table_name, count(*) FROM public.users UNION ALL SELECT 'posts',count(*) FROM public.posts UNION ALL SELECT 'academy_content',count(*) FROM public.academy_content UNION ALL SELECT 'assets',count(*) FROM public.assets;"
echo 'Application schemas public+drizzle restored. Neon Auth schema intentionally excluded; review its separate migration.'
