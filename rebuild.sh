#!/usr/bin/env bash
set -euo pipefail

FRONTEND="proxy shell mfe-auth mfe-transaction mfe-household mfe-budget mfe-reports mfe-settings"
BACKEND="api-gateway auth-service household-service transaction-service budget-service notification-service report-service audit-service"

usage() {
  echo "Usage: $0 <front|back|both> [stop]"
  exit 1
}

[[ $# -ge 1 ]] || usage

case "$1" in
  front) SERVICES="$FRONTEND" ;;
  back)  SERVICES="$BACKEND"  ;;
  both)  SERVICES="$FRONTEND $BACKEND" ;;
  *)     usage ;;
esac

if [[ "${2:-}" == "stop" ]]; then
  echo "==> Stopping [$1] containers..."
  docker compose stop $SERVICES
  echo "==> Done."
fi

echo "==> Rebuilding [$1] images (no cache)..."
docker compose build --no-cache --progress=plain $SERVICES

echo "==> Starting [$1] containers..."
docker compose up -d $SERVICES

echo "==> Waiting for containers to be ready..."
sleep 2

echo "==> Done. Tailing logs (Ctrl+C to exit):"
docker compose logs -f $SERVICES
