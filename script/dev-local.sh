#!/usr/bin/env bash
# EWO-069. One command for local development: API + web with a dev identity.
#   bash script/dev-local.sh        # API and web together (Ctrl+C stops both)
#   bash script/dev-local.sh api    # only the API
#   bash script/dev-local.sh web    # only the web
# Postgres must already be up (docker compose up -d, or .cursor/start.sh in a
# Cloud Agent). Local development ONLY: it sets NODE_ENV=development and a
# stub identity that the API refuses in production.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODE="${1:-all}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
API_PORT="${PORT:-3001}"
# Same ids as api/src/seed/dev-facilities.ts (monterrey + the 9 release sucursales).
FACILITIES="monterrey matamoros reynosa coahuila nuevo-laredo tampico cd-victoria monclova linares saltillo"

wait_for_db() {
  for _ in $(seq 1 30); do
    if command -v pg_isready >/dev/null 2>&1; then
      pg_isready -h "$DB_HOST" -p "$DB_PORT" -q && return 0
    elif (echo >"/dev/tcp/$DB_HOST/$DB_PORT") >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  echo "PostgreSQL no responde en $DB_HOST:$DB_PORT. Levántelo (docker compose up -d) y reintente." >&2
  return 1
}

# Server-side only: one actor per role, token = WEB_DEV_TOKEN_PREFIX + role.
actors_json() {
  FACILITIES="$FACILITIES" node -e '
    const scopes = process.env.FACILITIES.split(" ");
    const roles = ["SUPERVISOR", "ADMIN_DIRECTIVO", "LOGISTICA", "MECANICO"];
    const actors = {};
    for (const role of roles)
      actors["dev-" + role] = {
        subject: "dev|" + role.toLowerCase(),
        displayName: role + " (desarrollo)",
        roles: [role],
        facilityScopes: scopes,
      };
    process.stdout.write(JSON.stringify(actors));
  '
}

run_api() {
  cd "$ROOT/api"
  export NODE_ENV=development AUTH_MODE=DEVELOPMENT_STUB
  AUTH_STUB_ACTORS="$(actors_json)"
  export AUTH_STUB_ACTORS
  exec npm run start:dev
}

run_web() {
  cd "$ROOT/web"
  export API_URL="${API_URL:-http://localhost:$API_PORT}" WEB_DEV_TOKEN_PREFIX="dev-"
  exec npm run dev
}

case "$MODE" in
  api) wait_for_db; run_api ;;
  web) run_web ;;
  all)
    wait_for_db
    trap 'kill 0' EXIT
    (run_api) &
    (run_web) &
    echo "API http://localhost:$API_PORT  ·  UI http://localhost:3000  (Ctrl+C detiene ambos)"
    wait
    ;;
  *) echo "Uso: bash script/dev-local.sh [api|web]" >&2; exit 2 ;;
esac
