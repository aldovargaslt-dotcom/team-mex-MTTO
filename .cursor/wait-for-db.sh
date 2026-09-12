#!/usr/bin/env bash
# Ensure the PostgreSQL cluster is running and accepting connections.
# Used as a guard before starting the API so it never races the database,
# even if the per-boot `start` phase has not run yet.
set -euo pipefail

PG_VERSION=16
PG_CLUSTER=main

sudo pg_ctlcluster "$PG_VERSION" "$PG_CLUSTER" start 2>/dev/null || true

for _ in $(seq 1 30); do
  if sudo -u postgres pg_isready -q; then
    exit 0
  fi
  sleep 1
done

echo "PostgreSQL did not become ready in time" >&2
exit 1
