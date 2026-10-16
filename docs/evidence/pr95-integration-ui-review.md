# PR95 integration — independent UI review

Date: 2026-10-16. Branch reviewed: `codex/integrate-pr95-inventory`.
Reviewer: independent `ux-auditor`; no implementation edits.

**Verdict: OK for the reviewed local desktop/mobile transport flows.** No blocking new visual defect surfaced; this verdict does not authorize production merge or deployment.

Read: repository AGENTS/ICM, `proof-ui`, `VISUAL_QA.md`, and `docs/contracts/LOG-JOURNEY-001-contract.md`. Inspected the changes to both return callers, journey-context/command helpers and session replay effect. This integration changes invisible command transport and existing error/disabled states, not the operator layout or fields. Existing inventory/unit visual review remains separate.

## Evidence reviewed

Implementer-produced CDP scripts `/tmp/team-mex-journey-proof.mjs` and `/tmp/team-mex-journey-proof-identity.mjs` use the actual rendered React controls and same-origin Next BFF/API path. They enter through `/` and the Logística role picker. No Playwright or DevTools chrome is present. Authentication is a trusted **nonproduction fixture**, not a real production login.

Durable artifacts under `/tmp/team-mex-pr95-proof/` (reviewed against the matching `/tmp/team-mex-pr95-proof/` captures):

- `departure-d1440.png`: actual departure success notice, existing Spanish fields/actions and one orange primary action.
- `lost-response-d1440.png`: existing return surface remains open and recoverable after the browser intentionally discards a successful response; no lifecycle IDs become operator fields.
- `reloaded-replay-d1440.png`: rendered page after reload/replay; normal shell retained.
- `walkthrough.json`: one intercepted response, frozen fixture subject and original return command ID.
- Initial `/tmp` database readback showed one returned journey at revision2, unit available with null active pointer/revision2, one departure receipt and the original return receipt. The durable final `db-readback.json` after the second scenario shows two closed journeys at revision2 each, unit revision4, and exactly four receipts, all attributed to fixture subject A. This corroborates committed replay rather than duplicate return; the screenshot alone would not prove that fact.
- `identity-switch-d1440.png`, `return-review-m390.png`, `identity-walkthrough.json`: actor B's request receives409 while the saved envelope retains original subject A and is suspended; the UI says “La sesión cambió. Revisa la operación pendiente.” Returning to original actor A and explicitly submitting the saved intent receives204. This simulates trusted credential change at the request boundary, not a real production login/cookie-switch exercise.
- `flota-return-m390.png`: after successful return through the second caller, the normal Flota mobile surface remains usable. The open-sheet capture shows full-width controls, visible cancel/submit buttons, readable Spanish conflict copy, no clipped sheet or technical transport metadata.

I inspected these images and scripts independently; I did not personally execute the browser scenario or database readback. A screenshot of the normal page alone is not claimed as idempotency proof. The CDP scenario plus fixture storage assertions/readback support the bounded claim.

## Findings and limits

1. **P2 — Existing generic unknown-result copy.** The intentionally lost response shows “No se pudo registrar la entrada del viaje.” Although the retained envelope makes retry safe, this wording sounds like a definite failure. A later bounded copy improvement could say the result could not be confirmed and explain safe recovery. This is not a new layout defect; the approved transport contract explicitly preserves the existing error path.
2. **Not verified by this review:** keyboard/focus, contrast measurements, zoom, broader breakpoints, production session behavior and Railway state. Existing API tests/build and migration rehearsal are implementation evidence, not independently rerun here. The mobile Flota KPI surfaces predate this transport integration; this review does not approve or redesign that existing layout.

## Production gate

**Production merge remains blocked on the actual Railway drained-writer cutover and its recorded verification.** No screenshot, fixture replay, disposable migration, combined build or this UI verdict proves that writers were drained, the live capture epoch was established, or every deployed lifecycle client/writer is upgraded. The contract's explicit cutover/readiness requirements remain in force. No production migration/deployment is inferred as done.

Fixture setup note: before the second scenario the implementer reset only the disposable unit's retained `chofer_id` assignment to null, because the existing departure rule rejects replacing another assigned driver. Journey pointers/revisions/history were not reset. This is test setup, not an application change or evidence of a relaxed departure gate.

Publication note: after this local review, automatic approval review rejected external publication of a screenshot. Screenshot/fixture files are excluded from the PR; local files remain under /tmp/team-mex-pr95-proof. Review of local artifacts and summarized test evidence remains valid, but no hosted screenshot evidence is claimed.
