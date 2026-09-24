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
