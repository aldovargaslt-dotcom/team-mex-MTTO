#!/usr/bin/env bash
# Per-boot reconciliation: bring PostgreSQL up and make sure the role,
# databases, and schemas the API expects exist. Safe to run repeatedly.
set -euo pipefail

PG_VERSION=16
PG_CLUSTER=main

echo "==> Starting PostgreSQL cluster"
sudo pg_ctlcluster "$PG_VERSION" "$PG_CLUSTER" start 2>/dev/null || true

echo "==> Waiting for PostgreSQL to accept connections"
for _ in $(seq 1 30); do
  if sudo -u postgres pg_isready -q; then break; fi
  sleep 1
done

echo "==> Reconciling role and databases"
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
    -c "CREATE SCHEMA IF NOT EXISTS andon AUTHORIZATION team_mex;" \
    -c "CREATE SCHEMA IF NOT EXISTS notifications AUTHORIZATION team_mex;" >/dev/null
done

echo "==> start.sh complete; PostgreSQL is ready on 127.0.0.1:5432"
