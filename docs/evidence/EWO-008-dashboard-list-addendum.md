# Evidence — EWO-008 dashboard and active catalog

## Summary

Engineering Work Order: `EWO-008`

The `/logistica` dashboard now presents one “Unidades disponibles” collection containing only Kernel catalog `ACTIVA` units. The former separate active-unit section and KPI summary are removed. Unit cards use the catalog photo with a type-icon fallback, expose the journey state, and offer the corresponding departure or return action. “Últimos movimientos” presents today's patio `ENTRADA` and `SALIDA` records as compact directional rows.

The product owner accepted visual QA without persisted PNGs on 2026-09-26. Desktop and mobile screenshots were inspected inline; no independent pixel audit or persisted screenshot artifact is claimed.

## Files changed

- `api/src/logistica/logistica-types.ts`
- `api/src/logistica/logistica.service.ts`
- `api/src/logistica/logistica-ops-rules.spec.ts`
- `web/src/lib/types.ts`
- `web/src/components/LogisticaDashboard.tsx`
- `docs/specs/logistica-dashboard-v0.md`
- `docs/design/ux-logistica-dashboard-v0.md`
- `docs/engineering-work-orders/EWO-008.md`
- This evidence report

## Contract and domain review

- The shared `GET /logistica/unidades` row now includes catalog state, photo, type/icon, make/model, and year from the Kernel unit read model.
- The endpoint still returns its complete collection. `/logistica` filters `estado=ACTIVA` in the presentation layer, so `/flota` keeps its current complete unit collection.
- `opsEstado` remains independent from catalog state and from the Flota patio movement lifecycle.
- No schema, persistence, image upload, alert synchronization, journey transition, or patio write rule changed.
- The existing typed row builder was updated for the extended required shape. No new test case was added or run in this change.

## Verification

| Check | Result | Notes |
|---|---|---|
| `cd web && npm run lint` | PASS | 0 errors and 0 warnings. |
| `git diff --check` | PASS | No whitespace errors. |
| Next local dev compile | PASS WITH ENVIRONMENT WARNING | `/logistica` compiled and rendered. Google Fonts was unavailable, so Next used its fallback font. |
| API compile | SKIPPED / environment | This worktree has no API `node_modules`; `tsc` and `nest` executables are unavailable. No dependency install was attempted. |
| Desktop visual review | PASS IN INLINE REVIEW | At 1440px, one active-unit grid, alert, photo/icon fallbacks, both journey states, and movement rows rendered without visible horizontal overflow. |
| Mobile visual review | PASS IN INLINE REVIEW | At 390×844, content remained single-column, unit cards used an internal vertical scroll region, the movement list stayed readable, and no horizontal overflow was visible. |
| Active-state fixture | PASS | Four `ACTIVA` rows rendered; one synthetic `INACTIVA` maintenance row did not appear. |
| Action click-through | PASS | Registrar salida listed only active `DISPONIBLE` units. An `EN_RUTA` card opened Registrar entrada with its unit selected. No mutation was submitted. |
| Independent UX source audit | OK, conditioned on reported visual review | Confirmed the unified collection, reconciled scroll limits, and presentation-only `ACTIVA` filter; the auditor had no persisted PNG to cite. |

## Acceptance status

- AC-01–AC-07: PASS for the unified full-list presentation, native vertical scrolling, removal of redundant links/KPIs, outline row actions, responsive hierarchy, and semantic emphasis.
- AC-08: PASS for opening the existing departure and trip-return sheets; no mutation was submitted.
- AC-09–AC-11: PASS in the synthetic desktop/mobile review. Active en-route units remain inside the unified catalog and alert units also appear in the exception section.
- AC-12: PARTIAL. The UI rendered synthetic `ENTRADA` / `SALIDA` rows in newest-first order. Database day-boundary and empty-feed behavior were not executed in this pass.
- AC-13–AC-15: PASS in source and the synthetic visual review. The inactive fixture was excluded, photo/icon fallback rendered, and movement direction/details were scannable.

## Visual evidence limitation

The CUA browser displayed the 1440px and 390×844 states inline but no PNG was persisted under `docs/screenshots/`, consistent with the owner's explicit waiver. The synthetic fixture contained fictitious data and was removed after review.

## Remaining limitation

API compilation and database-boundary verification require the API dependencies and data environment. This does not affect the completed UI review, but AC-12 remains partial for that reason.
