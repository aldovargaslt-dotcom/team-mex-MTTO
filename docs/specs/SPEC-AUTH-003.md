# SPEC-AUTH-003 — Permisos configurables por rol (Fase 1)

## Status

**Proposed**, 2026-11-07. Documentación solamente: no autoriza código, esquema, migraciones ni cambios de acceso. Implementa la dirección de [ADR-032](../adr/032-permisos-configurables-por-rol.md) (Accepted). Extiende [SPEC-AUTH-002](SPEC-AUTH-002.md) (administración de usuarios); no modifica [SPEC-AUTH-001](SPEC-AUTH-001.md). Shaping: [roles-permisos-configurables-v0](../../workspace/shaping/roles-permisos-configurables-v0.md). OQ-1…OQ-5 resueltas (2026-11-07). Siguiente: [EWO-067](../engineering-work-orders/EWO-067.md) (Draft, sin aprobación de ejecución).

## Problem

El acceso se decide por rol fijo (`@Roles(...)` y llamadas `authorize(...)` dentro de servicios). No se puede, sin editar código, hacer que un rol (p. ej. Mecánico) sea «como Supervisor sin costos». Hoy en esta ubicación solo se usa SUPERVISOR; se necesita dejar la capacidad lista sin cambiar el acceso actual de nadie.

## Goals

- Catálogo de permisos y matriz rol → permisos editable por ADMIN_DIRECTIVO, con auditoría.
- Migración que **no cambia el acceso efectivo** de ningún rol ni endpoint.
- Base para conceder/retirar capacidades (costos, edición de kits) por rol después.

## Non-goals

Crear roles nuevos definidos por el usuario (Fase 2). Configurar o recortar el rol Mecánico ahora. Cambiar `facilityScopes`, OIDC, `VisitaCerrada` o reglas de dominio no relacionadas con acceso (p. ej. políticas de salida, scope de análisis por patio, elegibilidad de CHECK). Pantalla definitiva de administración (puede ser un corte posterior; ver OQ-4).

## Actors

ADMIN_DIRECTIVO edita la matriz. Todos los roles son sujetos de la matriz.

## Inventario de acceso actual (evidencia, 2026-11-07)

Resumen por controlador a partir de `@Roles(...)`; el EWO debe generar el inventario exacto **por endpoint** (incluidos verbos) como primer entregable y congelarlo como línea base de las pruebas de equivalencia.

| Área (controlador) | Roles hoy |
|---|---|
| Usuarios (`auth/users`) | ADMIN |
| Catálogo de alertas | ver, editar umbrales y vista previa: SUP, ADMIN, LOG · alertas activas: SUP, ADMIN · crear/activar: ADMIN |
| Documentos de vehículo | consulta póliza vigente: ADMIN, LOG, MEC · alta de versión: ADMIN |
| Choferes | ADMIN |
| Logística | LOG, ADMIN |
| Flota | LOG, ADMIN |
| Notificaciones | SUP, ADMIN, LOG |
| Visitas | base: SUP, ADMIN · operaciones de escritura: SUP |
| Análisis de mantenimiento | SUP, ADMIN |
| Inventario (operación) | SUP, ADMIN |
| Inventario (costos) | SUP, ADMIN |
| Unidades | lectura: SUP, ADMIN · escritura: ADMIN |
| Tipos de vehículo | ADMIN |
| Andon | base: SUP, ADMIN · algunas acciones: SUP · otras: ADMIN, SUP |
| Salud | lectura: SUP, ADMIN · configuración: ADMIN |

Estado de implementación (2026-11-07): [EWO-067](../engineering-work-orders/EWO-067.md) (línea base y catálogo), [EWO-068](../engineering-work-orders/EWO-068.md) (matriz en `auth`, sombra) y [EWO-069](../engineering-work-orders/EWO-069.md) (guard sombra) implementados y verificados localmente; **ningún endpoint decide aún por permisos** (enforcement pendiente).

