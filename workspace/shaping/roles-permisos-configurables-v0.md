# Roles y permisos configurables (Mecánico ≈ Supervisor sin costos)

Estado: **PROPUESTA** de shaping, 2026-11-07. No es DECISIÓN, SPEC, ADR ni EWO. Documentación únicamente: sin cambios de runtime, esquema ni permisos. Toca Kernel/Auth; **escalar** antes de ejecutar (ICM: ownership/arquitectura).

## Petición del dueño

Hoy SUPERVISOR funciona como supervisor de mantenimiento o mecánico y es persona de confianza. Más adelante se quiere configurar los permisos del Mecánico: «como un Supervisor, pero sin permiso para modificar costos» u otras restricciones. Se quiere poder **crear/configurar roles**.

## Evidencia del código (2026-11-07)

- Roles = enum fijo `Rol` (`SUPERVISOR`, `ADMIN_DIRECTIVO`, `LOGISTICA`, `MECANICO`) en `api/src/auth/roles.enum.ts`.
- La tabla `auth.users` restringe `roles` con un CHECK a esos cuatro valores; agregar un rol exige migración.
- Los endpoints se protegen con `@Roles(...)` por rol, p. ej. `inventory-costs.controller.ts` → `SUPERVISOR`, `ADMIN_DIRECTIVO`. No existe capa de permisos finos.
- ADR-021: ADMIN administra accesos; cada solicitud resuelve el estado actual sin caché de roles; auditoría antes/después; versión de registro.
- `MECANICO` existe, se usa en órdenes/CHECK y no tiene acceso a inventario ni costos.

## Problema de diseño

Con roles fijos, «Mecánico sin costos» obliga a editar código cada vez que cambie una regla, y «roles creados por el usuario» obliga a cambiar el CHECK, el enum y cada `@Roles`. Hay que separar **rol** (etiqueta que se asigna a personas) de **permiso** (lo que una acción exige).

## Dirección propuesta (por fases)

### Fase 1 — Catálogo de permisos con mapeo configurable (recomendada)
- Catálogo **en código** de permisos con nombre estable, p. ej. `inventario.ver`, `inventario.entrada`, `inventario.kits.editar`, `costos.ver`, `costos.capturar`, `costos.completar`, `costos.corregir`, `visita.cerrar`, `usuarios.administrar`.
- Los endpoints exigen **permisos**, no roles. `@Roles` se conserva durante la transición.
- Tabla `auth` rol → permisos, editable por ADMIN con auditoría y versión (mismo patrón de ADR-021). Los cuatro roles actuales se **siembran con valores equivalentes a hoy**, de modo que el comportamiento no cambia al migrar.
- Mecánico = permisos de Supervisor menos `costos.*`, configurable sin despliegue.
- Sin cambiar quién es ADMIN ni el invariante «último administrador».

### Fase 2 — Roles personalizados
- Permitir crear roles nuevos (nombre + conjunto de permisos), asignables a usuarios. Requiere reemplazar el CHECK del enum por referencia a la tabla de roles dentro del schema `auth`.
- Solo después de validar la Fase 1 con uso real.

### Reglas transversales
- Los permisos **ocultan y rechazan** en servidor; la UI solo refleja (AC-20 de SPEC-INV-001: sin permiso financiero no se revelan importes).
- Sin permisos de negocio implícitos por rol de proveedor OIDC; autorización sigue en base de datos.
- Un permiso nuevo en código nace sin asignar, salvo la siembra explícita; fallo cerrado.
- Cambios de matriz auditados (quién, cuándo, antes/después) y aplicados en la siguiente solicitud (sin caché, como ADR-021).
- Permiso separado para **ver** costos y para **capturar/corregir**, para poder dar al Mecánico captura sin lectura de promedios, o al revés.

## Efecto en otros trabajos

- **Costos capturados por mecánico** (conversación previa): deja de ser una enmienda estrecha a ADR-026; pasa a ser conceder `costos.capturar` al rol Mecánico cuando el dueño lo decida.
- **Kits** (ADR-031): «Supervisor y Admin editan kits» se expresa como `inventario.kits.editar`; el Mecánico puede aplicar kits sin poder editarlos.
- No cambia el envelope `VisitaCerrada` ni la propiedad de datos entre schemas (ADR-002).

## Preguntas abiertas

| ID | Pregunta | Propuesta |
|---|---|---|
| R-1 | ¿Fase 1 antes de roles personalizados? | Sí. |
| R-2 | ¿Qué hace hoy el Mecánico fuera de órdenes/CHECK? Lista inicial de permisos del Mecánico. | A definir con el dueño; punto de partida: Supervisor sin `costos.*` ni `usuarios.administrar`. |
| R-3 | ¿Puede el Mecánico ver existencias y cantidades? | Propuesta: sí; sin importes. |
| R-4 | ¿Quién edita la matriz: solo ADMIN? | Sí, ADMIN_DIRECTIVO. |
| R-5 | ¿Permisos por patio (facility scope) además de por rol? | Se conserva el alcance por patio actual; no se redefine. |
| R-6 | ADR requerido (Kernel/Auth, ADR-000 kernel delgado, ADR-021). | Redactar ADR-032 Proposed tras aceptar la dirección. |
| R-7 | Migración de usuarios existentes. | Siembra equivalente a hoy; sin cambio de acceso al migrar; prueba de equivalencia por endpoint. |

## Riesgos

- Autorización mal configurada por un ADMIN (p. ej. quitar `costos.ver` a todos): mitigar con auditoría, valores por defecto y protección de `usuarios.administrar` en al menos un ADMIN.
- Regresión de acceso al migrar de `@Roles` a permisos: mitigar con pruebas de equivalencia endpoint por endpoint antes de retirar `@Roles`.
- Inflación de permisos: empezar con un catálogo corto, orientado a acciones que hoy se distinguen.

## Siguiente paso

Confirmar R-1/R-2/R-3 con el dueño; luego redactar ADR-032 (Proposed) y, tras aceptación, SPEC con criterios de aceptación y EWO.
