# ADR-018 — MECANICO e identidad atribuible para firma CHECK

## Status

Accepted — owner D07, 2026-10-01. Contrato de identidad aprobado a nivel de requisito; proveedor/configuración real pendientes de integración, sin implementar autenticación en Slice 0.

## Context

AuthGuard actual acepta X-Role y X-User-Id opcional; frontend genera identidad localStorage. No autentica al firmante ni acredita una persona. SUPERVISOR no se renombra automáticamente.

## Decision

- Introducir MECANICO explícito; conservar SUPERVISOR, ADMIN_DIRECTIVO y LOGISTICA.
- Logistics/Admin asignan CHECK dentro de scope autorizado. Mecánico puede reclamar sólo elegibles no asignados cuando policy permita; firma requiere permiso y actor autenticado de confianza del servidor.
- Producción no confía en X-Role/X-User-Id/nombre enviados por navegador. Verificar sesión/token por adapter de identidad (issuer, audience, vigencia y firma según provider). Mapear subject estable a usuario local/identidad y roles/scopes server-side.
- Actor: subject estable, displayName servidor, roles, facilityScopes, authMode y attributionLevel. La firma guarda subject y nombre snapshot; nunca inferir firmante desde createdBy/assignedBy.
- Firma mecánica no identifica al chofer del catálogo ni sustituye su firma de movimiento.
- Stub sólo con AUTH_MODE=DEVELOPMENT_STUB y entorno explícito no productivo. Arranque falla si production+stub; no fallback a headers si falla autenticación real. Artifacts de stub quedan marcados NON_PRODUCTION y no autorizan salida productiva.
- Permiso de invalidación Mecánico/Logística exige motivo; scope según policy configurada. Admin configura/audita, no reescribe CHECK firmado ni obtiene firma mecánica por ser Admin.
- Scheduler usa actor SYSTEM distinto de usuario; no puede firmar.
- Todo acceso de evidencia/firmas verifica recurso y scope server-side; rol UI no es control de seguridad.
- Cambiar roles o scopes no reescribe la identidad histórica firmada. Revocación bloquea nuevas operaciones, conserva audit.

## Auth/permission contract

Contrato exacto y matriz de operaciones en [CHK-001-contract](../contracts/CHK-001-contract.md). La política de claim/invalidation debe configurarse antes de habilitar comandos; ausencia de regla = denegación, no permiso amplio implícito.

## Alternatives Considered

Cambiar etiqueta Supervisor a Mecánico, confiar header, userId aleatorio, firma con nombre escrito: no satisfacen identidad requerida. No instalar proveedor ni iniciar login interactivo en Slice 0.

## Consequences / Risks

Requiere identidad real y autorización por scope antes de piloto productivo. Canvas+hash atribuyen contenido a identidad verificada; no se afirma certificación jurídica universal. Historicos de firmas legacy conservan su procedencia, sin fabricar nivel de confianza.

## Follow-up

Seleccionar/configurar provider y mapping de roles como inputs de despliegue; R03 define scopes de claim e invalidación. EWO-015 debe entregar infraestructura de auth/guards necesaria para endpoints nuevos, con stub explícito sólo en desarrollo.

## Related Artifacts

[SPEC](../specs/SPEC-CHK-001.md), [contrato](../contracts/CHK-001-contract.md), [ADR-016](016-visita-check-evolution.md).

## Ownership

Kernel/Auth para identidad y roles; Mantenimiento para autorización de agregado y firma. Aprobación owner 2026-10-01; sólo documentación en esta ejecución.


## Approved addendum — R01–R05 / Slice0 approval (2026-10-01)

Este addendum conserva el cuerpo histórico; sustituye sus referencias a revisión/decisiones R pendientes conforme a aprobación actual. No autoriza implementar.

### R03 / approval supplement

Contract técnico aprobado. Claim: CHECK unassigned + unidad en authorized facility del MECANICO, con actor confiable/scoped. Logistics/Admin asignan dentro de ese facility; no equipo/SLA/permiso adicional inventado. Explicit invalidation con motivo: MECANICO por hallazgo técnico, LOGISTICA por evento/incidente operacional. Actor/facility no demostrados→deny. Production provider configuration sigue input operativo, no OWNER_DECISION_REQUIRED ni habilitación productiva.

EWO015 entrega puerto/guards/TrustedActor, adapter development detrás de boundary y rechazo production sin adapter confiable. No exige desplegar proveedor externo ni firma/S3; integración real identity y atribución se prueba antes de completar/activar Slice6/8. No fallback de headers en producción.
