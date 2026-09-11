# ADR-002 — Schema per module, sin JOINs ni FKs cruzadas

Estado: aceptado (v0)

Cada módulo persiste en su propio esquema (o frontera equivalente):

- Kernel / Mantenimiento: esquema `public` (tablas ya existentes: `unidades`, `visitas`, …)
- Inventario: esquema PostgreSQL `inventario`

Prohibido:

- FK de `inventario.*` hacia `visitas` / `unidades` / `tipos_vehiculo`
- FK de `visita_piezas.item_id` hacia `inventario.items`
- JOINs SQL entre módulos

Se usan IDs opacos (`itemId`, `tipoVehiculoId`, `visitaId`). La UI y los servicios componen datos con consultas al puerto del otro módulo, nunca con un JOIN.

Integración en el cierre de visita:

1. Mantenimiento persiste las líneas de pieza (sin campos de stock).
2. Al cerrar, publica `VisitaCerrada` (outbox) con `consumos[]`.
3. Inventario aplica `SALIDA_OT` solo a líneas `DESDE_STOCK` y crea pendiente de comprobante para `COMPRA_EXTERNA`.

v0: el outbox se despacha en el mismo proceso y en la misma transacción (si el handler falla, no cierra la visita).
