# Mantenimiento / Visita — routing card

**DDD status:** provisional / unvalidated. Technical evidence: `api/src/visitas`, `public` visit tables, Supervisor wizard UI. ADR-000: Mantenimiento owns Visita (datos, trabajos, observaciones, fotos, firmas, **piezas as consumption lines**).

## Purpose

Open, edit, and **close** a maintenance visit. Closing is the transaction that emits `VisitaCerrada`.

## UI

`web/src/app/unidades/[id]/visitas` — wizard. Product term **WO** = this wizard (Orden de Trabajo). Not an Engineering Work Order.

`web/src/app/ordenes` — cola de lectura (abiertas / cerradas) y ficha. No reemplaza el wizard. Sin costeo.

## Authoritative docs

- [ADR-000](../../docs/adr/000-thin-kernel.md)
- [ADR-001](../../docs/adr/001-visita-cerrada-outbox.md)
- [ADR-002](../../docs/adr/002-schema-per-module.md) (piezas / apply)
- [ADR-004](../../docs/adr/ADR-004-tdd-test-bar-andon-v0.md) C/O/I
- UX operacional cortes: [ux-operacional-cortes-v0.md](../../docs/design-system/ux-operacional-cortes-v0.md) (copy/existencias; **does not** include Flota)

## Language (subset)

Visita, WO (wizard), trabajos A–E, piezas, `DESDE_STOCK`, `COMPRA_EXTERNA`, firmas chofer/jefe, `BORRADOR` / `CERRADO`, km.

## Seams

- Inventario apply of `consumos` (same txn; visit must not hydrate SKU/stock).
- Andon consumes envelope, ignores `consumos`.
- Salud recalculates on close.

## Do not load by default

Flota tablero, Logística assignment, dual-stack notify implementation details.


## Approved CHECK target — Slice0 only

Owner 2026-10-01: [ADR016](../../docs/adr/016-visita-check-evolution.md), [contract](../../docs/contracts/CHK-001-contract.md), [SPEC](../../docs/specs/SPEC-CHK-001.md). Extend Visita, CHECK1:1; unique active CHECK per unit, maintenance0..N with legacy slot adapter (partial supersession ADR015). CHECK own condition/PSI/evidence/findings/review/tactile signature; signedimmutable; REQUIRES_WORK selects atomically derived Corrective. CHECK_COMPLETED distinct from VisitaCerrada and no inventory/cadence/maintenance-consumer effects. Explicit requires_reinspection maintenance can append invalidation, ordinary completion does not implicitly invalidate. All as-is code unchanged; no new BC declaration. [R01–05 adoptadas / review](../../docs/engineering-work-orders/CHK-001-slice-0-review.md).


Approved owner update2026-10-01: R01–R05 adoptadas en [Slice0 package](../../docs/engineering-work-orders/CHK-001-slice-0-review.md). Mapping facility por vehículo; MexicoCity día local; daily ACTIVA+Flota EN_PATIO/sinCHECKactivo; hard blockers aceite/refrigerante crítico/fuga severa/llanta severa-ponchadura/PSIcriticalconfig; claim/assign/invalidation en authorizedfacility; physical source Flota enum4 y divergence explícita; retorno overdue<=2hAttention/>2hCritical configurables. Sin decisiones owner pendientes ni código implementado; EWO015 Ready técnico, ejecución retenida.
