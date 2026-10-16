# PR95 — controlled production Logistics cutover

Owner authorized Railway access verification, old-writer drain, controlled production migration, merge and production verification on 2026-10-16. The owner separately approved removal of the old API deployment after automatic approval review rejected that operation. This supersedes the earlier local-only release boundary for this deployment.

## Sources and target

- Reviewed implementation: `b93b55aa7a4185ab6c526517d7e71a64244f748f`; exact-head API unit/e2e and web lint/build CI passed before cutover.
- Previous production: `ac426efa4229f3cf11812c39dedf7dc3f91d0f21`.
- [PR95](https://github.com/aldovargaslt-dotcom/team-mex-MTTO/pull/95) merged as `f00c705c6a702a50756246cf917687f7be360fe9`. Git confirms its parents are the previous main and reviewed implementation, and its tree equals the reviewed implementation tree. GitHub confirms closed/merged.
- Railway project `valiant-determination`, production environment `b1c5b5dd-9a38-4194-bb9d-48fa598811cb`, API service `d780b2f9-e1bf-4ff0-9738-12c7e748117f`.
- Effective database: `railway` on `postgres.railway.internal:5432`. `DB_SYNCHRONIZE=false`, `DB_DROP_SCHEMA=false`. No credentials are included here.

## Execution and results

All timestamps below are UTC on 2026-10-16 (subtract seven hours for America/Los_Angeles).

1. PASS — `RAILWAY_API_TOKEN` authenticated using Railway's project-token header; account-token queries were unauthorized. Project/environment/services and effective API DB selector were verified before production changes. Managed credential readiness remained unknown, so actual successful API calls established access.
2. PASS — temporary migration-only Railway service built the reviewed commit with the existing API Dockerfile. Its start command required only the isolated migration datasource/runner; no Nest application, bootstrap seed, public domain or general release migrations. Restart policy NEVER. Database access used a reference to the existing API's DATABASE_URL.
3. PASS — read-only inspection deployment `9738f313-8ea6-4e99-9819-fe828d67649a`: effective DB `railway`, schema LEGACY, 14 units, 3 EN_RUTA units, 0 departure audits.
4. INSUFFICIENT — `deploymentStop` returned true and logged container shutdown; public health returned502, but control plane still reported a running instance. No migration ran on that evidence. Scaling to zero was unsupported. Automatic approval review blocked `deploymentRemove` over rollback risk; the old API was restarted and HTTP200 verified while explicit owner approval was requested.
5. PASS — following explicit approval, `deploymentRemove` for old API deployment `bdb4a46c-a7cd-4cba-b0e2-a0a7b8ad470b` returned true. Readback confirmed status REMOVED, deploymentStopped=true, and its sole instance REMOVED. Old history-discarding code must never be restarted after the capture below.
6. PASS — migration-only deployment `65f9251e-58a4-44e1-b8d5-7f5cdae84143` checked its injected source SHA, effective DB and all other connected client backends. Other clients were `[]` before the drained flag was set. The controlled runner then executed inspect/up/inspect/up using the reviewed source, explicit false schema flags, `LOGISTICA_MIGRATION_DATABASE=railway`, `LOGISTICA_WRITERS_DRAINED=true`, and `LOGISTICA_CAPTURE_COMMIT=b93b55aa7a4185ab6c526517d7e71a64244f748f`.
7. PASS — `LogisticaJourneyHistory1792022400001` applied once; postflight inspect returned COMPLETE. Controlled runner checked baseline preservation, schema, constraints, indices, journal and capture references before commit. Replay returned COMPLETE with `applied:[]`.
8. PASS — capture boundary `2026-10-16T16:14:02.172Z`, schema version1, reviewed baseline commit, legacy_open_count3. Postflight: units14, EN_RUTA3, departure_audits0, journeys3, receipts0, revised_units0. Existing en-route journeys remain explicitly incomplete legacy history; no historical departure or attributed endpoint was invented.
9. PASS — PR marked ready and merged only after migration success. The merge call initially returned an internal error after updating main; Git parents/tree proved the intended merge landed. Refreshing the PR's unchanged main base reconciled metadata to closed/merged. No implementation changes or new merge commit were needed.
10. PASS — Railway API deployment `f66e733b-8911-40a9-9faa-d7f3ec99103f` and web deployment `80be0e90-06a3-4d79-ad93-c02dfef97f74` explicitly deployed merge commit `f00c705c6a702a50756246cf917687f7be360fe9` and reached SUCCESS.
11. PASS — after API initialization/seed, public `/health` returned200 with that merge SHA, release `inventory-costs-unit-detail-v1` and inventoryCostsEnabled=true; `/health/ready` returned200 `{"status":"ready"}`. Railway web root returned200. No synthetic production departure, return, stock or financial commands were issued.

Verified API: https://team-mex-mtto-production.up.railway.app/health

Verified readiness: https://team-mex-mtto-production.up.railway.app/health/ready

Verified Railway web: https://web-production-022a6.up.railway.app/

## Remaining verification and recovery limits

PASS — the normal evidence push produced Vercel Production deployment `7123990935` at `4b6d0c03ecfbe4affe1a34e88a1df632ba35b582`, with successful GitHub/Vercel status. Its application source equals merged PR95; only the cutover evidence and EWO changed. The deployment URL `https://team-mex-mtto-f02a9l7pn-aldovargaslt-dotcoms-projects.vercel.app/` redirects to existing Vercel SSO protection, so direct authenticated application access was not verified. Railway web is public HTTP200. The API's unauthenticated Logistics list returns401 `TRUSTED_AUTHENTICATION_REQUIRED`, preserving trusted authentication.

PASS — after verification, the temporary migration service was deleted and project readback contains only the original Postgres, web and API services. API readiness still returns200. No migration-runner service or drained-writer flag remains attached to the API.

Real authenticated OIDC departure/return/reload workflows were not exercised in production. Exact-head automated and prior local trusted-actor walkthrough evidence remain in [combined verification](PR-095-096-integration.md). Public health/UI200 do not establish authenticated workflow success.

Preserve the additive schema and capture boundary. Recover forward after capture; no production down migration or database restore was attempted. Do not redeploy ac426efa or any other history-discarding writer. Inventory's separate release guard and ledger remain in place. No global ABC/downtime, new policy, grants or notify changes were made.
