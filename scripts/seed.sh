#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Demo data is never part of `docker compose up` — it lives behind the "seed"
# compose profile and only runs when this script (or that command) is run.
echo "[seed] loading demo data into the crm database..."
exec docker compose --profile seed run --rm seed