Línea base ejecutable (EWO-067): 163 endpoints, de los cuales 121 con `@Roles` y 42 sin `@Roles` (autenticados; su control, si existe, vive en servicios), más 135 sitios de comprobación de rol dentro de servicios. Ver `api/src/auth/access-baseline/` y [evidencia](../evidence/EWO-067.md).

**Autorización dentro de servicios (también debe cubrirse):** órdenes canónicas/CHECK (`canonical-orders.service`: combinaciones MEC/LOG/ADMIN/SUP y `SYSTEM`), costos de inventario (`inventory-costs.service.authorize`, con variante admin para correcciones), alcance de análisis (`analysis-scope`), retenciones de readiness (autorización por patio) y política de salida de Flota. Algunas de estas mezclan **rol** con **alcance por patio o estado del dominio**; el permiso sustituye solo la parte de rol, nunca la regla de patio/estado.

## Functional Behavior

### F-01 · Catálogo de permisos
Lista cerrada en código, nombres estables `area.accion`. Propuesta inicial en OQ-1. Un permiso nuevo en código no se asigna a ningún rol salvo siembra explícita.

### F-02 · Matriz rol → permisos
Tabla en schema `auth` con versión y auditoría antes/después (patrón ADR-021). Lectura y escritura solo para ADMIN con identidad confiable. Cada solicitud usa la matriz vigente, sin caché de roles.

### F-03 · Siembra equivalente a hoy
Para cada permiso del catálogo, la siembra concede el permiso exactamente a los roles que hoy pasan el chequeo equivalente. Resultado verificable: para toda combinación (rol, endpoint/operación) el resultado permitido/denegado antes y después es idéntico.

### F-04 · Uso en endpoints y servicios
Los endpoints y `authorize(...)` exigen permisos. `@Roles` convive durante la transición y se retira por endpoint solo cuando su prueba de equivalencia pasa. Reglas de patio, estado y `SYSTEM` se conservan.

### F-05 · Invariantes de seguridad
- Siempre queda al menos un ADMIN activo con `usuarios.administrar`; la API rechaza cambios que lo violen.
- El permiso `usuarios.administrar` de ADMIN no puede quitarse a todos.
- Servidor oculta y rechaza; UI solo refleja. Sin permiso financiero no se revelan importes (AC-20 de SPEC-INV-001).
- Roles de proveedor OIDC no otorgan permisos (USR-01 de SPEC-AUTH-002).

### F-06 · Administración
API para leer/actualizar la matriz con control de versión (rechazo de edición concurrente). Pantalla de administración: ver OQ-4. Sin configuración de Mecánico en este corte.

## Business Rules

- Equivalencia primero: ningún comportamiento nuevo hasta demostrar cero cambios de acceso.
- Fallo cerrado: permiso desconocido o matriz ilegible → denegar y registrar, nunca conceder.
- Ver costos y capturar/completar/corregir costos son permisos distintos.
- Cambios de matriz se auditan (quién, cuándo, antes/después) y aplican en la siguiente solicitud; no revocan una solicitud ya en ejecución (como ADR-021).

## Failure Behavior

Matriz no disponible: denegar permisos configurables y mantener únicamente lo que el diseño defina como mínimo seguro (OQ-5); error claro, sin revelar la matriz. Edición concurrente: 409 con versión actual. Intento de dejar sin ADMIN: 422 con mensaje.

## Acceptance Criteria

