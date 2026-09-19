# Domain / context areas

These folders are **routing cards** for agents (ICM). They describe areas discovered from **current repository evidence** (modules, PostgreSQL schemas, ADRs, UI routes).

## Classification status

**Provisional / unvalidated as DDD Bounded Contexts.**

A Nest module or a PostgreSQL schema is evidence of a **technical boundary**. That is **not** sufficient, by itself, to declare a DDD Bounded Context. Confirm or revise the DDD classification incrementally when a real change crosses or affects the boundary (new invariant, new ubiquitous language, ownership dispute). Until then, treat labels below as **discovered areas**, not a frozen context map for strategic design.

The living technical map remains [docs/adr/context-map.md](../docs/adr/context-map.md). Do not copy ADRs into these cards.

| Area | Folder | Schema / home (evidence) | DDD status |
|------|--------|--------------------------|------------|
| Shared kernel language | [shared/](shared/CONTEXT.md) | Cross-cutting terms + ports | Shared kernel / published language — **provisional** |
| Kernel | [kernel/](kernel/CONTEXT.md) | `public` unidades, tipos, choferes, outbox | **Provisional** |
| Mantenimiento / Visita | [mantenimiento/](mantenimiento/CONTEXT.md) | `public` visitas | **Provisional** |
| Inventario | [inventario/](inventario/CONTEXT.md) | `inventario` | **Provisional** (ADR-000/002 treat as module owner) |
| Andon | [andon/](andon/CONTEXT.md) | `andon` | **Provisional** |
| Notifications | [notifications/](notifications/CONTEXT.md) | `notifications` | **Provisional** (thin inbox) |
| Flota | [flota/](flota/CONTEXT.md) | `flota` | **Provisional** (ADR-008 names it a BC; still validate on real change) |
| Logística | [logistica/](logistica/CONTEXT.md) | No own schema; writes kernel columns | **Provisional** — may be an application service on Kernel, not a BC |
| Alertas | [alertas/](alertas/CONTEXT.md) | `alertas` | **Provisional** — shared config, not a silo |
| Salud | [salud/](salud/CONTEXT.md) | `salud` | **Provisional** (ADR-010 names it a BC) |

## Not domain folders

- Consulta / conducta UX (`docs/design-system/ux-consulta-conducta-cortes-v0.md`) — reading overlays, not a persistence owner.
- UI engineering system (`docs/design/`) — process + tokens.
- Deploy (Railway/Vercel) — runtime.

## How to use

Load **this area’s CONTEXT.md** plus the ADRs/specs it lists. Load a neighbor only when a **named seam** is in scope. Escalate if a change would re-draw ownership.
