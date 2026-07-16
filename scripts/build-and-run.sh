#!/usr/bin/env bash
set -euo pipefail

# Build + run the backend locally with Docker.
# Run with: bash scripts/build-and-run.sh
# Requires Docker and the root docker-compose.yml Postgres.

cd "$(dirname "$0")/.."

IMAGE="logtower:local"
DB_URL="postgresql://admin:adminpassword@host.docker.internal:5432/logsdb?schema=public"

echo "==> Starting Postgres via docker compose"
docker compose up -d

echo "==> Building backend image ($IMAGE)"
docker build -t "$IMAGE" .

echo "==> Running backend on :3333"
# Linux: add --add-host so host.docker.internal resolves to the host gateway.
if [[ "$(uname)" == "Linux" ]]; then
  docker run --rm -p 3333:3333 --add-host=host.docker.internal:host-gateway \
    -e DATABASE_URL="$DB_URL" "$IMAGE"
else
  docker run --rm -p 3333:3333 \
    -e DATABASE_URL="$DB_URL" "$IMAGE"
fi
