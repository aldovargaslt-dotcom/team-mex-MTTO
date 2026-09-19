# Product Context

Authoritative **product** description for Team Mex MTTO. Operational how-to (run, seed, deploy) stays in [README.md](../README.md). Do not treat this file as a deploy runbook.

Legend for statements below:

- **Evidence** — stated in repository artifacts.
- **Inference** — reasonable reading of those artifacts; not independently confirmed with stakeholders in this bootstrap.
- **Unknown** — not established from the repository.

## Product

**Team Mex — Mantenimiento** (`team-mex-MTTO`): operations software for fleet maintenance visits, parts consumption (Inventario), overdue-maintenance notices (Andon), an in-app inbox (Notifications / campanita), yard movements (Flota), logistics ops status on units, and a calculated unit Health Score (Salud).

Evidence: [README.md](../README.md), [docs/adr/000-thin-kernel.md](../docs/adr/000-thin-kernel.md).

## Purpose

Give Supervisor, Admin, and Logística a shared picture of **which unit needs work, what was done on a visit, what parts moved, what is overdue, and (for Logística) where the unit is in the yard / trip ops** — without a TMS, ERP purchasing suite, or multi-warehouse WMS.

Evidence: README scope paragraph; [docs/specs/fleet-manager-v0.md](../docs/specs/fleet-manager-v0.md); [docs/specs/unit-health-v0.md](../docs/specs/unit-health-v0.md).

## Users / Actors

Stub auth via `X-Role` (and optional `X-User-Id`). Missing role header → 401.

| Actor (code) | UI label (inference from copy) | What they do (evidence: README API/UI tables) |
|--------------|--------------------------------|-----------------------------------------------|
| `SUPERVISOR` | Supervisor | Visit wizard (Datos → … → Piezas → Firmas → Confirmar), Inventario, Andon Enterado, hub de unidad, campanita |
| `ADMIN_DIRECTIVO` | Administrador / Admin directivo | Catálogo unidades/tipos/choferes, umbrales Andon, Inventario, Flota, historial de visitas en lectura, config Salud |
| `LOGISTICA` | Logística | Flota visual (`/flota`), registrar regreso, config alertas sin regreso, campanita `FLOTA_SIN_REGRESO`. **Not** visit wizard, Inventario, or Andon UI |

Chofer is a **catalog entity**, not a logged-in role for the visit wizard. Patio movements record `CHOFER` + `AVAL` signatures (evidence: ADR-008).

## Current Operational Context

**Evidence:** demo seed catalog (tipos STOCK / RUTAS / CAMIONES 3 Y MEDIA; named choferes and unidades). Visits are closed with km, trabajos, photos, signatures, optional piezas. Closing publishes `VisitaCerrada`. Andon opens from km/days since last **closed** visit. Flota is a yard log (`SALIDA`/`ENTRADA`), not GPS. Logística paints kernel `ops_estado` / `ambito` / `destino` on `/flota`.

**Inference:** the product is used as a shop-floor / patio desk (Spanish copy, mobile wizard for Supervisor).

**Unknown:** the real company’s full process, who “Aldo” is relative to production ops, and whether the seeded catalog is production data or demo-only.

## Primary Outcomes

- Close a maintenance visit with a frozen `VisitaCerrada` envelope (ADR-001).
- Consume parts from stock or record external purchase on the visit (`DESDE_STOCK` / `COMPRA_EXTERNA`).
- Surface overdue maintenance (Andon) and low stock (Inventario → inbox), without mixing those into one schema.
- Record yard custody and logistics ops status.
- Show an explainable Health Score on the unit hub (not a third unidad estado).

## Current Scope (v0)

Evidence: README opening + ADR index.

- Thin kernel: unidades, tipos, choferes, roles, outbox.
- Visitas de mantenimiento (including piezas as consumption lines).
- Inventario schema (familias, ítems, proveedores, stock, movimientos, pendientes, `min_qty`).
- Andon schema (avisos de mantenimiento vencido).
- Notifications schema (campanita + inbox).
- Flota schema (bitácora de patio).
- Logística ops fields on kernel unidad (`ambito`, `destino`, `ops_estado`, `salida_at`); asignación chofer↔unidad **parked**.
- Alertas schema (umbrales sin regreso).
- Salud schema (Health Score + derived inbox alert).
- UI: Next.js App Router, shadcn + Tailwind, tokens Team Mex (ADR-003).

## Explicit Non-goals (fuera de v0)

Evidence: README, AGENTS.md, ADR-003/008/010 specs.

- Multi-almacén, lotes, costeo, OC formal, kardex pesado, ítem↔placa, reserva de stock en borrador.
- GPS / rutas / TMS / ELD.
- Unifying or “fixing” the Andon notify dual-stack in a visual or infra cut.
- Expanding Inventario or Andon ownership without a new/updated ADR.
- Inspections bounded context, ML/telemetry/DTCs, editing Health by hand, WhatsApp for Inventario/Salud.
- Assign-chofer desk as the Logística home (parked).

## Important Constraints

- Schema per module; opaque IDs; no cross-schema FKs/JOINs (ADR-002).
- Ports are the seam (`NotifyPort`, `StockAlertPort`, …).
- Default `ANDON_NOTIFY_PROVIDER=noop`. Dual-stack notify is a **known conflict** — document both; do not merge factories (see AGENTS.md).
- Visual-only cortes do not touch `api/src`.
- Non-trivial implementation originates from an approved **Engineering Work Order** (`EWO-xxx` in `docs/engineering-work-orders/`). Historical **cortes/briefs** are not EWOs unless a human asks to migrate them.
- **WO** in product/UI means the Supervisor visit wizard, never an Engineering Work Order.

## Current Known Pain Points

Evidence in docs (not a new product claim):

- Dual-stack Andon notify vs ops checklist wording ([docs/andon-evolution-notify.md](../docs/andon-evolution-notify.md), [architecture/andon-whatsapp-ops-checklist-v0.md](../architecture/andon-whatsapp-ops-checklist-v0.md)).
- Two “en ruta” stories: patio `SALIDA`/`ENTRADA` vs kernel `ops_estado` (ADR-008 vs ADR-011; tablero spec says they are not derived from each other in that cut).
- ADR filename/number collision (architecture ADR-009/010 vs docs ADR-009 icono / ADR-010 salud).
- `fleet-tablero-viaje-v0.md` is marked **propuesto** while related Flota visual ADRs are accepted.

## Success Signals

**Evidence of how the repo already verifies:** ADR-004 test IDs; `cd api && npm test && npm run test:e2e`; UI click-through screenshots (`proof-ui`); Visual QA via `ux-auditor`; PR Hold until SD / visual OK if UI changed.

**Unknown:** field KPIs or business SLAs beyond those engineering bars.
