#!/usr/bin/env bash
# Orquesta las mismas pruebas que CI: cd api / cd web (no hay package.json raíz).
# Requires an explicitly disposable PostgreSQL target; never starts or reuses
# an unverified database automatically. DATABASE_URL would override DB_NAME.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ -n "${DATABASE_URL:-}" ]; then
  echo "Clear DATABASE_URL before destructive test fixtures." >&2
  exit 1
fi
if [ "${EWO_DISPOSABLE_DB:-}" != "true" ]; then
  echo "Verify a disposable PostgreSQL target, then set EWO_DISPOSABLE_DB=true." >&2
  exit 1
fi
export DATABASE_URL=''
export DB_HOST="${DB_HOST:-localhost}"
export DB_PORT="${DB_PORT:-5432}"
export DB_NAME=team_mex_mtto_test

db_ready() {
  if command -v pg_isready >/dev/null 2>&1; then
    pg_isready -h "$DB_HOST" -p "$DB_PORT" -q && return 0
  fi
  (echo >"/dev/tcp/$DB_HOST/$DB_PORT") >/dev/null 2>&1
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
    echo "==> Confirmed disposable PostgreSQL target is accepting connections"
    return 0
  fi
  wait_for_port
}

echo "==> api unit tests"
(cd "$ROOT/api" && npm test)
(cd "$ROOT/api" && npm run build)

if ensure_db; then
  echo "==> api e2e (team_mex_mtto_test, synchronize/drop; explicit disposable target)"
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
    DB_SYNCHRONIZE=false DB_DROP_SCHEMA=false npm run test:migrations
  )
else
  echo "FAIL: disposable PostgreSQL target unavailable; required e2e/migration gates cannot be skipped." >&2
  exit 1
fi

echo "==> web lint + build"
(cd "$ROOT/web" && npm run lint && npm run build)