| ID | Criterio |
|---|---|
| AC-P01 | Dado el inventario línea base de endpoints/operaciones, tras la migración cada par (rol, operación) produce el mismo permitido/denegado que antes (prueba por endpoint). |
| AC-P02 | Dado SUPERVISOR, conserva exactamente su acceso actual (incluidas operaciones de escritura exclusivas de SUPERVISOR). |
| AC-P03 | Dado un permiso del catálogo sin asignar, ningún rol lo tiene; la operación se deniega. |
| AC-P04 | Dada una edición de la matriz por ADMIN, se guarda con versión incrementada y auditoría antes/después. |
| AC-P05 | Dado un usuario no ADMIN o identidad no confiable, no puede leer ni editar la matriz. |
| AC-P06 | Dada una edición con versión obsoleta, se rechaza con 409 sin perder la edición vigente. |
| AC-P07 | Dado un cambio que dejaría sin ADMIN activo con `usuarios.administrar`, se rechaza. |
| AC-P08 | Dado un cambio de matriz, la siguiente solicitud lo refleja sin reiniciar ni caché de rol. |
| AC-P09 | Dado un rol sin `costos.ver`, la API no devuelve importes y la UI no los muestra ni permite capturar (AC-20 SPEC-INV-001). |
| AC-P10 | Dadas operaciones con regla de patio/estado, quitar el permiso deniega; concederlo no omite la regla de patio/estado. |
| AC-P11 | Dado el rol MECANICO, su acceso inicial es idéntico al de hoy; no se recorta ni amplía en este corte. |
| AC-P12 | Dada una matriz ilegible o permiso desconocido, se deniega y registra; nunca se concede. |
| AC-P13 | Dado un endpoint nuevo sin permiso declarado, falla la verificación de arranque o CI (no queda abierto por omisión). |
| AC-P14 | Dado el cambio, `VisitaCerrada`, `facilityScopes` y flujo OIDC permanecen sin cambios. |

## Dependencies and ADRs

ADR-032 (Accepted), ADR-021, ADR-000, ADR-002 (matriz dentro de `auth`; sin FKs cruzadas), SPEC-AUTH-001/002. Consumidores futuros: ADR-031/SPEC-INV-002 (`inventario.kits.editar`), ADR-026/SPEC-INV-001 (costos). Migración Auth separada del historial CHECK, sin ejecución automática (como ADR-021).

## Open Questions

Resueltas el 2026-11-07: el dueño respondió «Let's go with your recommendations» a OQ-1…OQ-5. Quedan **adoptadas las propuestas** de la tabla; el catálogo de OQ-1 puede refinarse al generar el inventario por endpoint (cambios de nombres/granularidad se registran en el EWO, sin reabrir la decisión).

| ID | Decisión | Resolución |
|---|---|---|
| OQ-1 | Catálogo inicial de permisos | Adoptado: `usuarios.administrar`, `catalogos.administrar`, `visitas.ver`, `visitas.escribir`, `visitas.cerrar`, `inventario.ver`, `inventario.operar`, `inventario.kits.editar`, `costos.ver`, `costos.capturar`, `costos.completar`, `costos.corregir`, `andon.ver`, `andon.operar`, `salud.ver`, `salud.configurar`, `flota.operar`, `logistica.operar`, `alertas.ver`, `alertas.editar`, `documentos.vehiculo`, `notificaciones.ver`, `analisis.ver`, `check.operar`. |
| OQ-2 | Roles internos (`SYSTEM`) | Fuera de la matriz; no es un rol de usuario. |
| OQ-3 | Checks combinados rol+patio+estado | El permiso sustituye solo la parte de rol (AC-P10). |
| OQ-4 | Pantalla de administración | Este corte: API + pruebas. Pantalla en corte aparte con UX spec. |
| OQ-5 | Mínimo seguro si la matriz no carga | Denegar todo salvo `usuarios.administrar` para ADMIN. |

## Risks and assumptions

- Supuesto: el inventario por `@Roles` + `authorize()` es completo; el EWO debe demostrarlo con un barrido automático (AC-P13).
- Riesgo: omitir una autorización dentro de servicios (hay muchas en `canonical-orders.service`); mitigado por línea base por operación y prueba de equivalencia.
- Riesgo: catálogo demasiado fino o grueso; mitigado por OQ-1 y por poder dividir permisos después sin romper la siembra.
- Riesgo: ADMIN se bloquea a sí mismo; mitigado por F-05 y OQ-5.

## Traceability

SPEC: esta. ADR: 032, 021. Evidencia de partida: `api/src/auth/*`, `@Roles` en controladores, `authorize(...)` en servicios (2026-11-07). EWO: ninguno.
