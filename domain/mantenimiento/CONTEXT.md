# Mantenimiento / Visita — routing card

## Propuesta de análisis — sin ejecución

[SPEC-AN-MTTO-001](../../docs/specs/SPEC-AN-MTTO-001.md) y
[contrato técnico](../../docs/contracts/AN-MTTO-001-technical.md) concretan servicios
externos económicos, horarios y reportes. [ADR030 Proposed](../../docs/adr/030-maintenance-analysis-contracts.md)
propone persistencia en el área existente, sin nuevo BC ni cambios desplegados.
Actor Supervisor captura; Directivo configura horarios; Logística conserva
liberación operativa. No inferir implementación o permisos nuevos desde esta nota.

## Current target vocabulary — 2026-10-15

Abrir orden means withdrawal now; borrador means preparation. Downtime has active
reasons; order completion removes its reason, not unrelated reasons or safety
holds. Focused recheck means personal verification of named repairs while retaining
the original ABC. Retenida para verificación is distinct from available yard time.
These meanings supersede historical opening/PSI vocabulary below as specified by
[ADR025](../../docs/adr/025-abc-utilization-downtime.md); see its related artifacts.

**DDD status:** provisional / unvalidated. Technical evidence: `api/src/visitas`, `public` visit tables, Supervisor wizard UI. ADR-000: Mantenimiento owns Visita (datos, trabajos, observaciones, fotos, firmas, **piezas as consumption lines**).

## Purpose

Open, edit, and **close** a maintenance visit. Closing is the transaction that emits `VisitaCerrada`.

## UI

`web/src/app/unidades/[id]/visitas` — wizard. Product term **WO** = this wizard (Orden de Trabajo). Not an Engineering Work Order.

`web/src/app/ordenes` — cola de lectura (abiertas / cerradas) y ficha. No reemplaza el wizard. Sin costeo.

## Authoritative docs

Referencia de producto futura (GrillMe confirmado 2026-10-17):
[Unidades: readiness, ficha y acciones](unidades-readiness-grillme-2026-10-17.md).
Conserva acuerdos y diferencias pendientes con ADR025; no sustituye SPEC/ADR
ni autoriza implementación.

Especificación posterior: [Unidades readiness](../../docs/specs/SPEC-UNIDADES-READINESS-001.md)
y [UX](../../docs/design-system/unidades-readiness-v1.md), implementadas localmente
por [EWO-056](../../docs/engineering-work-orders/EWO-056.md), con
[evidencia](../../docs/evidence/EWO-056.md).
[ADR028](../../docs/adr/028-configurable-abc-validity.md) y su
[contrato](../../docs/contracts/UNIDADES-READINESS-001-contract.md) concretan
vigencia ABC configurable frente a día universal. Sin despliegue ni ledger UTIL.

- [ADR-000](../../docs/adr/000-thin-kernel.md)
- [ADR-001](../../docs/adr/001-visita-cerrada-outbox.md)
- [ADR-002](../../docs/adr/002-schema-per-module.md) (piezas / apply)
- [ADR-004](../../docs/adr/ADR-004-tdd-test-bar-andon-v0.md) C/O/I
- UX operacional cortes: [ux-operacional-cortes-v0.md](../../docs/design-system/ux-operacional-cortes-v0.md) (copy/existencias; **does not** include Flota)

## Language (subset)

Visita, WO (wizard), trabajos A–E, piezas, `DESDE_STOCK`, `COMPRA_EXTERNA`, firmas chofer/jefe, `BORRADOR` / `CERRADO`, km.

## Seams

- Inventario apply of `consumos` (same txn; visit must not hydrate SKU/stock).
- Andon consumes envelope, ignores `consumos`.
- Salud recalculates on close.

## Do not load by default

Flota tablero, Logística assignment, dual-stack notify implementation details.


## Approved CHECK target — Slice0 only

Owner 2026-10-01: [ADR016](../../docs/adr/016-visita-check-evolution.md), [contract](../../docs/contracts/CHK-001-contract.md), [SPEC](../../docs/specs/SPEC-CHK-001.md). Extend Visita, CHECK1:1; unique active CHECK per unit, maintenance0..N with legacy slot adapter (partial supersession ADR015). CHECK own condition/PSI/evidence/findings/review/tactile signature; signedimmutable; REQUIRES_WORK selects atomically derived Corrective. CHECK_COMPLETED distinct from VisitaCerrada and no inventory/cadence/maintenance-consumer effects. Explicit requires_reinspection maintenance can append invalidation, ordinary completion does not implicitly invalidate. All as-is code unchanged; no new BC declaration. [R01–05 adoptadas / review](../../docs/engineering-work-orders/CHK-001-slice-0-review.md).


Approved owner update2026-10-01: R01–R05 adoptadas en [Slice0 package](../../docs/engineering-work-orders/CHK-001-slice-0-review.md). Mapping facility por vehículo; MexicoCity día local; daily ACTIVA+Flota EN_PATIO/sinCHECKactivo; hard blockers aceite/refrigerante crítico/fuga severa/llanta severa-ponchadura/PSIcriticalconfig; claim/assign/invalidation en authorizedfacility; physical source Flota enum4 y divergence explícita; retorno overdue<=2hAttention/>2hCritical configurables. Sin decisiones owner pendientes ni código implementado; EWO015 Ready técnico, ejecución retenida.

## Lenguaje visible de tipos de OT

Revisión es CHECK operativo de la unidad; Preventivo y Correctivo son mantenimiento.
Una revisión concluida conserva dictamen/aptitud como concepto distinto; no
representa mantenimiento realizado. A–E son trabajos, no tipos de inspección.
[Glosario](../../context/GLOSSARY.md), [filtro aprobado2026-10-12](../../docs/design/ux-orders-type-filter-v1.md).

## Chequeo diario universal — decisión vigente2026-10-18

**Chequeo diario**: revisión ABC requerida por jornada para todas las unidades.
Daily/Stock dejan de ser clases operativas; no alteran frecuencia ni elegibilidad.
Un chequeo pendiente se conserva, sin duplicarlo; crear CHECK no es abrir
mantenimiento. Viajes activos se conservan. [ADR029](../../docs/adr/029-daily-only-unit-checks.md)
sustituye política configurable de ADR028.


## Análisis de mantenimiento — EWO-063

Implementación local autorizada de ADR030 y SPEC-AN-MTTO-001: módulo
visitas/analysis, registro de servicio externo realizado por unidad, líneas de
trabajo/costo y revisiones auditadas. Servicios externos reconocen gasto al
concluir; refacciones conservan fuente/fecha de Inventario. Ninguna captura
analítica abre/cierra parada, libera unidad o modifica stock. Lecturas de owners
scoped, snapshots por actor y horarios esperados versionados; Admin configura.
No existe todavía ledger completo de motivos/elegibilidad para esta consulta:
porcentajes nulos y horas conocidas, sin inferencia de OT o ausencia de viaje.
Flags apagados por defecto; migración/activación externa no ejecutada.
[Evidencia](../../docs/evidence/EWO-063.md).
