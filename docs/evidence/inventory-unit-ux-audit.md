# Independent UX audit — inventory and unit detail

Date: 2026-10-16. Reviewer: independent `ux-auditor` subagent. No implementation edits. Read AGENTS/ICM, `proof-ui`, `VISUAL_QA.md`, design-system hierarchy/anti-patterns/operate-craft, and the inventory/unit UX specs. This review is separate from implementation and server tests.

**Verdict: visual OK for the captured 1440/390 scope, with the P2 findings and verification limits below.** No P0/P1 remains in that scope. This is not SD approval, accessibility certification, or approval of untested states/viewports. The PR's SD/visual merge gate remains required.

## Findings

1. **P2 — Mobile selected chart month needs visibility.** `unit-costs-detail-m390.png` initially displays May–September at $0 while selected/nonzero October is outside the horizontal viewport. The horizontal scrollbar and textual October detail make its value available, but the first plot looks empty despite the $1,600 summary. Fit the default six months or reveal the selected month when entering/resizing; retain scroll for longer periods. Basis: unit UX “Mobile / responsive” and “Interaction notes”.
2. **P2 — Document sheet body inset/copy.** `document-detail-d1440.png` and `document-detail-m390.png` have the header inset while body labels touch the left edge. Use the same body inset as the header/other sheets. The external-cost detail also repeats the warehouse-average regularization helper; replace it with purchase-specific copy. Basis: `DESIGN_SYSTEM.md` spacing and inventory UX “Comprobantes y detalle lateral”. Values and actions themselves are correctly scoped.
3. **P2 — Wider state/accessibility proof remains.** Keyboard/focus restoration, measured contrast, 200% zoom, 360/768/1024 widths, errors, Admin opening/correction and incomplete-cost graph are not independently exercised here. Empty cost suppression was source-inspected, not recaptured after correction. Keep these as pending verification rather than claiming full UX acceptance. Basis: inventory/unit UX “Proof” and `VISUAL_QA.md`.

## Corrections verified on second pass

- **P1 financial context fixed.** Comprobantes now fetches selected-order operations, filters external costs for the selected item, hides warehouse valuation/opening/return controls, and labels “Costos de esta compra externa”. Inspected `InventoryCostPanel.tsx` and the selected document captures: supplier, net $1,000, IVA $160, total $1,160 reconcile. The list distinguishes “Costo registrado” from documentary “PENDIENTE”. Unrelated warehouse operations are absent.
- **Active mobile section fixed.** Historial is now fully visible in `unit-costs-m390.png`; the navigation remains horizontally scrollable. Source includes active-anchor visibility on section/resize.
- **Settled operational proof improved.** Mobile summary shows the actual overdue condition and single “Marcar como enterado” action. Receipt review shows stock 10→20, IVA reconciliation and the full confirm/cancel controls. Refreshed `receipt-saved-m390.png` shows 20 pieces after the receipt rather than loading.
- **Empty cost source handling fixed in code.** Source suppresses the empty plot and names “Sin costos registrados en este periodo”. Earlier empty-$0 plot capture was replaced by populated fixture captures; no screenshot claim is made for the corrected empty state.

## Evidence inspected

All paths below are relative to `docs/screenshots/inventory-unit-v1/` and are fixture-only local development data:

| Surface | Captures | Assessment |
|---|---|---|
| Inventory list | `inventory-list-d1440.png`, `inventory-list-m390.png`, `receipt-saved-m390.png` | Exclusive table/cards, stock warning distinct from active state, no repeated destructive CTA; final stock20 visible |
| Refaction detail | `inventory-detail-d1440.png` | Legible right sheet, dimmed background, unknown warehouse basis explicit |
| Receipt/IVA | `receipt-pending-d1440.png`, `receipt-iva-d1440.png`, `receipt-iva-m390.png`, `receipt-review-m390.png` | $1,392 included16% → net$1,200 + IVA$192; review10→20, no fictitious average, one confirm CTA |
| Documents | `documents-d1440.png`, `document-detail-d1440.png`, `document-detail-m390.png` | Independent document/cost states, scoped supplier/net/IVA/total, Spanish dropzone, no stock-increase implication |
| Unit summary | `unit-summary-d1440.png`, `unit-summary-m390.png` | Identity, compact health, single overdue exception, action readable |
| Unit technical | `unit-technical-d1440.png`, `unit-technical-m390.png` | Four destinations retained, factual missing data and read-only last reading |
| Unit maintenance/history | `unit-maintenance-d1440.png`, `unit-history-d1440.png` | Existing shell, single maintenance exception, service/driver/order context |
| Unit costs | `unit-costs-d1440.png`, `unit-costs-m390.png`, `unit-costs-detail-m390.png` | $1,600 preventive/$0 corrective; existing navy/burnt orange; selected-month operations readable; mobile plot visibility caveat above |

No DevTools chrome, new palette, gradients or repeated orange actions appear. The selected document is pending while its cost is recorded, demonstrating separation of states. Historical values are presented as net MXN refaction costs rather than whole-maintenance costs. Receipt screenshots demonstrate correct IVA preview and stock readback; they do not independently prove server concurrency or cost persistence, which belongs to API evidence.

## Captured-scope scores

| Surface | Hierarchy | Legibility / consistency | Data fidelity / utility | Actions | Responsive / visual accessibility |
|---|---:|---:|---:|---:|---:|
| Inventory list/detail | 8.8 | 8.8 | 8.7 | 8.6 | 8.5 |
| Receipt and IVA | 8.8 | 8.8 | 8.9 | 8.8 | 8.6 |
| Document list/detail | 8.5 | 8.5 | 8.7 | 8.6 | 8.5 |
| Unit four sections | 8.8 | 8.8 | 8.7 | 8.6 | 8.5 |
| Unit cost view | 8.5 | 8.7 | 8.6 | 8.5 | 8.5 |

Scores reflect visible evidence only, not blanket acceptance of every state. Runtime entry through the role picker/click-through is reported by the implementer's walkthrough and was not independently clicked by this reviewer. No server mutation, keyboard walkthrough, contrast measurement, zoom or additional breakpoint exercise was performed by this reviewer. Preserved older findings and their correction are described above rather than silently deleting the failed first pass.
