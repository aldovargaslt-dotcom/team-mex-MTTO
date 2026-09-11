# ADR-005 — Andon no aloja alertas de stock / Inventario

Estado: aceptado (v0)

El schema PostgreSQL `andon` es **solo** avisos de mantenimiento vencido (km/días desde la última visita **cerrada**).

Prohibido en `andon`:

- tablas o filas de stock, SKU, familia, movimiento, pendiente de comprobante
- alertas de inventario (stock bajo, compra externa, etc.)
- FKs o JOINs hacia `inventario.*` o hacia `visitas` / `unidades`

Los avisos de stock viven en Inventario (si existen). Andon consume el envelope `VisitaCerrada` (ADR-001) y **ignora `consumos`**. IDs de unidad / tipo / visita son opacos.
