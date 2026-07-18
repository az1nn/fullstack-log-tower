#!/usr/bin/env bash
set -euo pipefail

# One-command setup: install native Docker (no proxy), then build & run the
# full stack (db + backend + frontend) via docker compose.
#
# Usage:  bash scripts/setup.sh
#
# If Docker is already installed and working, this skips the install and just
# runs the stack. If Docker Desktop is injecting a broken proxy, this switches
# to the native engine so pulls work.

cd "$(dirname "$0")/.."

echo "==> Checking Docker"
if ! command -v docker >/dev/null 2>&1; then
  echo "Docker not found — installing native Docker Engine..."
  bash scripts/install-docker.sh
else
  echo "Docker already present: $(docker --version 2>/dev/null || echo unknown)"
fi

# Prefer the native docker socket (avoid Docker Desktop's proxied engine).
if docker context ls 2>/dev/null | grep -q "default \*"; then
  docker context use default >/dev/null 2>&1 || true
fi

# Ensure the native docker service is running (no-op if managed by Desktop).
if ! docker info >/dev/null 2>&1; then
  echo "==> Starting docker service"
  sudo service docker start >/dev/null 2>&1 || sudo systemctl start docker >/dev/null 2>&1 || true
fi

echo "==> Docker proxy config:"
docker info 2>/dev/null | grep -i "http proxy" || echo "  (no HTTP proxy — good)"

if ! docker compose version >/dev/null 2>&1; then
  echo "ERROR: docker compose plugin missing. Re-run scripts/install-docker.sh." >&2
  exit 1
fi

echo "==> Building and starting the stack (db + backend + frontend)"
echo "    Frontend will be at http://localhost:8080"
docker compose up --build "$@"
