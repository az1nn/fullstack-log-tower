#!/usr/bin/env bash
set -euo pipefail

# Build + run the backend locally with Docker.
# Run with: bash scripts/build-and-run.sh
# Requires Docker and the root docker-compose.yml Postgres.
# DATABASE_URL is read from .env (falls back to .env.example).

cd "$(dirname "$0")/.."

IMAGE="logtower:local"

load_env() {
  local file=".env"
  if [[ ! -f "$file" ]]; then file=".env.example"; fi
  if [[ -f "$file" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$file"
    set +a
  fi
}

load_env

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL not found in .env or .env.example" >&2
  exit 1
fi

# Inside the container, reach the host's Postgres via host.docker.internal.
DB_URL="${DATABASE_URL//localhost/host.docker.internal}"

echo "==> Starting Postgres via docker compose"
docker compose up -d

echo "==> Building backend image ($IMAGE)"
docker build -t "$IMAGE" .

echo "==> Running backend on :3333"
if [[ "$(uname)" == "Linux" ]]; then
  docker run --rm -p 3333:3333 --add-host=host.docker.internal:host-gateway \
    -e DATABASE_URL="$DB_URL" "$IMAGE"
else
  docker run --rm -p 3333:3333 \
    -e DATABASE_URL="$DB_URL" "$IMAGE"
fi
