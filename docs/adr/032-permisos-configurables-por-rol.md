# ADR-032 — Permisos configurables por rol (Fase 1)

## Status

Proposed. Documentación solamente: no autoriza código, esquema, migraciones ni cambios de acceso. Requiere aceptación del dueño antes de cualquier SPEC/EWO. Toca Kernel/Auth.

## Context

Los roles son un enum fijo (`Rol`: `SUPERVISOR`, `ADMIN_DIRECTIVO`, `LOGISTICA`, `MECANICO`) y `auth.users` los restringe con un CHECK. Los endpoints se protegen con `@Roles(...)`; no hay permisos finos. El dueño quiere poder configurar más adelante, sin tocar código, que un rol (p. ej. Mecánico) se comporte «como Supervisor pero sin modificar costos». Hoy en esta ubicación solo existe el rol Supervisor, así que **no hay cambio de comportamiento que entregar ahora**; se busca dejar la capacidad preparada. Ver [shaping](../../workspace/shaping/roles-permisos-configurables-v0.md). ADR-000 (kernel delgado) y [ADR-021](021-user-access-directory.md) (directorio de accesos, auditoría, versión) acotan el diseño.

## Decision

1. **Catálogo de permisos en código**, con nombres estables y breve (acciones que hoy ya se distinguen), p. ej. `inventario.ver`, `inventario.entrada`, `inventario.kits.editar`, `costos.ver`, `costos.capturar`, `costos.completar`, `costos.corregir`, `visita.cerrar`, `usuarios.administrar`. Ver y capturar/corregir costos son permisos separados.
2. **Tabla en schema `auth`** que mapea rol → permisos, con versión y auditoría antes/después (patrón ADR-021). Solo `ADMIN_DIRECTIVO` la edita. Cada solicitud resuelve la matriz vigente, sin caché de roles.
3. **Siembra equivalente a hoy**: los cuatro roles reciben exactamente los permisos que sus `@Roles` actuales les dan. Migrar no cambia el acceso de nadie. `SUPERVISOR` conserva todo lo que tiene; **no se recorta ni se configura el Mecánico en este corte** (dueño, 2026-11-07).
4. **Endpoints exigen permisos**, no roles. `@Roles` convive durante la transición y se retira por endpoint solo tras una prueba de equivalencia de acceso.
5. **Fallo cerrado**: un permiso nuevo en código nace sin asignar salvo siembra explícita. Servidor oculta y rechaza; la UI solo refleja (AC-20 de SPEC-INV-001: sin permiso financiero no se revelan importes).
6. **Invariantes**: al menos un `ADMIN_DIRECTIVO` activo conserva `usuarios.administrar`; el alcance por patio (`facilityScopes`) no cambia; autorización sigue en base de datos, no en claims del proveedor OIDC.
7. **Fuera de este ADR (Fase 2)**: crear roles nuevos definidos por el usuario. Requeriría sustituir el CHECK del enum por una tabla de roles en `auth`; se decide en un ADR posterior tras usar la Fase 1.

## Alternatives Considered

### Option A — Mantener roles fijos y agregar rol por cada variante
Simple, pero cada variante exige código, migración y despliegue. No cumple «configurar más adelante».

### Option B — Roles personalizados de inmediato
Máxima flexibilidad; obliga a cambiar el CHECK, el enum y todos los `@Roles` a la vez, con más riesgo de regresión de acceso. Pospuesta (Fase 2).

### Option C — Banderas por usuario en lugar de por rol
Flexible pero difícil de auditar y de mantener coherente; multiplica la configuración. No elegida.

## Consequences

### Positive
- Mecánico (u otro rol) se configura sin despliegue cuando haga falta.
- Cambios de acceso auditables; misma base de ADR-021.
- Kits (ADR-031) y costos de mecánico se expresan como permisos, no como enmiendas de ADR.

### Negative / Trade-offs
- Nueva tabla y pantalla de administración (cuando se construya).
- Dos mecanismos (`@Roles` y permisos) mientras dura la migración.
- Una matriz mal configurada puede bloquear funciones; mitigado con siembra, auditoría e invariante de administrador.

## Risks

Regresión de acceso al migrar (pruebas de equivalencia por endpoint antes de retirar `@Roles`). Inflación de permisos (catálogo corto y orientado a acciones). Dependencia de la base para autorizar, ya aceptada en ADR-021.

## Follow-up

Aceptación del dueño; SPEC con criterios de aceptación y matriz inicial por endpoint; EWO con TDD; definir la lista de permisos del Mecánico **solo cuando** exista ese rol operando en una ubicación (R-2/R-3 del shaping).

## Related Artifacts

SPEC: pendiente.
Shaping: [roles-permisos-configurables-v0](../../workspace/shaping/roles-permisos-configurables-v0.md).
Engineering Work Orders (`EWO-xxx`): ninguno.
Previous ADR: [ADR-000](000-thin-kernel.md), [ADR-021](021-user-access-directory.md), [ADR-026](026-inventario-costos-historicos.md), [ADR-031](031-inventario-kits-por-tipo.md).

## Ownership

Date (YYYY-MM-DD): 2026-11-07
Owner: dueño del producto (pendiente de aceptación)
Approval / decision reference: respuestas del chat 2026-11-07 (Fase 1 primero; no construir ahora la configuración del Mecánico; solo hay Supervisor en esta ubicación; ADR solicitado). La aceptación de esta arquitectura **no** está registrada.
