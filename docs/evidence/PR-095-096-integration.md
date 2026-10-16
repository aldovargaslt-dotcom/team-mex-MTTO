# PR95 + PR96 integration evidence

User request: “Now can we merge this with PR #95.” PR96 is already merged/deployed as main ac426efa4229f3cf11812c39dedf7dc3f91d0f21. PR95 source head reviewed: 9cc65333ccb1803ca6361b8a0b0a0327ed8b1170. This record concerns the combined branch; original PR95 historical logs remain under EWO041.

## Integration

Reconstructed PR95’s exact source tree c0c0bbb26aace9130cf54207e057ddd1b23233f8 from its authorized GitHub diff and verified it against the GitHub Git tree. Applied it three-way against the released inventory tree. Preserved the inventory health release/commit/activation fields while adding the Logistics readiness route. Kept inventory migration activation and Logistics’ isolated writer-drained cutover separate.

Resolved documentation collisions without replacing inventory artifacts: inventory ADR026/EWO038 remain unchanged; Logistics becomes ADR027/EWO041, with references/evidence directories updated. Existing safety policies, Flota custody and inventory cost rules remain unchanged.

## Automated checks

From repository root, isolated PostgreSQL16 localhost55433:

| Check | Exact command | Result |
|---|---|---|
| API build | `npm --prefix api run build` | PASS |
| API unit | `npm --prefix api test -- --runInBand` | PASS:54 suites/259 tests |
| All API integration | `DATABASE_URL='' DB_HOST=127.0.0.1 DB_PORT=55433 EWO_DISPOSABLE_DB=true npm --prefix api run test:e2e -- --runInBand --testTimeout=30000` | PASS:22 suites/191 tests |
| Separate CHECK migration rehearsal | `DATABASE_URL='' DB_HOST=127.0.0.1 DB_PORT=55433 DB_NAME=team_mex_mtto_test EWO_DISPOSABLE_DB=true DB_SYNCHRONIZE=false DB_DROP_SCHEMA=false npm --prefix api run test:migrations` | PASS:23 tests |
| Web lint | `cd web && npm run lint` | PASS |
| Web types | `cd web && ./node_modules/.bin/tsc --noEmit` | PASS |
| Web production build | `cd web && npm run build` | PASS:32 pages generated |

First CHECK rehearsal attempt omitted DB_NAME and failed because the separate local PostgreSQL16 cluster lacks the default team_mex_mtto database. Corrected the explicit disposable control database; no production connection was used. This setup failure is distinct from the final passing migration assertions, whose intentional rejection logs are expected.

## Actual React browser walkthrough

Chromium CDP, no Playwright; entered role picker as Logistics, navigated its real shell/React forms through the actual BFF and local API. Database team_mex_combined_ui on the separate local PostgreSQL16 cluster. Two explicit DEVELOPMENT_STUB trusted actors, NON_PRODUCTION attribution, resource scope journey-ui; not real OIDC/Railway sessions. No tokens or credentials are stored in the artifacts.

1. Prepared a scoped disposable unit with required CHECK/insurance/physical-state prerequisites. Confirmed departure through Logistics dashboard.
2. Confirmed its return through that dashboard. Intercepted and failed only the committed upstream204 response in CDP, simulating a lost response. The browser retained the original confirmed subject/key/context.
3. Reloaded React. Its recovery replay cleared the same envelope. Readback proved exactly one returned journey/revision2, unit revision2 and two receipts, despite the replay.
4. Prepared a second trip. Existing return intentionally retains standing driver assignment; reset only that disposable assignment before the second scenario, preserving all journey/revision records. This is fixture setup, not a change to business rules. A first harness click also preceded a disabled control becoming ready; corrected the harness to wait for enabled controls and continued the same already-committed second journey.
5. Opened return from Flota. Changed only the backend trusted actor while preserving the confirmed browser subjectA. Actual BFF/API returned409. Saved envelope remained subjectA/suspended; no actorB receipt was written.
6. Restored actorA and explicitly submitted from the mobile390 viewport. Returned204, cleared pending envelope. Final readback: DISPONIBLE, no active pointer, unit revision4; two retained closed journeys/revision2 each and exactly four receipts, all actorA.

Browser screenshots and fixture readback were inspected locally under /tmp/team-mex-pr95-proof. They are excluded from the PR: automatic approval review rejected publication of a screenshot as potentially sensitive application data. No workaround was used to publish the rejected image. The aggregated verification results in this record come from test assertions/readback, not an image transcription. These are disposable observations, not production facts. Existing generic unknown-result error copy remains a nonblocking P2. Independent [UI review](pr95-integration-ui-review.md) records the reviewed scope/limits.

## Production boundary

No PR95 production migration, invented capture epoch, drained-writers flag or new journey deployment is claimed. Current main remains the healthy inventory release. PR95 introduces ORM columns queried during normal startup, so merging it into the auto-deployed main before its controlled migration would be unsafe. It cannot use the empty-table inventory pre-deploy shortcut: its legacy open-trip capture requires actually drained old writers, verified target/schema and a reviewed capture commit.

The user replied that they will connect Railway access. The environment still reports no ready Railway binding at the latest check; independent integration/verification proceeds meanwhile. Once access is ready: inspect exact service/DB, stop and verify old lifecycle writers drained, apply the isolated reviewed migration, verify capture/schema, then merge/deploy the combined PR and restore writers only on the verified new version. Preserve history and use forward recovery after capture. Do not silently substitute GitHub merge permission for production database/process access.
