# ADR-031 — Lectura dedicada y paginada de la cola de órdenes

## Status

Accepted para construcción local — el owner aprobó seguir con la implementación el 2026-11-07 ("go ahead"). Alcance acotado a órdenes de mantenimiento; ver Decision. Sin despliegue.

## Context

`/ordenes` arma su cola en el navegador: pide `/unidades`, luego `GET /unidades/:id/visitas` una vez por unidad y `GET /checks` paginado, y mezcla y ordena todo en cliente (`web/src/app/ordenes/page.tsx`). El costo crece con el número de unidades (hallazgo FUNC-01 de [la auditoría Supervisor](../../workspace/discovery/auditoria-supervisor-experiencia-v0.md), severidad 3). Inicio no puede mostrar un conteo de órdenes abiertas sin repetir ese patrón (UX-01).

Reglas que la lectura debe conservar: el Supervisor ve borradores y cerradas; Admin/Directivo solo cerradas (`VisitasService.listByUnidad`); estados solo `BORRADOR` y `CERRADO`; "Abiertas" = borrador con `openedAt`, "Borradores" = sin `openedAt`; los CHECK siguen su propio estado (`PENDING/ASSIGNED/IN_PROGRESS/COMPLETED`).

## Decision

Añadir en el módulo Visitas (sin nuevo Bounded Context ni schema) una lectura de solo lectura:

- `GET /ordenes?cola=abiertas|borradores|cerradas&q=&cursor=&limit=` — **solo órdenes de mantenimiento**, ordenadas por `updatedAt` desc con cursor keyset (`updatedAt` a milisegundos + `id`); `limit` máx. 100.
- Los CHECK **no** entran: usan otro modelo de autenticación (actor confiable con alcance por instalación) y su lectura `GET /checks` ya es paginada. La página sigue combinando ambas listas en el cliente.
- `GET /ordenes/resumen` — conteos por cola (para el resumen de Inicio).
- Mismos permisos y filtros por rol que `GET /unidades/:id/visitas` (Admin/Directivo solo cerradas; Mecánico rechazado); sin escritura, sin nuevos estados, sin costeo.
- La respuesta incluye lo que la fila de la cola usa hoy (unidad, placas, tipo, chofer, trabajosCount, estado). La foto no se repite por fila: el cliente la toma de `/unidades`, que ya consulta una vez; el detalle sigue en `GET /visitas/:id` y `GET /checks/:id`.
- El cliente reemplaza el fan-out por esta lectura; Inicio consume `/ordenes/resumen`.

## Alternatives Considered

### Option A — Mantener el fan-out en cliente
Sin riesgo de API, pero el costo sigue creciendo con la flota y Inicio no puede dar el conteo.

### Option B — Solo un endpoint de conteos
Resuelve Inicio, no la lentitud de `/ordenes`.

### Option C — Tabla/vista materializada de órdenes
Más rápida, pero introduce una segunda fuente de verdad; excesivo para el tamaño actual.

## Consequences

### Positive
- Una petición en lugar de N+1; paginación real; conteo barato para Inicio.

### Negative / Trade-offs
- Nueva superficie de API que debe respetar la visibilidad por rol y mantenerse alineada con `listByUnidad` y con la cola CHECK.

## Risks

- Divergencia de reglas de visibilidad entre la lectura nueva y las existentes; mitigación: pruebas de paridad por rol.
- Unificar CHECK en la misma lista queda como trabajo futuro (requiere reconciliar los dos modelos de autenticación).

## Follow-up

- SPEC corta con AC verificables y EWO aprobado ([EWO-070](../engineering-work-orders/EWO-070.md), Draft).

## Related Artifacts

SPEC: pendiente
Engineering Work Orders: [EWO-070](../engineering-work-orders/EWO-070.md)
Previous ADR: [ADR-001](001-visita-cerrada-outbox.md), [ADR-002](002-schema-per-module.md)

## Ownership

Date: 2026-11-07
Owner: Aldo Vargas (aprobación en sesión)
Approval / decision reference: sesión de desarrollo 2026-11-07; evidencia en docs/evidence/EWO-070.md
