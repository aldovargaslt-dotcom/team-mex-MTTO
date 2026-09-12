#!/usr/bin/env bash
# Orquesta las mismas pruebas que CI: cd api / cd web (no hay package.json raíz).
# Humanos: docker compose (README). Cloud Agent: .cursor/wait-for-db.sh.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

E2E_SKIPPED=0

db_ready() {
  if command -v pg_isready >/dev/null 2>&1; then
    pg_isready -h 127.0.0.1 -p 5432 -q && return 0
  fi
  (echo >/dev/tcp/127.0.0.1/5432) >/dev/null 2>&1
}

wait_for_port() {
  local i
  for i in $(seq 1 30); do
    if db_ready; then return 0; fi
    sleep 1
  done
  return 1
}

ensure_db() {
  if db_ready; then
    echo "==> Postgres already accepting connections on 127.0.0.1:5432"
    return 0
  fi
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    echo "==> docker compose up -d (Postgres only; README human path)"
    docker compose up -d
    wait_for_port && return 0
    echo "WARN: docker compose started but Postgres is not ready" >&2
    return 1
  fi
  if [ -f "$ROOT/.cursor/wait-for-db.sh" ]; then
    echo "==> .cursor/wait-for-db.sh (Cloud Agent native Postgres)"
    bash "$ROOT/.cursor/wait-for-db.sh"
    return $?
  fi
  return 1
}

echo "==> api unit tests"
(cd "$ROOT/api" && npm test)

if ensure_db; then
  echo "==> api e2e (DB_HOST=localhost, team_mex_mtto_test, synchronize/drop)"
  (
    cd "$ROOT/api"
    export DB_HOST="${DB_HOST:-localhost}"
    export DB_PORT="${DB_PORT:-5432}"
    export DB_USER="${DB_USER:-team_mex}"
    export DB_PASSWORD="${DB_PASSWORD:-team_mex}"
    export DB_NAME=team_mex_mtto_test
    export DB_SYNCHRONIZE=true
    export DB_DROP_SCHEMA=true
    npm run test:e2e
  )
else
  echo "SKIP: api e2e — Postgres not available (no docker compose / wait-for-db)."
  E2E_SKIPPED=1
fi

echo "==> web lint + build"
(cd "$ROOT/web" && npm run lint && npm run build)

if [ "$E2E_SKIPPED" -eq 1 ]; then
  echo "verify.sh: unit + web OK; e2e SKIPPED (no Postgres)."
fi
