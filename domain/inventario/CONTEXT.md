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

- [ADR-022](../../docs/adr/022-alert-attention-priority.md) — configurable critical quantity within minimum; opt-in unchanged

## Language (subset)

Familia, ítem, SKU, proveedor, stock, `min_qty`, Bajo, Agotado, `SALIDA_OT`, pendiente de comprobante, `StockBajo`, `StockReabastecido`.

## Seams

`StockAlertPort` only into Notifications. No writes to `andon.*` or `notifications.*` from Inventario domain.

## Constraint

Do not expand Inventario ownership without a new/updated ADR. Visual-only cortes do not touch `api/src`.

## Inventory / OT costs extension

[ADR-025](../../docs/adr/025-work-order-inventory-costs.md), [SPEC-INV-OT-001](../../docs/specs/work-order-inventory-costs-v1.md), [EWO-038](../../docs/engineering-work-orders/EWO-038.md). InventoryMaterialsPort coordinates exact, immediate postings within Mantenimiento transactions. Inventario owns weighted-average source attribution, purchase-line records, immutable costs/reversals, idempotency, valuation and private receipt references. Quantity scale is explicit per item; opening/legacy costs remain unknown. No new BC, cross-schema JOIN/FK, payment accounting or physical lot system. Runtime capability is subject to migration and evidence, not a deployment claim.

## Compatibilidad de catálogo

Compatibilidad: una refacción aplica a los tipos de unidad seleccionados y/o a unidades específicas elegidas. La combinación es una unión; no reserva ni asigna existencias físicas. Una elección individual permanece asociada a esa unidad aunque cambie de tipo. Adoptado por la solicitud explícita del usuario en EWO-039; ADR026 documenta la frontera con Kernel.
