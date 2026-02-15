#!/bin/bash

# Configuration
ENV_FILE=".env.test"

echo "🚀 Starting E2E Test Automation..."

# 0. Load Environment Variables as single source of truth
if [ -f "$ENV_FILE" ]; then
    echo "Loading $ENV_FILE..."
    set -a
    source "$ENV_FILE"
    set +a
else
    echo "❌ $ENV_FILE not found!"
    exit 1
fi

# 1. Create local_test database in Docker
echo "Creating database $DATABASE_NAME..."
docker exec "$DATABASE_CONTAINER" psql -U "$DATABASE_USER" -d postgres -c "CREATE DATABASE $DATABASE_NAME;" > /dev/null 2>&1

# 2. Sync Schema
echo "Syncing schema (non-interactive)..."
npx drizzle-kit push --force > /dev/null 2>&1

# 3. Start Test Server
echo "Starting test server on port $TEST_PORT..."
ENV_PATH=$ENV_FILE vite dev --port $TEST_PORT &
SERVER_PID=$!

# Cleanup function to kill the server and drop the DB on exit
cleanup() {
    echo "Cleaning up..."
    kill $SERVER_PID 2>/dev/null
    # Wait a moment for connections to close before dropping
    sleep 1
    docker exec "$DATABASE_CONTAINER" psql -U "$DATABASE_USER" -d postgres -c "DROP DATABASE IF EXISTS $DATABASE_NAME WITH (FORCE);"
}
trap cleanup EXIT

# 4. Wait for server to be ready
echo "Waiting for server to be ready at $TEST_URL..."
MAX_RETRIES=30
COUNT=0
while ! curl -s "$TEST_URL" > /dev/null; do
    sleep 1
    COUNT=$((COUNT+1))
    if [ $COUNT -ge $MAX_RETRIES ]; then
        echo "❌ Server failed to start in time."
        exit 1
    fi
done
echo "✅ Server is ready!"

# 5. Run Tests
echo "Running tests..."
npx vitest --reporter=tree --run

# Exit with the test result
EXIT_CODE=$?
echo "Tests finished with exit code $EXIT_CODE"
exit $EXIT_CODE
