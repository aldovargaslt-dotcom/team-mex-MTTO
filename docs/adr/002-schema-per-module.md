# ADR-002 — Schema per module, sin JOINs ni FKs cruzadas

Estado: aceptado (v0)

Cada módulo persiste en su propio esquema (o frontera equivalente):

- Kernel / Mantenimiento: esquema `public` (tablas ya existentes: `unidades`, `visitas`, `visita_piezas`, …)
- Inventario: esquema PostgreSQL `inventario`

Prohibido:

- FK de `inventario.*` hacia `visitas` / `unidades` / `tipos_vehiculo`
- FK de `visita_piezas.item_id` hacia `inventario.items`
- JOINs SQL entre módulos
- Que Mantenimiento escriba stock o hidrate SKU/stock en el DTO de Visita

Se usan IDs opacos (`itemId`, `tipoVehiculoId`, `visitaId`).

Líneas de pieza: viven en Visita (`visita_piezas.item_id` opaco, sin FK). Inventario es el único escritor de stock/movimientos; `movimientos.visita_id` es opaco.

SKU search y stock: lecturas síncronas de la API de Inventario (`GET /inventario/skus`, `GET /inventario/items?ids=`, `GET /inventario/stock`). La UI compone; Visita no hace JOIN ni llama al servicio de Inventario.

Integración en el cierre (misma transacción + fila de outbox en el monolito modular):

1. Mantenimiento persiste las líneas de pieza (sin campos de stock) y marca la visita cerrada.
2. Escribe `outbox_events` con el envelope `VisitaCerrada` (ADR-001) e incluye `consumos: [{ itemId, qty, origen }]`.
3. Handler de Inventario (mismo txn): `DESDE_STOCK` → `SALIDA_OT` si stock ≥ qty (si no, falla y no cierra); `COMPRA_EXTERNA` → pendiente de comprobante, sin movimiento de stock.
