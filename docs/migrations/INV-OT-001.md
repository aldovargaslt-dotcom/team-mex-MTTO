# INV-OT-001 — Inventory / OT costs migration

Scope: [ADR-025](../adr/025-work-order-inventory-costs.md), [EWO-038](../engineering-work-orders/EWO-038.md). Implemented and tested locally; **not applied to production**. This migration is deliberately separate from the automatic release runner.

Take and verify a restorable database backup first. Inventory is the sole owner of these tables. Before rollout, inspect nonnegative quantities, existing movement/pending counts and frozen outbox payloads; retain that snapshot for comparison. Stop application writers while applying the schema and deploy the compatible API/web together. Use the repository's configured PostgreSQL connection and verify the intended host/database; an inherited `DATABASE_URL` takes precedence over DB_* variables.

From `api`, after installing dependencies:

```sh
npm run build
DB_SYNCHRONIZE=false DB_DROP_SCHEMA=false node dist/db/run-cost-migrations.js
```

The source-checkout helper `npm run costs:migration:up` invokes the same runner through ts-node; use the compiled command above in a release image.

The runner executes `InventoryWorkOrderCosts1791849600001` in one transaction and records it in `inventory_cost_schema_migrations`. Repeating it is a no-op. It widens stock, movement, pending, legacy visit-piece quantities and affected thresholds to numeric(20,6); adds per-item quantity precision, valuation/source snapshots, material accounts, command identities and closure receipts. Existing amounts remain unchanged. Existing stock/history without cost becomes explicitly unknown; historical external pending records enter the compatible account history without creating a second pending-receipt condition. It never rewrites historical `VisitaCerrada` payloads.

After migration, compare quantities, history, pending counts and frozen outbox payloads with the snapshot. Smoke-test warehouse use, direct purchase, fractional liters, receipt attachment, closure and administrator correction using a designated test OT. Confirm new closure neither consumes posted materials twice nor emits another completed-maintenance event on correction. Opening valuation is an explicit administrator operation with a reason; do not infer unknown costs as zero.

Do not downgrade quantities to integers after fractional operations. The down migration refuses unsafe truncation and requires a reviewed backup restore; there is no automatic production rollback. Keep writers stopped for a restore and reconcile any post-backup physical activity before reopening.

Verification: real PostgreSQL migration fixture preserved stock, old pending records, historical movements and frozen outbox; repeated execution and constraints checked. See [actual results](../evidence/EWO-038.md). Deployment and production execution remain outside this task.

## EWO-039 — Specific-unit catalog compatibility

`ItemUnitCompatibility1791936000001` follows the cost migration in the same explicit runner/ledger. It adds a default-empty opaque UUID array `inventario.items.unidad_ids`; quantities, valuations, purchase receipts and prior type compatibility are unchanged. Existing installations that already ran the cost migration apply only this new pending migration. Use the compiled runner above with a reviewed backup and stopped writers; production execution remains outside this task. Downgrade refuses discarding compatibility selections. Rehearsal verifies existing items start with empty selections, data is preserved and rerunning is a no-op.
