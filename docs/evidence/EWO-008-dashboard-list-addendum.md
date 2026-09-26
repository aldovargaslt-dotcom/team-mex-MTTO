# Evidence — EWO-008 dashboard list addendum

## Summary

Engineering Work Order: `EWO-008`  
Worker model: Codex  
Verifier result: Visual QA accepted by the product owner with a screenshot-evidence waiver on 2026-09-26. The independent pixel audit remains unverified; the screenshot-based merge hold is waived by the owner.

## Files Changed

- `web/src/components/LogisticaDashboard.tsx`
- `docs/specs/logistica-dashboard-v0.md`
- `docs/design/ux-logistica-dashboard-v0.md`
- `docs/engineering-work-orders/EWO-008.md`
- Supersession notes in the visual brief, visual UX brief, and EWO-006.

## Tests Added / Changed

- None. This is a presentation-only change; `api/src` and HTTP contracts are unchanged.

## Tests Executed

| Test / Command | Result | Notes |
|---|---|---|
| `cd web && npm run lint` | PASS | 0 errors; 3 existing `react-hooks/exhaustive-deps` warnings at `LogisticaDashboard.tsx:59` for `rows` and `useMemo` dependencies. |
| `cd web && npm run build` | PASS | Required network-enabled retry because Next.js fetches Roboto from Google Fonts. Build completed with the same 3 warnings. |
| `git diff --check` | PASS | No whitespace errors. |
| `proof-ui` click-through | PARTIAL | Entered through role picker as LOGÍSTICA. Local synthetic API fixture returned 5 pending, 12 available, and 10 active rows. Scrolled each desktop list to later rows; used a 390×844 viewport to confirm mobile vertical scrolling and no visible horizontal overflow. Browser screenshots appeared inline in the tool session but the available CUA API did not expose a way to persist them under `docs/screenshots/`. |
| `ux-auditor` visual QA | NO OK (historical) | First pass reported KPI semantic-color excess and oversized H2; both were corrected. Confirmation pass verified source corrections but had no browser. The product owner later accepted visual QA with a screenshot-evidence waiver; this does not change the auditor's historical result. |

## Acceptance Criteria

### AC-01 — PASS

Evidence: the local fixture and accessibility tree showed all 5 pending, 12 available, and 10 active records; scrolling reached the final entries in each region. No four-row slice remains.

### AC-02 — PARTIAL

Evidence: desktop pointer scrolling reached the end of each list independently; mobile viewport scrolling advanced the pending list. Keyboard-only operation was not separately exercised. Each scroll region has `tabIndex={0}`, a visible focus ring, `role="region"`, and an accessible name.

### AC-03 — PASS

Evidence: accessibility tree has no “Ver todos” / “Ver todas” controls. KPI links and “Ver movimientos” remain.

### AC-04 — PASS

Evidence: desktop and mobile browser views show one solid orange “Registrar salida” CTA; per-unit actions use outline variants.

### AC-05 — SKIPPED

Reason: local click-through used only lists longer than four rows. Empty and short fixtures were not exercised; their existing branches were not modified.

### AC-06 — PASS

Evidence: d1440 and m390 local browser views showed usable independent lists with no visible horizontal overflow. The lists remain vertically scrollable when they extend below the fixed mobile navigation.

### AC-07 — PASS IN SOURCE / VISUAL CHECK PARTIAL

Evidence: KPI tone classes were removed and H2 sections use the documented 13px scale. Updated UI was visible in the local browser. The independent auditor could not confirm rendered pixels because updated PNGs were unavailable.

## Domain Consistency

Groups still derive from the current `/logistica/unidades` response; no status or alert rule changed. The test fixture was synthetic and does not validate production data.

## Architecture / ADR Consistency

`api/src`, schemas, and contracts were unchanged. The change remains presentation-only under ADR-003, ADR-011, and ADR-012.

## Scope Review

Only the `/logistica` dashboard lists and its UI documentation changed. “Ver movimientos” and KPI destinations remain unchanged. No tests or backend behavior were added.

## Visual Evidence

No screenshot path is available. The CUA screenshot tool displayed screenshots inline but did not provide a supported filesystem export API in this session. The required files remain outstanding:

- `docs/screenshots/logistica_dashboard_listas_completas_d1440.png`
- `docs/screenshots/logistica_dashboard_scroll_m390.png`

## Deviations

- Persisted screenshot artifacts are omitted under the product owner's explicit acceptance of Visual QA without screenshots on 2026-09-26. No independent pixel audit is claimed.

## Known Limitations

- Production API data was not used; the local visual proof used fictitious demo rows.
- Empty and short lists were not separately exercised.
- Lint/build report existing React hook dependency warnings.

## New Decisions Discovered

