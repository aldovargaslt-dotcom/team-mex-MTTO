# Engineering Work Orders

Execution artifacts for **non-trivial** implementation in this repository.

| | Product **WO** | **Engineering Work Order** |
|---|----------------|----------------------------|
| Means | Supervisor visit wizard (Orden de Trabajo) | Approved engineering execution brief |
| ID | not used | `EWO-001`, `EWO-002`, … |
| Path | `web/src/app/unidades/.../visitas` (UI) | this folder |
| Acronym | **WO** only | **Never abbreviated WO** |

Template: [EWO-TEMPLATE.md](EWO-TEMPLATE.md).

Do **not** create `work-orders/` or `docs/work-orders/` (legacy rule: that name collides with the wizard).

Historical **cortes / briefs** (GitHub issue template, PR template, `docs/design-system/*`) stay where they are. Do not migrate them here unless a human explicitly asks.

Do not add speculative EWOs. An EWO is created when there is approved work to execute.

| ID | Title | Status |
|----|-------|--------|
| [EWO-001](EWO-001.md) | Alert Catalog registry + API façade + role swimlane | Ready |
| [EWO-002](EWO-002.md) | Configuración → Alertas UI + absorb `/flota/alertas` | Ready |
| [EWO-003](EWO-003.md) | Threshold editors + active-gate on emit | Ready |
| [EWO-004](EWO-004.md) | Alert Catalog UI polish (design-system gate) | Ready |
| [EWO-005](EWO-005.md) | Configuración → Alertas hierarchy redesign (Option B) | Ready |
| [EWO-006](EWO-006.md) | Operator commits name the state they write | Verification |
