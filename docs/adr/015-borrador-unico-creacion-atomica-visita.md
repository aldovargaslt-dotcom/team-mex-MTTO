# ADR-015 — Borrador único y creación atómica de visita

> Supersession parcial aprobada en Slice 0 (2026-10-01): [ADR-016](016-visita-check-evolution.md) sustituye exclusividad global/índice y selección global de borrador para el modelo nuevo; conserva creación atómica, auditoría no destructiva y contrato legacy mediante adapter. El cuerpo histórico siguiente permanece intacto. Aplicación/migraciones aún no ejecutadas.

## Status

Accepted — aprobado explícitamente por el product owner en Codex el 2026-09-29.

## Context

`POST /unidades/:unidadId/visitas` crea hoy una visita `BORRADOR` vacía; el cliente persiste chofer, km y tipo después mediante `PATCH`. Esto permite borradores huérfanos y no impide que dos clientes creen borradores para la misma unidad. La UI puede detectar un borrador, pero no puede proteger una carrera.

`public.visitas` pertenece a Mantenimiento. La instalación usa PostgreSQL + TypeORM y hoy no hay una política de migraciones de producción documentada; `synchronize` no constituye una política que podamos asumir para resolver datos conflictivos.

## Decision

1. Mantenimiento define el invariante persistente `0..1 BORRADOR por unidad` mediante un índice único parcial sobre `public.visitas(unidad_id)` con predicado `estado = 'BORRADOR'`.
2. Antes de instalar el índice se ejecuta una auditoría explícita agrupada por `unidad_id`. Si encuentra duplicados, el proceso falla y reporta los IDs afectados; no borra, cierra ni escoge un registro automáticamente.
3. La aplicación incorpora una operación idempotente de preparación de este invariante en el camino de bootstrap de base existente, separada de `synchronize`: audita primero y ejecuta `CREATE UNIQUE INDEX IF NOT EXISTS` solo si los datos son compatibles. El DDL exacto y el procedimiento de recuperación quedan registrados en EWO-011/evidencia. No se introduce un tercer motor de base ni se declara una política general de migraciones.
4. `POST /unidades/:unidadId/visitas` recibe un DTO obligatorio con `choferId`, `km` y `tipo`. Autoriza solo `SUPERVISOR`, vuelve a comprobar unidad `ACTIVA`, chofer `ACTIVO` y km persistible, y crea la visita completa dentro de una transacción.
5. La transacción consulta primero el borrador existente. Si existe, devuelve un resultado estable con ese `visitaId` y `outcome: 'EXISTING_DRAFT'`; si crea, devuelve `outcome: 'CREATED'`. En una carrera, la violación del índice se traduce al mismo resultado `EXISTING_DRAFT` después de consultar el ganador.
6. El contrato HTTP responde `200 OK` para `EXISTING_DRAFT` y `201 Created` para `CREATED`; ambos incluyen el detalle accionable de la visita. Errores de validación permanecen `400`, permisos `401/403` y unidad inexistente `404`.
7. `PATCH /visitas/:id`, eliminación y cierre conservan sus responsabilidades. `VisitaCerrada` y el outbox no cambian.

## Alternatives Considered

### Solo precheck en UI o servicio

Mejora el caso normal, pero dos solicitudes concurrentes todavía pueden insertar filas distintas.

### Lock pesimista sobre la unidad sin índice

Puede serializar esta ruta, pero otros escritores o cambios futuros podrían violar el invariante. La base debe ser autoritativa.

### `POST` vacío seguido de `PATCH`

Conserva el contrato actual, pero deja borradores huérfanos ante error o abandono y no cumple atomicidad.

### Eliminar o conservar automáticamente el borrador más reciente

Es una decisión destructiva de producto/operación no autorizada. La auditoría debe escalar los duplicados.

### Añadir framework de migraciones completo

Excede este corte y pretendería decidir la política general de producción. Este ADR limita la preparación al índice requerido y deja esa deuda visible.

## Consequences

### Positive

- La base protege el invariante bajo concurrencia.
- Crear/reintentar siempre produce una salida accionable y no deja borradores vacíos.
- Datos preexistentes conflictivos se vuelven visibles sin pérdida silenciosa.

### Negative / Trade-offs

- El contrato de creación deja de aceptar body vacío.
- El bootstrap puede rechazar una base con duplicados hasta que operación los resuelva explícitamente.
- La preparación focal del índice no resuelve la política global de migraciones del producto.

## Risks

- Diferencias entre códigos de error PostgreSQL/adapters deben caracterizarse sin depender de texto localizado.
- Un fallo después de una violación concurrente requiere consultar el borrador ganador fuera de la transacción abortada.
- Ambientes con permisos sin `CREATE INDEX` fallarán de forma visible y requerirán intervención de despliegue.

## Follow-up

- Definir en operación, caso por caso, la conservación de duplicados encontrados antes de reintentar la instalación; no forma parte de EWO-011.
- Diseñar por separado una política general de migraciones si producción deja de depender de `synchronize`.

## Related Artifacts

SPEC: [SPEC-ORDENES-FICHA-UNIDAD-001](../specs/ordenes-ficha-unidad-v0.md)  
Engineering Work Orders: [EWO-011](../engineering-work-orders/EWO-011.md), [EWO-012](../engineering-work-orders/EWO-012.md), [EWO-013](../engineering-work-orders/EWO-013.md)  
Previous ADR: [ADR-000](000-thin-kernel.md), [ADR-001](001-visita-cerrada-outbox.md), [ADR-002](002-schema-per-module.md)

## Ownership

Date: 2026-09-29  
Owner: Mantenimiento  
Approval / decision reference: aprobación explícita del product owner en Codex, 2026-09-29.
