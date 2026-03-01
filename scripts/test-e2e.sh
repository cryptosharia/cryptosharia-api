#!/usr/bin/env bash

set -euo pipefail

ENV_FILE=".env.test"
SERVER_PID=""
DB_CREATED=0

echo "🚀 Starting E2E test automation..."

if [[ -f "$ENV_FILE" ]]; then
	echo "Loading $ENV_FILE..."
	set -a
	# shellcheck disable=SC1090
	source "$ENV_FILE"
	set +a
else
	echo "❌ $ENV_FILE not found"
	exit 1
fi

cleanup() {
	local exit_code=$?
	echo "Cleaning up..."

	if [[ -n "$SERVER_PID" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
		kill "$SERVER_PID" 2>/dev/null || true
		wait "$SERVER_PID" 2>/dev/null || true
	fi

	if [[ "$DB_CREATED" -eq 1 ]]; then
		docker exec "$DATABASE_CONTAINER" psql -U "$DATABASE_USER" -d postgres -c \
			"DROP DATABASE IF EXISTS \"$DATABASE_NAME\" WITH (FORCE);" >/dev/null 2>&1 || true
	fi

	return "$exit_code"
}

trap cleanup EXIT

echo "Preparing database $DATABASE_NAME..."
docker exec "$DATABASE_CONTAINER" psql -U "$DATABASE_USER" -d postgres -c \
	"DROP DATABASE IF EXISTS \"$DATABASE_NAME\" WITH (FORCE);" >/dev/null 2>&1 || true
docker exec "$DATABASE_CONTAINER" psql -U "$DATABASE_USER" -d postgres -c \
	"CREATE DATABASE \"$DATABASE_NAME\";" >/dev/null
DB_CREATED=1

echo "Syncing schema..."
npx drizzle-kit push --force >/dev/null

echo "Starting test server on port $TEST_PORT..."
ENV_PATH="$ENV_FILE" vite dev --host 0.0.0.0 --port "$TEST_PORT" >/dev/null 2>&1 &
SERVER_PID=$!

echo "Waiting for server at $TEST_URL..."
MAX_RETRIES=30
COUNT=0
until curl -fsS "$TEST_URL" >/dev/null 2>&1; do
	sleep 1
	COUNT=$((COUNT + 1))
	if [[ $COUNT -ge $MAX_RETRIES ]]; then
		echo "❌ Server failed to start in time"
		exit 1
	fi
done
echo "✅ Server is ready"

echo "Running tests..."
set +e
npx vitest --reporter=tree --run
EXIT_CODE=$?
set -e

echo "Tests finished with exit code $EXIT_CODE"
exit "$EXIT_CODE"
