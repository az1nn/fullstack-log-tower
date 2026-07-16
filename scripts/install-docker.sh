#!/usr/bin/env bash
set -euo pipefail

# Install Docker Engine on Ubuntu/Debian.
# Run with: bash scripts/install-docker.sh
# After install, log out/in (or `newgrp docker`) to run docker without sudo.

if ! command -v docker >/dev/null 2>&1; then
  echo "==> Removing any old Docker versions"
  sudo apt-get remove -y docker docker-engine docker.io containerd runc || true

  echo "==> Installing prerequisites"
  sudo apt-get update
  sudo apt-get install -y ca-certificates curl gnupg

  echo "==> Adding Docker GPG key + apt repo"
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg

  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
fi

echo "==> Installing Docker Engine"
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "==> Enabling + starting Docker"
sudo systemctl enable --now docker

echo "==> Adding $USER to docker group (re-login to apply)"
sudo usermod -aG docker "$USER"

echo "==> Verifying with hello-world"
if sudo docker run --rm hello-world >/dev/null 2>&1; then
  echo "Docker installed successfully. Log out/in (or run: newgrp docker) to use without sudo."
else
  echo "Docker installed but hello-world failed. Check 'sudo systemctl status docker'."
fi
