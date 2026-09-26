## Qué / Alcance

<!-- Qué cambia y qué queda igual. “WO” = wizard de visita, no este brief. -->

## UX spec

<!-- Si cambia layout, jerarquía o acciones: plantilla `docs/design/UX_SPEC_TEMPLATE.md` (o n/a si copy puntual). -->

## Must

-

## Don’t

-

## Fuera

<!-- Fuera de v0 (README): multi-almacén, lotes, costeo, OC, kardex, ítem↔placa, reserva en borrador. -->

## ADR tocados

<!-- Rutas `docs/adr/*` o: ninguno — visual only -->

## Test IDs (ADR-004)

<!-- C/O/I/A/N/S nuevos en `docs/adr/ADR-004-tdd-test-bar-andon-v0.md`, o characterization only. Visual only: n/a. -->

## Proof

- API unit: `cd api && npm test` — PASS / FAIL / SKIPPED; evidence link and reason if skipped.
- API E2E: `cd api && npm run test:e2e` — PASS / FAIL / SKIPPED; evidence link and reason if skipped.
- Web lint / build: report each command separately as PASS / FAIL / SKIPPED in the linked evidence record.
- UI (si aplica): `docs/screenshots/…` — skill `proof-ui` (click-through, `d1440` / `m390` WO; no página estática)

## Visual QA

<!-- Subagente `ux-auditor` (otro pase): OK / no OK + 3–5 hallazgos, o n/a si no hubo UI. -->

## Hold

No mergear hasta **SD / visual OK** si cambió la UI.

## Traceability and verification checklist

PRD (if applicable):
SPEC / canonical AC IDs:
EWO (or focused issue for tiny work):
Affected domain card:
Evidence record:

- [ ] Applicable PRD / SPEC / EWO linked; affected domain identified
- [ ] Acceptance criteria verified with linked test/manual evidence
- [ ] Exact commands and working directories recorded as PASS / FAIL / SKIPPED
- [ ] Skipped E2E explicitly called out; no claim of full verification if skipped
- [ ] Assumptions and unresolved questions listed
- [ ] Data/migration risks documented, or explicitly not applicable
- [ ] UI screenshots / walkthrough and separate visual QA linked when applicable
- [ ] No unrelated refactor or runtime changes outside authorized scope

Failed/skipped required checks leave verification incomplete. Follow [workflow](../docs/WORKFLOW.md) and [testing strategy](../docs/testing/TESTING_STRATEGY.md). Results live in the linked evidence record; Proof above is a summary, not a second result source.
