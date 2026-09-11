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
- Seguir bajo no reemite, salvo WARNING → CRITICAL (`qty` a 0).

## Eventos

Envelope (Inventario → Notifications). Campos requeridos:

```
StockBajo | StockReabastecido {
  eventId,
  itemId,
  sku,
  qty,
  minQty,
  occurredAt
}
```

`eventType` viaja en el envelope de puerto (`StockBajo` | `StockReabastecido`). `occurredAt` es ISO-8601. `qty` / `minQty` son los valores **después** del cruce.

## Seam

Inventario **no** escribe `notifications.*` ni `andon.*`.

```
Inventario  --StockAlertPort-->  Notifications adapter
                 onStockBajo(event)     → ingestStockBajo(event)
                 onStockReabastecido(event) → clear(itemId)
```

El adapter vive en Notifications (`InventarioInboxAdapter`). El módulo Inventario solo inyecta el port.

## Notifications (ADR-006)

Al ingerir `StockBajo`:

- `source_module=INVENTARIO`
- `source_event=StockBajo`
- `source_ref=eventId`
- `subject_type=ITEM`
- `subject_ref=itemId`
- `dedupe_key=INV:stock-bajo:{itemId}` (unique upsert)
- Deeplink calculado: `/inventario/stock`
- `WARNING` si `qty > 0`; `CRITICAL` si `qty = 0`

`StockReabastecido` no crea fila; `clear(itemId)` expira el matching `dedupe_key`.

Sin WhatsApp de Inventario. Cero escrituras en `andon.*`.

## TDD (S1–S4)

Ver ADR-004. Spec: `api/src/inventario/stock-alerta-rules.spec.ts`.

## Fuera de v0

OC automática, multi-almacén, preferencias por usuario, WhatsApp Inventario.
