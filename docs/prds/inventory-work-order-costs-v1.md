# PRD — Inventario y costos por orden de trabajo

## Status and owner

Adopted for bounded local implementation by the request to follow commit 39cd9a5, 2026-10-12. Execution and verification: [EWO-038](../engineering-work-orders/EWO-038.md). Reglas de producto confirmadas por usuario en chat: supervisor opera y cierra, sin aprobación; cantidad usada explícita; sobrantes al almacén; compra para OT a costo real (opción B); almacén a valoración; administrador corrige con historia. No implica código desplegado.

## Summary and business problem

Unir refacciones, compras y consumo de mantenimiento para explicar costos sin cargar al supervisor con formularios de contabilidad. Distinguir adquisición, uso y recepción física evita inflar stock o cargar una compra completa a una reparación parcial.

## Baseline process and desired outcome

Ya existen `DESDE_STOCK`, `COMPRA_EXTERNA`, movimientos y comprobantes pendientes, pero sin valoración ni correcciones de materiales cerrados. La [especificación](../specs/work-order-inventory-costs-v1.md) contiene evidencia de código y requisitos verificables.

Resultado: compra registrada una vez; piezas usadas cargadas a OT; sobrantes disponibles sólo tras recepción; historial de costo estable y correcciones trazables.

Confirmaciones posteriores del usuario: MXN con impuestos incluidos; recibo adjuntable después y **Comprobante pendiente** en alertas; permitir uso/cierre con costos desconocidos visibles como **Costo pendiente** hasta completado administrativo. Usuario confirmó cantidades fraccionarias para materiales divisibles, incluidas compra, uso, sobrantes, devolución y stock.

## Users, scope and non-goals

Supervisor: uso, compra, recepción, devolución, cierre. `ADMIN_DIRECTIVO`: corrección de materiales cerrados. Sin nuevos permisos para Logística.

Incluye costeo operativo, conversión compra/base, devoluciones y correcciones. Excluye aprobaciones, pagos/reembolsos contables, OC formal, multi-almacén, reserva de borradores y edición de firmas/km/fecha de cierre.

## Success metrics and risks

Verificar exactitud cantidad/valor, ausencia de duplicados y captura sin precio/recibo para almacén mediante AC del spec. Baseline de tiempo y metas de negocio desconocidos; medir en prueba operativa, no inventar objetivos.

Riesgos: apertura de costos históricos, precisión de unidades, tratamiento fiscal, consumo antes del cierre y duplicados del legado. Preguntas técnicas/contables permanecen explícitas en el spec.

## Related artifacts

- [SPEC-INV-OT-001](../specs/work-order-inventory-costs-v1.md)
- [UX](../design/ux-work-order-inventory-costs-v1.md)
- [ADR-025 propuesto](../adr/025-work-order-inventory-costs.md)
- EWO: no generado; resolver contrato técnico y aprobar spec antes de acotar ejecución según ICM.
