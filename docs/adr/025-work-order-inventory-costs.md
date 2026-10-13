# ADR-025 — Costeo de materiales y movimientos explícitos por OT

## Status

Accepted for bounded local implementation under the user's 2026-10-12 request to follow commit 39cd9a5. Execution: [EWO-038](../engineering-work-orders/EWO-038.md). No deployment or production migration approval.

## Context

[ADR-002](002-schema-per-module.md) descuenta almacén al cerrar y crea pendiente de comprobante para compra externa sin stock. El incremento necesita costo real por compra directa, recepción de sobrantes y correcciones posteriores sin duplicar cierre ni efectos de mantenimiento.

Las tablas actuales no almacenan valoración/costos/reversos. Cambiar cuándo se contabiliza y cómo se preserva un costo tiene consecuencias duraderas en migración e historial, por lo que se registra como decisión adoptada para este incremento.

## Decision

1. Inventario conserva compras/líneas, conversiones, valoración, movimientos monetarios y reversos. Mantenimiento conserva OT y referencias opacas de consumo. No FKs/JOINs cruzadas; no nuevo Bounded Context.
2. Promedio ponderado móvil para salidas de almacén; costo real de compra para consumo directo. Sólo sobrante físicamente recibido entra a valoración. Snapshot de costo aplicado permanece inmutable.
3. Confirmar uso/compra/recepción aplica movimientos explícitos e idempotentes dentro de transacción coordinada. Captura no confirmada no mueve stock. Cierre verifica contabilización; nunca vuelve a aplicar la misma operación.
4. Mantener el envelope histórico `VisitaCerrada` congelado. Usar el contrato versionado/referencia de contabilización descrito abajo para distinguir legacy aplicado al cierre de nuevo consumo ya aplicado. No inferirlo de `itemId + qty`, que no identifica líneas repetidas. El contrato técnico adoptado se describe abajo.
5. Corrección administrativa produce reverso y nueva versión; no reabre OT ni reemite mantenimiento completado. No modificación de firmas/km/trabajos en este incremento.
6. Moneda confirmada MXN, costo operativo incluyendo impuestos. Apertura/precisión se fijan en migración; costos desconocidos no se convierten a cero ni bloquean uso/cierre, se completan con registro auditado. Saldo con costo desconocido mantiene valoración incompleta.
7. Cantidades fraccionarias confirmadas para unidades divisibles; decimal exacto en persistencia/contratos y precisión por unidad. Migrar stock, cantidades de movimientos/piezas y umbrales afectados; adaptar validación legacy de mínimo 1 a positivo para unidades divisibles. No fracciones de piezas indivisibles ni redondeo silencioso.
8. Evidencia documental adjuntable después de registrar/cerrar. Compra sin evidencia activa Comprobante pendiente por compra en façade de ADR-022, sin duplicar pendiente legacy. Adjuntar elimina condición sin modificar stock/costos. Lectura y cierre no eliminan condición documental.

Esta adopción sustituye parcialmente **sólo** la aplicación de consumos al cierre de ADR-002 para el nuevo flujo. Preserva ownership, IDs opacos y restricciones entre schemas; no modifica consumidores Andon/Salud/CHECK del cierre.

## Alternatives Considered

- Todo a costo promedio: más simple, pero oculta sobreprecio de compra específica; usuario eligió costo real directo (B).
- Aplicar todo únicamente al cierre: conserva ADR-002, pero saldo no refleja uso/recepciones confirmadas mientras OT sigue abierta.
- Sobrescribir líneas cerradas: menos datos, pero destruye explicación de costos/correcciones y puede repetir efectos.
- Emitir otro `VisitaCerrada` al corregir: rechazado por duplicar mantenimiento y alterar consumidores ajenos.

## Consequences and risks

Positivo: stock físico y costo explicables, captura única y retries seguros. Costo técnico: nuevos datos, coordinación transaccional, valoración inicial y adaptación del contrato legacy.

Riesgos: stock histórico sin costo, correcciones cuando sobrante ya se consumió, concurrencia, impuestos y cantidades fraccionarias. Una corrección posterior de precio de compra debe distribuir su ajuste entre destinos históricos afectados mediante ajuste explícito; nunca revalorar silenciosamente OT anteriores. El algoritmo detallado requiere contrato antes de implementar.

