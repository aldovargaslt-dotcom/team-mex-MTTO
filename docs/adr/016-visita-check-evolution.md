# ADR-016 — Evolución Visita/CHECK y supersession parcial de ADR-015

## Status

Accepted para las decisiones de owner D08 y la separación CHECK_COMPLETED, aprobadas en esta conversación el 2026-10-01. El contrato técnico y plan de ejecución se entregan para revisión en Slice 0; ningún EWO de implementación está autorizado.

## Context

Visita es la OT real en `public.visitas`; tipos PREDICTIVO/CORRECTIVO, estados BORRADOR/CERRADO. ADR-015 establece un único borrador global y API legacy 201 CREATED / 200 EXISTING_DRAFT. SPEC-CHK-001 requiere un CHECK activo máximo y 0..N mantenimientos simultáneos.

## Decision

- Extender Visita, conservar tabla/IDs y dueño Mantenimiento. CHECK tiene extensión 1:1. No crear agregado WorkOrder paralelo ni catálogo Vehicle.
- Tipo canónico CHECK/PREVENTIVE/CORRECTIVE y lifecycle PENDING/ASSIGNED/IN_PROGRESS/COMPLETED/CANCELLED. Resultado CHECK FIT/FIT_WITH_OBSERVATION/UNFIT es separado.
- Un índice parcial PostgreSQL sobre unidad_id y tipo CHECK con estados activos protege exclusividad. Mantenimientos no comparten esa exclusividad.
- `blocks_operation` es independiente de CORRECTIVE; trabajo que requiera reinspección lo declara explícitamente con `requires_reinspection`.
- CHECK guarda condición/evidencia/hallazgos/dictamen/firma propios. No aplica trabajos A–E, consumo de piezas ni firma CHOFER/JEFE como requisito de cierre.
- CHECK_COMPLETED es evento distinto. Nunca emite VisitaCerrada, consume inventario ni cuenta como mantenimiento realizado. Preservar el envelope y consumidores de VisitaCerrada para mantenimiento.
- Contenido firmado, firma y evidencia son inmutables; invalidación append-only. Expirar por fin de jornada no es invalidar.
- Corregir REQUIRES_WORK prepara una derivación; seleccionar esa clasificación ES el opt-in. Se crea CORRECTIVE y vincula exactamente una vez, atómicamente al cerrar firmado, sin checkbox adicional.
- Mantener adapters legacy explícitos y APIs nuevas separadas. No inferir actores, inicio, aptitud ni jornadas históricas.

### Supersession precisa de ADR-015

Se sustituye su decisión 1 como invariante global: ya no hay máximo un BORRADOR para todo mantenimiento. También se sustituye la instalación del índice global de la decisión 3 y la consulta indiscriminada de borrador de la decisión 5.

Se conservan auditoría no destructiva, creación inicial atómica de mantenimiento, validación server-side y outcomes HTTP legacy de decisiones 2 y 4–7. El adapter legacy conserva un slot de borrador sólo para sus propias creaciones; la API nueva de mantenimiento permite N. El slot NO restringe otras PREVENTIVE/CORRECTIVE ni CHECK. Los detalles están en el [plan de migración](../migrations/CHK-001-visita-backfill-plan.md).

Hasta desplegar esa migración, el índice y código actuales siguen como están. No reescribir el cuerpo histórico de ADR-015 ni eliminar su prueba sin caracterizar el contrato sucesor.

## Alternatives Considered

- Agregado WorkOrder paralelo: descartado por D08, duplica identidad y lifecycle.
- Preservar índice BORRADOR global: viola coexistencia.
- Precheck sin índice: no protege concurrencia.
- Emitir VisitaCerrada para CHECK: produce efectos de mantenimiento falsos.

## Consequences

Reutiliza Visita y sus IDs, preserva maintenance A–E y reglas de piezas. Exige compatibilidad explícita, migraciones, filtros de consultas de mantenimiento e inmutabilidad de hijos. El slot legacy es un puente contractual, no un nuevo invariante de negocio general.

## Risks

Replicas antiguas reinstalan el índice viejo; legacy consultas mezclan CHECK; estado mirror diverge; consumidores interpretan inspección como mantenimiento. Gates y rollback en plan enlazado.

## Follow-up

Revisar contratos, backfill y EWOs antes de Slice 1. No ampliar ownership Andon/Inventario ni declarar BC nuevo.

## Related Artifacts

[SPEC](../specs/SPEC-CHK-001.md), [contrato](../contracts/CHK-001-contract.md), [ADR-015](015-borrador-unico-creacion-atomica-visita.md), [ADR-001](001-visita-cerrada-outbox.md), [ADR-002](002-schema-per-module.md), EWO-015–022.

## Ownership

Owner: Mantenimiento. Fecha: 2026-10-01. Referencia: aprobación del discovery y decisiones D01–D14 del owner en texto pegado de esta conversación; autorización limitada a Slice 0.


## Approved addendum — R01–R05 / Slice0 approval (2026-10-01)

Este addendum conserva el cuerpo histórico; sustituye sus referencias a revisión/decisiones R pendientes conforme a aprobación actual. No autoriza implementar.

### R01/R02 / approval supplement

Paquete/contratos/backfill aprobados por owner el 2026-10-01. EWO015 es técnicamente Ready, ejecución aún retenida por instrucción explícita. No se reabre D08 ni se reescribe ADR015. Facility por vehículo configurable, actor scope y atributos CHECK source calendar son parte de extensión; no estado físico en Visita. Hard blockers R02 resueltos; numeric PSI sigue configuración. Mantener filtros de mantenimiento y CHECK_COMPLETED sin efectos legacy.
