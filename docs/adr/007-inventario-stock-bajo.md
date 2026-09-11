# ADR-007 — Inventario umbral stock bajo (`min_qty`)

Estado: aceptado (v0)

Inventario es dueño del umbral de stock bajo. Notifications solo **ingiere**; Andon **no** aloja alertas de stock (ADR-005 / ADR-006).

## Schema

Columna `inventario.stock.min_qty` (`integer`, **nullable**). Vive en el stock item (1:1 con SKU, almacén único v0).

| Valor | Significado |
|-------|-------------|
| `null` | opt-in apagado: **sin alerta** |
| entero ≥ 0 | umbral: Bajo cuando `qty <= min_qty` |

Alias de brief (`stock_min`) **no** se persiste.

## Reglas

- Bajo: `qty <= min_qty`. Badge **Bajo** si `qty > 0`; **Agotado** si `qty = 0`.
- Severidad inbox: `WARNING` si `qty > 0`; `CRITICAL` si `qty = 0`.
- Quién edita `min_qty`: Supervisor y Admin.
- Cruce a `qty <= min_qty` → emite `StockBajo`.
- Cruce a `qty > min_qty` (o se quita el umbral) → emite `StockReabastecido` (no crea fila; expira el matching).

## Notifications (ADR-006)

Inventario llama el ingest ya existente (`ingestStockBajo` / `ingestStockReabastecido`).

- `dedupe_key`: `INV:stock-bajo:{itemId}` (unique upsert).
- `source_module=INVENTARIO`, `source_event=StockBajo`, `subject_type=ITEM`.
- Deeplink calculado: `/inventario/stock`.
- Sin WhatsApp de Inventario. Cero escrituras en `andon.*`.

## Fuera de v0

OC automática, multi-almacén, preferencias por usuario, WhatsApp Inventario.