## Follow-up / related artifacts

[SPEC](../specs/work-order-inventory-costs-v1.md), [PRD](../prds/inventory-work-order-costs-v1.md), [UX](../design/ux-work-order-inventory-costs-v1.md). Contrato y ejecución: [EWO-038](../engineering-work-orders/EWO-038.md); [migración local](../migrations/INV-OT-001.md); [evidencia](../evidence/EWO-038.md). No implica despliegue ni migraciones de producción.

## Ownership

## Technical contract adopted for EWO-038

- Quantities are exact decimal strings, numeric(20,6), with item quantity_scale 0–6 (existing pieces default 0). MXN paid totals have two decimals; internal allocation/stock values use six. BigInt scaled arithmetic allocates residues to the final destination/exhausting movement. No silent quantity rounding.
- Inventario stores purchases with stable line IDs, immutable posting snapshots, command identities and revisioned OT accounts. Line records use JSONB with decimal strings; this is an aggregate persistence choice, not a new domain boundary. Unknown legacy inventory has explicit unvalued quantity and known-value remainder; mixed usage stays incomplete.
- Mantenimiento coordinates through InventoryMaterialsPort in the same EntityManager transaction. Lock order: unit coordinator for close, OT row, transaction-scoped inventory posting mutex, command identity, inventory accounts in opaque-ID order, stock item IDs sorted. The pilot mutex deliberately serializes posting and price corrections, avoiding cycles when one acquisition affects several accounts. Legacy entries lock stock only; old outbox consumers acquire the same posting mutex and account row before stock, creating a missing legacy account so delayed historical consumption remains visible; maintenance close also takes the posting mutex. Inventory commands never lock units. Legacy movement writers lock the same stock rows and preserve valuation.
- Commands require UUID key and expected account revision. A transaction-scoped advisory key serializes retries; same key/hash returns the original result before version checks, different payload fails. Actor identity participates in the hash. Receipt retries use content hash and private immutable evidence.
- Frozen VisitaCerrada includes original shape and all consumption lines. A separate inventory closure receipt keyed by eventId records only legacy lines to apply. New posted quantities are never inferred by SKU/quantity equality. Old events with no receipt retain their legacy path.
- Administrative reversals append history and explicit physical destination; stock restoration requires STOCK. Cost completion appends an adjustment against unknown posting components, without altering previously valued costs. Quantity/account versions enforce conflicts. Posted accounts prevent draft deletion.
- Receipt attachment uses the existing private ObjectStoragePort, with image limits/content validation and permission-checked reads; failed storage leaves the pending purchase unchanged. One pending condition per purchase is composed by the existing owner/façade.

This explicitly supersedes ADR-002's close-time application for already posted operations and ADR-007's integer-only storage for divisible items. Accepted ADR bodies remain intact; legacy envelope and notification ownership remain unchanged.

Date: 2026-10-12. Owner: usuario del chat. Approval reference: “Follow the instructions on this commit”, 39cd9a5, autoriza la implementación acotada, adopción técnica y pruebas/migraciones en base local desechable. La autorización anterior de especificación no se confunde con esta autorización de ejecución.


### Price corrections and supplier replacements

Stock keeps analytical valuation-source contributions (exact quantity equivalents and value), not physical lots. Moving-average withdrawals apportion quantity and value with largest remainders, retaining their source snapshots. Acquisition-price corrections distribute the change across pending destinations, current stock, direct use, warehouse use on other OTs, losses and supplier returns. Explicit PRICE_ADJUSTMENT rows and before/after audits preserve original snapshots; no maintenance event is emitted. Source totals must reconcile before posting. Existing stock and migrated history remain unknown, rather than reconstructing an invented acquisition.

Supplier refund/replacement state is documentary. A physical replacement has its own idempotent receipt and return reversal, restores the original valuation attribution and reconciles purchase quantities without creating another purchase expense. Cost completion affects only unknown components; loss totals remain incomplete while loss cost is unknown.
