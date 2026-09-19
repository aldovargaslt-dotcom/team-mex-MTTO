# Inventario — routing card

**DDD status:** provisional / unvalidated. Technical evidence: schema `inventario`, `api/src/inventario`. ADRs treat Inventario as owner of familia, SKU, proveedor, stock, movimiento, pendiente, `min_qty`.

## Purpose

Parts catalog and stock. Applies visit consumos. Emits stock-threshold events to Notifications. **Does not** own Andon avisos.

## Authoritative docs

- [ADR-002](../../docs/adr/002-schema-per-module.md)
- [ADR-005](../../docs/adr/005-andon-no-stock-alerts.md)
- [ADR-007](../../docs/adr/007-inventario-stock-bajo.md)
- [ADR-004](../../docs/adr/ADR-004-tdd-test-bar-andon-v0.md) I/S
- UI: [ux-operacional-cortes-v0.md](../../docs/design-system/ux-operacional-cortes-v0.md)

## Language (subset)

Familia, ítem, SKU, proveedor, stock, `min_qty`, Bajo, Agotado, `SALIDA_OT`, pendiente de comprobante, `StockBajo`, `StockReabastecido`.

## Seams

`StockAlertPort` only into Notifications. No writes to `andon.*` or `notifications.*` from Inventario domain.

## Constraint

Do not expand Inventario ownership without a new/updated ADR. Visual-only cortes do not touch `api/src`.
