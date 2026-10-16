# PRD-INV-001 — Costo trazable de refacciones por orden y unidad

## Status and owner

**Proposed**. Solicitante: usuario de este chat; preparación: Codex. Fecha de cliente2026-10-15. Respuestas de GrillMe sustentan reglas de negocio; solicitud actual autoriza consolidación documental, no implementación/deploy.

## Summary

Estandarizar alta, recepción, consumo y documentos; incorporar costo por refacción con promedio ponderado e importes históricos que permitan consultar gasto por orden/unidad.

## Business problem

El sistema registra qué piezas se usan pero no su costo. La interfaz confunde recepción de comprobantes con mercancía y duplica representaciones responsive. Un precio de catálogo actual no explica cuánto costó un consumo anterior.

## Affected users / roles

Supervisor captura/consulta y completa costos pendientes; Admin consulta/valida y autoriza correcciones/aperturas. Mantener permisos físicos actuales; ninguna ampliación a otros roles por ver una orden.

## Current process and evidence

Entidades/DTO y flujos inspeccionados en [SPEC-INV-001](../specs/SPEC-INV-001.md): ítems, stock, movimientos, piezas de visita y comprobantes sin importes. Pantallas y mockups en docs/design/references. No evidencia de producción consultada para afirmar estado desplegado.

## Pain points

Altas/entradas sin guía de continuidad; nombre Por recibir ambiguo; costos desconocidos; falta de snapshots y de protección transaccional frente a reintentos. Información de mantenimiento repartida y difícil de consultar en móvil.

## Desired business outcome

Identificar cada refacción una vez, registrar cantidades/costos sin duplicar, preservar lo aplicado a cada consumo y mostrar qué parte del gasto se conoce o está pendiente. Consultar desde Unidades sin inventar mano de obra u otros gastos.

## Scope

- UI Inventario/Unidades con capacidades actuales y accesibilidad.
- Costeo neto MXN, IVA incluido/excluido automático, tasa16% editable/Sin IVA, captura de solo total.
- Promedio ponderado; recepción/consumo con costo pendiente permitidos; apertura valorizada Admin.
- Costo histórico y regularización auditada; ajustes/retornos acordados; proveedor en compras nuevas y documentos completables después.
- Consulta Costo de refacciones por periodo/orden/unidad, Preventivo/Correctivo según fuentes reales.

## Non-goals

Costo/km, adquisición, mano de obra/otros sin fuente, ERP/OC formal, multi-almacén/lotes, descuentos/flete separados, OCR y devolución a proveedor/cambios/garantías en primera entrega. No GPS ni cambios en Salud/CHECK/notify.

## Success metrics

Baseline operativo desconocido; no inventar reducción porcentual de tiempos. Medir éxito de alta→entrada sin duplicados, recuperación ante errores, reconciliación de cantidades/costos y tareas desktop/móvil. Objetivo de revisión visual acordado ≥8.5 por dimensión con gates obligatorios. Medición: pruebas transaccionales, proof-ui y auditoría independiente; sin resultados de implementación todavía.

## Business rules

Canónicos [SPEC-INV-001](../specs/SPEC-INV-001.md), rondas GrillMe1–3; UI de unidad [SPEC-MTTO-UX-002](../specs/SPEC-MTTO-UX-002.md). No repetir criterios de aceptación aquí. Neto para valoración; total capturado no implica pago; documento recibido no implica costo completo. El dato faltante no es cero.

## Operational risks

Stock inicial sin costo, recepción pendiente seguida de consumos, importes tardíos, promedio incompleto, permisos y correcciones. Evitar bloquear mantenimiento por falta financiera, doble cargo por retries o revaloración silenciosa de historia.

## Assumptions and open questions

Dirección de operación aceptada en chat. Diseño técnico propuesto en [INV-001](../contracts/INV-001-costos.md) y [ADR-026](../adr/026-inventario-costos-historicos.md); aceptación de arquitectura/contrato y EWO de ejecución sigue pendiente. Fecha efectiva de retorno es propuesta explícita de reporte, no acuerdo atribuido al usuario. Target de despliegue y datos reales no inspeccionados.

## Related artifacts

[Revisión GrillMe](../../workspace/discovery/grillme-inventario-unidades-review.md), [UX Inventario](../design-system/inventario-flujo-costos-v1.md), [UX Unidades](../design-system/ficha-unidad-v1.md), [EWO-038](../engineering-work-orders/EWO-038.md), [EWO-039](../engineering-work-orders/EWO-039.md). No EWO financiero ejecutable aprobado por este PRD.
