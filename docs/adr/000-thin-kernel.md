# ADR-000 — Thin kernel

Estado: aceptado (v0)

El kernel de Team Mex es deliberadamente delgado. Solo vive aquí lo que varios módulos necesitan para identificarse mutuamente:

- Unidad
- TipoVehiculo
- Chofer
- Roles (`SUPERVISOR`, `ADMIN_DIRECTIVO`)
- Outbox de integración (eventos entre módulos, sin FKs cruzadas)

Mantenimiento es dueño de Visita (datos, trabajos, observaciones, fotos, firmas, **piezas como líneas de consumo**). Inventario es dueño de Familia, Ítem/SKU, Proveedor, ÍtemProveedor, Compatibilidad, Stock, Movimiento y Pendiente de comprobante.

El kernel no conoce stock, costos ni catálogo de refacciones. Inventario no conoce la entidad Visita: solo IDs opacos (`visitaId`, `tipoVehiculoId`) y el payload `VisitaCerrada.consumos`.
