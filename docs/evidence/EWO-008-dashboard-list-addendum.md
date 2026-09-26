# Evidence — EWO-008 dashboard list addendum

## Summary

Engineering Work Order: `EWO-008`  
Worker model: Codex  
Verifier result: Incomplete — visual proof PNGs are not persisted; merge hold remains.

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
| `ux-auditor` visual QA | NO OK | First pass reported KPI semantic-color excess and oversized H2; both were corrected. Confirmation pass verified the source corrections but could not inspect the updated browser because its session had no browser. `VISUAL_QA.md` requires persisted PNGs before OK. |

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

- Persisted screenshot artifacts and final Visual QA approval are deferred due to the unavailable screenshot-to-file capability. This is a required verification gap, not a product decision.

## Known Limitations

- Production API data was not used; the local visual proof used fictitious demo rows.
- Empty and short lists were not separately exercised.
- Lint/build report existing React hook dependency warnings.

## New Decisions Discovered

“Slider vertical” is implemented as independent native vertical scrolling, not a range slider or carousel, consistent with the user clarification captured in the SPEC.

## Follow-up

- Capture the role-picker click-through as d1440 and m390 PNGs under `docs/screenshots/`.
- Have `ux-auditor` review those persisted PNGs and update EWO-008 before merge.

## Verification completeness

Incomplete until the required PNGs and final Visual QA verdict are recorded. See the acceptance-criteria statuses above.