“Slider vertical” is implemented as independent native vertical scrolling, not a range slider or carousel, consistent with the user clarification captured in the SPEC.

## Follow-up

- The d1440 and m390 screenshot paths remain intentionally unfilled under the accepted waiver; they are not a merge gate.
- Continue the partial AC-12 API/database-boundary and empty-state verification when the API build environment is available.

## Verification completeness

The product owner accepted Visual QA on 2026-09-26 without persisted PNGs and waived the screenshot-based merge hold. The screenshot-based independent pixel audit remains unavailable; functional checks that are explicitly partial below remain partial.

## Responsive recheck — 2026-09-26

- Reopened the local `/logistica` view with a synthetic API fixture at **390×844** and **1440×900**.
- Both sizes rendered without horizontal overflow (`scrollWidth === clientWidth`: 390 and 1440 respectively). The mobile view remained single-column and vertically scrollable; desktop lists and available-unit cards fit the content width.
- Clicked **Registrar salida** and confirmed the sheet exposes unit, driver, destination, and trip scope fields. Cancelled without submitting.
- Clicked **Registrar entrada**, selected a pending trip, and confirmed the action becomes enabled. The sheet copy clarifies it closes a Logistics trip and does not create a Flota patio entry. Cancelled without submitting.
- The synthetic feed showed one `ENTRADA` and one `SALIDA` ordered newest first. This checks presentation only; it does not verify database day-boundary filtering or empty data.
- The browser returned screenshots inline, but this session exposes no supported screenshot-to-file export. The product owner accepted Visual QA without the PNGs and waived the screenshot-based merge hold. No independent screenshot re-review is claimed.
- The temporary fixture used only fictitious rows and was removed after review. No movement or trip form was submitted.

## Information-architecture and daily movement feed addendum — 2026-09-26

### Change summary

- Added the secondary “Registrar entrada” action and its sheet. The copy clarifies that this closes a Logistics trip and does not write a Flota patio entry.
- Active units include all `EN_RUTA` records, including those with `SIN_REGRESO`; alerts expose a direct, preselected trip-return action.
- Mobile-first reading order is actions → alerts → active units → movement record → available units with supporting KPIs.
- The product owner clarified the record as today's Flota patio `SALIDA` / `ENTRADA`. The dashboard calls the Flota-owned read-only endpoint; it omits signatures and does not change write behavior.

### Current verification

| Check | Result | Notes |
|---|---|---|
| `cd web && npm run lint` | PASS | 0 errors and 0 warnings. |
| `cd web && npm run build` | FAIL / environment | Turbopack could not fetch Roboto from `fonts.googleapis.com` in the restricted network environment. Local Next dev compiled and rendered the route. |
| `cd api && npm run build` | SKIPPED / environment | API dependencies are not installed in this worktree (`nest` executable unavailable); no network install was attempted. |
| `git diff --check` | PASS | No whitespace errors. |
| `proof-ui` desktop | PARTIAL | Entered through role picker with a synthetic fixture: 5 alerts, 12 available, 10 active, plus today's Entrada and Salida. The movement rows rendered newest first with local time, unit, driver, and site; both existing trip sheets opened and alert entry preselected its unit. Visible viewport was about 1250×720 and included the Next development badge. No PNG could be persisted under `docs/screenshots/`. |
| `proof-ui` m390 | SKIPPED | No supported viewport control was available through the current CUA surface. |
| `ux-auditor` | NO OK visual (historical) | Follow-up confirmed the daily date/type filter, newest-first sort, stacked UI rows, and isolated loading/error/empty states in source. No additional code finding. Product owner accepted the visual result with a screenshot-evidence waiver on 2026-09-26. |

### Acceptance status for this addendum

- AC-08: PARTIAL — both action sheets were opened via the role flow, and an alert action preselected its unit. No synthetic mutation was submitted.
- AC-09: PASS IN FIXTURE — all ten active fixture units appeared, including five alert units.
- AC-10: PASS IN SOURCE / FIXTURE — open alerts map to `SIN_REGRESO`, distinct from Andon.
- AC-11: PASS IN LOCAL REVIEW — mobile-first hierarchy rendered at 390×844 in a single column without horizontal overflow. The product owner waived the persisted screenshot requirement; no independent PNG review is claimed.
- AC-12: PARTIAL — the UI rendered two synthetic movements for today in CDMX time. Database query boundaries and the empty state were not exercised; API build is unavailable because dependencies are absent.

The product owner accepted Visual QA with a screenshot waiver. EWO-008 remains In Progress for the partial AC-12 API/database-boundary and empty-state verification; no independent screenshot audit is claimed. Prior-cut screenshots/status above are historical; this addendum has no persisted screenshots of its own.
