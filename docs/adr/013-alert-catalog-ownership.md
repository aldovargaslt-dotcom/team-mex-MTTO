# ADR-013 — Alert Catalog: façade + type overlay (no schema merge)

## Status

Accepted — 2026-09-21

## Context

[SPEC-ALERT-CATALOG-v0](../specs/alert-catalog-v0.md) (Approved) asks for one product surface **Configuración → Alertas** (types, family, active, role swimlane) while **emitters stay in their modules**. It forbids merging `andon` ∪ `alertas` ∪ `notifications` (and `salud` / `inventario`). WhatsApp / Andon dual-stack notify is out of scope.

Spike of current persistence (as of this ADR):

| Type (v0 seed) | Family | Threshold values today | Emit → inbox |
|----------------|--------|------------------------|--------------|
| `MTTO_VENCIDO` | MTTO | `andon.umbrales` (`t_km` / `t_dias`) | Andon `AvisoInboxPort` |
| `STOCK_BAJO` | MTTO | `inventario.stock.min_qty` | `StockAlertPort` |
| `SALUD_UMBRAL` | MTTO | `salud.health_config` (`alertThreshold`, …) | `HealthAlertPort` |
| `FLOTA_SIN_REGRESO` | FLOTA | schema `alertas` (`regla_flota_sin_regreso`, `umbral_unidad`); HTTP `/logistica/alertas` | `FlotaSinRegresoPort` |

Inbox (`notifications.inbox_item`) is delivery only (ADR-006). Schema `alertas` is **sin-regreso hours**, not a general alert BC ([domain/alertas](../../domain/alertas/CONTEXT.md)).

BR-05 needs **MODULE vs CATALOG** placement. AC-03 needs **create type** + **deactivate** that survives process restart and is re-checked at emit time. A static TypeScript constant can seed the four types and filter by role; it cannot persist `active` or admin-created rows.

SPEC default for CATALOG read failure: **fail closed** (do not emit sin-regreso with a silent default).

This catalog is a **shared capability**, not a newly confirmed DDD Bounded Context. Escalate if a later cut would redraw BCs.

## Decision

**UI + API façade over existing module stores for threshold values (BR-05).** Do **not** move Andon km/días, Inventario `min_qty`, Salud config, or Flota sin-regreso hours into one table.

**Type metadata** (code, label, family, owning module, threshold mode, `active`) is:

1. A **seeded in-code registry** for the four v0 types in BR-05 (canonical defaults).
2. A **thin overlay table** `alert_catalog.tipo` so deactivate / reactivate / admin-create persist. Seed upserts **insert-if-absent**; they must not revive an admin deactivation on boot.

Threshold writes:

- `MODULE` (`MTTO_VENCIDO`, `STOCK_BAJO`, `SALUD_UMBRAL`): catalog UX calls **owning module APIs/ports**. Inventario `min_qty` remains dual-editor (Inventario screens **and** catalog entry).
- `CATALOG` (`FLOTA_SIN_REGRESO`): catalog UX is SoT; values stay in schema `alertas` behind `AlertasService` / existing Logística HTTP. Fail closed if that store cannot be read at evaluation.

Permission swimlane (BR-03) is enforced on catalog HTTP. Module HTTP keeps its existing role guards except where the SPEC requires Supervisor to edit MTTO Andon km/días **via the catalog entry** (Andon `PATCH /andon/umbrales` may accept `SUPERVISOR` so the MODULE editor works).

Emitters re-check `active` **immediately before** writing a **new** inbox item for that `code`. Resolve / expire / WhatsApp `NotifyPort` are unchanged (BR-07).

Product copy: **Alertas**. Internal names Andon / `notifications` / schema `alertas` stay in code.

`/flota/alertas` is not a second config model: redirect to Configuración → Alertas (Flota type).

## Alternatives Considered

### Option A — Pure UI façade, registry only in code

List/filter in the UI; no catalog API store. Deactivate and admin-create die on restart. Fails AC-03 and emit-time active gate across boots.

### Option B — New unified “alerts” schema holding types + all thresholds + inbox

Merges Andon, stock, salud, sin-regreso, and campanita. Violates ADR-002/005/006 and SPEC AC-12 / non-goals.

### Option C — Overlay rows inside schema `alertas`

Keeps one extra table out of a new schema, but turns Flota sin-regreso config into a general catalog (forbidden on the alertas domain card). MTTO type flags would live in a Flota-associated schema.

### Option D — Chosen: façade for values + `alert_catalog.tipo` overlay

Minimum persistence that is **not** a merge. Threshold scalars stay where ADR-007/010/012 and Andon already put them.

## Consequences

### Positive

- One admin/supervisor/logística list without collapsing emitters.
- Role swimlane and `active` are testable without a rules engine over foreign schemas.
- Dual-stack Andon notify files are untouched.

### Negative / Trade-offs

- A fifth operational schema (`alert_catalog`) exists only for type rows (dozens, not events).
- Catalog HTTP plus module HTTP both exist for MODULE editors (Inventario dual; Andon umbrales still on `/andon`).
- Admin-created types have **no emitter** until a SPEC/ADR extends BR-05; they are metadata only.

## Risks

- Nest import cycles if the overlay module both **is injected by** emitters and **imports** those modules for MODULE proxies. Mitigate: `@Global()` catalog module + `forwardRef` where a façade must call a module service; optional `AlertTypeActivePort` so unit tests default to active.
- Race: deactivate vs in-flight emit — re-check `active` at the port call, not only at request start.
- Confusing product names: nav **Alerta** (Andon board) vs **Alertas** (catalog + inbox). Inbox/campanita/config use Alertas; Andon board copy stays avisos de mantenimiento.

## Follow-up

- EWO-001 registry + API façade + swimlane.
- EWO-002 Configuración → Alertas UI; absorb `/flota/alertas`.
- EWO-003 threshold panels + active-gate on emit.
- Do not unify `andon-notifier.factory.ts` with `andon/notify/`.

## Related Artifacts

SPEC: [alert-catalog-v0](../specs/alert-catalog-v0.md)  
UX spec: [ux-alert-catalog-v0](../design/ux-alert-catalog-v0.md)  
Engineering Work Orders: `EWO-001`, `EWO-002`, `EWO-003`  
Previous ADR: [002](002-schema-per-module.md), [005](005-andon-no-stock-alerts.md), [006](006-notifications-schema.md), [007](007-inventario-stock-bajo.md), [010](010-salud-unidad.md), [012](012-flota-sin-regreso-alertas.md)
