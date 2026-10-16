# Railway — inventory costing and unit detail production release

The user explicitly authorized production release after implementation PR96. This procedure supersedes the manual-migration/production-default-off instructions in the original EWO040 evidence. The existing deployment topology and credentials stay unchanged.

## Release behavior

- Existing `node dist/db/run-ui-release-migrations.js` pre-deploy now includes `InventoryCosts1792108800001`, after the approved alert/order migrations. The production bootstrap guard runs the same bounded check before creating Nest, retaining the ADR024 fallback for dashboard pre-deploy overrides.
- The configured API database name is compared with `current_database()`. Synchronize/drop must be false (production runner defaults false if absent). Advisory locks serialize release/manual inventory runners. Dedicated `inventory_cost_schema_migrations` ledger makes replay a no-op.
- Only four empty inventory financial tables/indices and their migration ledger are added. Existing stock, orders and historical consumption are not mutated or valued. No CHECK/Auth migrations or seed run.
- Costing defaults enabled for this authorized release. Explicit `INVENTORY_COSTS_ENABLED=false` (or invalid non-true value) disables financial writes and skips the inventory migration. Inspect health to identify that condition; do not claim activation when the operator has disabled it.
- A failure prevents the new API from serving. Preserve the previous deployment; correct the forward migration/configuration instead of dropping financial history.
- Manual alternative remains available with verified `INVENTORY_MIGRATION_DATABASE` and false flags via `npm run inventory:migration:up`. It shares the same inventory lock and ledger.

## Verification

1. CI must pass on the exact PR head. Merge the authorized PR into main to use configured Railway/Vercel source deployments.
2. Check the production Vercel GitHub deployment targets the merged commit. Public200 is necessary but does not prove login.
3. Check API `/health` includes release=`inventory-costs-unit-detail-v1`, `inventoryCostsEnabled=true`, and `commit` matching the merge when Railway injects its standard commit variable. This marker is returned only after production bootstrap's schema guard and Nest initialization succeed. It contains no secrets or business data.
4. Confirm real OIDC login with an authorized provisioned user; check inventory entry/IVA and unit cost view using real operational permissions. Do not create synthetic purchases or assign invented prices in production to prove a release.
5. Admin must verify legacy stock quantity/value before opening a known weighted valuation. Unknown history remains pending. This operational data task is distinct from successful deployment.

## Recovery

Never run down or drop costing tables. Explicit operator disable is preserved. Application rollback conserves additive schema. Disable costing through the configured service if necessary, but do not leave the new financial UI presented as operational against a disabled backend. GitHub success/green public health cannot substitute for authenticated financial workflow verification.
