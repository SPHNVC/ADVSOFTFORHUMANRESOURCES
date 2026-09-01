#!/usr/bin/env bash
set -euo pipefail

echo "[setup-docker] checking for Docker..."
if ! command -v docker >/dev/null 2>&1; then
  echo "[setup-docker] Docker not found, installing Docker Engine + Compose plugin (requires sudo)..."

  echo "[setup-docker] installing prerequisites"
  sudo apt-get update
  sudo apt-get install -y ca-certificates curl

  echo "[setup-docker] adding Docker's official GPG key"
  sudo install -m 0755 -d /etc/apt/keyrings
  sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  sudo chmod a+r /etc/apt/keyrings/docker.asc

  echo "[setup-docker] adding Docker's apt repository"
  ARCH="$(dpkg --print-architecture)"
  CODENAME="$(. /etc/os-release && echo "$VERSION_CODENAME")"
  echo "deb [arch=${ARCH} signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${CODENAME} stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

  echo "[setup-docker] installing docker-ce, docker-ce-cli, containerd.io, docker-compose-plugin"
  sudo apt-get update
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
else
  echo "[setup-docker] Docker already installed: $(docker --version)"
fi

echo "[setup-docker] ensuring docker service is enabled and running..."
sudo systemctl enable docker
sudo systemctl start docker

echo "[setup-docker] verifying docker compose plugin..."
docker compose version

if ! groups "$USER" | grep -q '\bdocker\b'; then
  echo "[setup-docker] adding $USER to the 'docker' group (run without sudo next time)..."
  sudo usermod -aG docker "$USER"
  echo "[setup-docker] NOTE: log out/in (or run 'newgrp docker') for group membership to take effect."
  echo "                  Until then, this run may still need sudo for docker commands."
else
  echo "[setup-docker] $USER already in 'docker' group"
fi

echo "[setup-docker] Docker is ready."
