#!/usr/bin/env bash
set -euo pipefail

COMPOSE="docker compose -f docker-compose.test.yml"

cleanup() {
  echo ""
  echo "Stopping test infrastructure..."
  $COMPOSE down
}
trap cleanup EXIT

echo "Starting test infrastructure..."
$COMPOSE up -d --wait

echo ""
echo "Running integration tests..."
npm run test:integration
