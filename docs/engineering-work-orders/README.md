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
| [EWO-007](EWO-007.md) | Cola de órdenes de trabajo (lista + ficha) | Ready |
| [EWO-009](EWO-009.md) | Editor y optimización de foto principal de unidad | Verification |
| [EWO-010](EWO-010.md) | Experiencia de entrada y continuidad del Supervisor | Verification |
| [EWO-011](EWO-011.md) | Contrato e invariante de borrador único | Closed |
| [EWO-012](EWO-012.md) | Creación contextual y captura en Órdenes | Verification |
| [EWO-013](EWO-013.md) | Expediente e historial de unidad | Verification |
| [EWO-014](EWO-014.md) | Feedback de incompletitud y estados de carga | Proposed |


## CHECK — breakdown solicitado en Slice 0

Owner autorizó crear estos artefactos de planificación (2026-10-01), no ejecutar los slices. Paquete aprobado2026-10-01; EWO015 Ready técnicamente y016–022 Draft por dependencias/preflight. Ninguno autoriza ejecución. La regla de no inventar EWOs no impide el breakdown explícitamente pedido. [Review/gates](CHK-001-slice-0-review.md).

| ID | Slice | Status |
|---|---|---|
| [EWO-015](EWO-015.md) | 1 — dominio/migrations/exclusividad/compatibilidad/auth foundation | Ready — execution hold |
| [EWO-016](EWO-016.md) | 2 — manual/daily/audit | Draft |
| [EWO-017](EWO-017.md) | 3 — queue/claim/Condition | Draft |
| [EWO-018](EWO-018.md) | 4 — Evidence/private S3 | Draft |
| [EWO-019](EWO-019.md) | 5 — Findings/Corrective preparada | Draft |
| [EWO-020](EWO-020.md) | 6 — review/sign/immutable completion/invalidation | Draft |
| [EWO-021](EWO-021.md) | 7 — documents/Tower/readiness | Draft |
| [EWO-022](EWO-022.md) | 8 — departure/return/hardening | Draft |
