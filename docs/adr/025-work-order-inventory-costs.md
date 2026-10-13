# ADR-025 — Costeo de materiales y movimientos explícitos por OT

## Status

Proposed. No sustituye todavía ningún ADR aceptado. Reglas de producto acordadas en chat; detalles de arquitectura aquí propuestos para revisión técnica.

## Context

[ADR-002](002-schema-per-module.md) descuenta almacén al cerrar y crea pendiente de comprobante para compra externa sin stock. El incremento necesita costo real por compra directa, recepción de sobrantes y correcciones posteriores sin duplicar cierre ni efectos de mantenimiento.

Las tablas actuales no almacenan valoración/costos/reversos. Cambiar cuándo se contabiliza y cómo se preserva un costo tiene consecuencias duraderas en migración e historial, por lo que se registra como decisión propuesta.

## Decision proposed

1. Inventario conserva compras/líneas, conversiones, valoración, movimientos monetarios y reversos. Mantenimiento conserva OT y referencias opacas de consumo. No FKs/JOINs cruzadas; no nuevo Bounded Context.
2. Promedio ponderado móvil para salidas de almacén; costo real de compra para consumo directo. Sólo sobrante físicamente recibido entra a valoración. Snapshot de costo aplicado permanece inmutable.
3. Confirmar uso/compra/recepción aplica movimientos explícitos e idempotentes dentro de transacción coordinada. Captura no confirmada no mueve stock. Cierre verifica contabilización; nunca vuelve a aplicar la misma operación.
4. Mantener el envelope histórico `VisitaCerrada` congelado. Diseñar contrato versionado/referencia de contabilización para distinguir legacy aplicado al cierre de nuevo consumo ya aplicado. No inferirlo de `itemId + qty`, que no identifica líneas repetidas. Resolver ese contrato antes de ejecución.
5. Corrección administrativa produce reverso y nueva versión; no reabre OT ni reemite mantenimiento completado. No modificación de firmas/km/trabajos en este incremento.
6. Moneda confirmada MXN, costo operativo incluyendo impuestos. Apertura/precisión se fijan en migración; costos desconocidos no se convierten a cero ni bloquean uso/cierre, se completan con registro auditado. Saldo con costo desconocido mantiene valoración incompleta.
7. Cantidades fraccionarias confirmadas para unidades divisibles; decimal exacto en persistencia/contratos y precisión por unidad. Migrar stock, cantidades de movimientos/piezas y umbrales afectados; adaptar validación legacy de mínimo 1 a positivo para unidades divisibles. No fracciones de piezas indivisibles ni redondeo silencioso.
8. Evidencia documental adjuntable después de registrar/cerrar. Compra sin evidencia activa Comprobante pendiente por compra en façade de ADR-022, sin duplicar pendiente legacy. Adjuntar elimina condición sin modificar stock/costos. Lectura y cierre no eliminan condición documental.

De aceptarse, sustituye parcialmente **sólo** la aplicación de consumos al cierre de ADR-002 para el nuevo flujo. Preserva ownership, IDs opacos y restricciones entre schemas; no modifica consumidores Andon/Salud/CHECK del cierre.

## Alternatives Considered

- Todo a costo promedio: más simple, pero oculta sobreprecio de compra específica; usuario eligió costo real directo (B).
- Aplicar todo únicamente al cierre: conserva ADR-002, pero saldo no refleja uso/recepciones confirmadas mientras OT sigue abierta.
- Sobrescribir líneas cerradas: menos datos, pero destruye explicación de costos/correcciones y puede repetir efectos.
- Emitir otro `VisitaCerrada` al corregir: rechazado por duplicar mantenimiento y alterar consumidores ajenos.

## Consequences and risks

Positivo: stock físico y costo explicables, captura única y retries seguros. Costo técnico: nuevos datos, coordinación transaccional, valoración inicial y adaptación del contrato legacy.

Riesgos: stock histórico sin costo, correcciones cuando sobrante ya se consumió, concurrencia, impuestos y cantidades fraccionarias. Una corrección posterior de precio de compra debe distribuir su ajuste entre destinos históricos afectados mediante ajuste explícito; nunca revalorar silenciosamente OT anteriores. El algoritmo detallado requiere contrato antes de implementar.

## Follow-up / related artifacts

[SPEC](../specs/work-order-inventory-costs-v1.md), [PRD](../prds/inventory-work-order-costs-v1.md), [UX](../design/ux-work-order-inventory-costs-v1.md). Preparar contrato, plan migratorio y EWO acotado cuando estén resueltas las decisiones materiales. Sin migraciones ni cambios de runtime en este paquete.

## Ownership

Date: 2026-10-12. Owner: usuario del chat para reglas de producto; aceptación de esta propuesta arquitectónica pendiente. Approval reference: «Go b» para costeo directo; «Okay go ahead with this» para elaborar especificación. No afirmar aprobación de detalles técnicos no discutidos.
