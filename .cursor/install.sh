#!/usr/bin/env bash
# Idempotent bootstrap for the Team Mex maintenance app in a Cloud Agent VM.
# Provisions native PostgreSQL (replacing the docker-compose Postgres used for
# local dev) and installs Node dependencies for the API and web apps.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

PG_VERSION=16
PG_CLUSTER=main

echo "==> Ensuring PostgreSQL ${PG_VERSION} is installed"
if ! command -v psql >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
    postgresql postgresql-client
fi

echo "==> Starting PostgreSQL cluster"
sudo pg_ctlcluster "$PG_VERSION" "$PG_CLUSTER" start 2>/dev/null || true
for _ in $(seq 1 30); do
  if sudo -u postgres pg_isready -q; then break; fi
  sleep 1
done

echo "==> Provisioning role and databases"
sudo -u postgres psql -v ON_ERROR_STOP=1 <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'team_mex') THEN
    CREATE ROLE team_mex LOGIN PASSWORD 'team_mex' CREATEDB;
  END IF;
END
$$;
SQL

for db in team_mex_mtto team_mex_mtto_test; do
  if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${db}'" | grep -q 1; then
    sudo -u postgres createdb -O team_mex "$db"
  fi
  sudo -u postgres psql -d "$db" -v ON_ERROR_STOP=1 \
    -c "CREATE SCHEMA IF NOT EXISTS inventario AUTHORIZATION team_mex;" \
    -c "GRANT ALL ON SCHEMA public TO team_mex;"
done

echo "==> Preparing API environment file"
if [ ! -f api/.env ]; then
  cp api/.env.example api/.env
  # Reflect any origin so the Next.js dev server can reach the API.
  sed -i 's#^CORS_ORIGIN=.*#CORS_ORIGIN=*#' api/.env
fi

echo "==> Installing Node dependencies"
(cd api && npm ci)
(cd web && npm ci)

echo "==> install.sh complete"
