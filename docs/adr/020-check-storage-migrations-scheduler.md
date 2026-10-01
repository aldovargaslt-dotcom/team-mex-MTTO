# ADR-020 — Storage privado, migraciones TypeORM y scheduler CHECK

## Status

Accepted — owner D13, 2026-10-01. Decisión arquitectónica; scripts/configuración exactos se entregan en plan para revisión, no ejecución.

## Context

Fotos/firmas legacy son Data URL. TypeORM synchronize default true; no migrations versionadas. Outbox tiene handlers síncronos, sin runner de pendientes. No daily scheduler existente.

## Decision

### Storage

ObjectStoragePort S3-compatible privado. Adapter configurable development/self-host (MinIO) y adapter production por entorno; nada público por default. Server-generated keys, uploads temporales, verificación contenido/MIME/bytes/SHA256 y acceso firmado de corta duración tras autorización. DB guarda key+metadata, no blobs.

Firmados no tienen eliminación automática en V1. Cleanup sólo objetos temporales sin referencias confirmadas, coordinado con registro/cierre. Presigned uploads sólo temporales; final immutable namespace/objectVersionId queda referenciado en snapshot y lecturas, nunca latest mutable. No sobrescribir keys/versiones firmadas, no reglas de bucket lifecycle que borren firmados. Metadata/reference/hash y snapshot se congelan; credenciales/config nunca se incluyen en evidencias o reportes.

S3 no participa en txn SQL: completar staging antes de firma; closure atómico en SQL con objetos verificados. Failure rollback SQL no borra evidencia referenciada. No prometer atomicidad distribuida ni immutability del proveedor sin controles de permisos/versiones.

### Migrations

TypeORM versionadas y runner explícito, no synchronize para controlled deployment. DataSource de migrations usa mismas opciones de conexión, sin import de AppModule/seed/bootstrap que instale índices legacy. Schema y backfill ensayados en base descartable; expand → audit/backfill → constraints → rollout → contract. Plan [CHK-001-visita-backfill-plan](../migrations/CHK-001-visita-backfill-plan.md).

Producción DB_SYNCHRONIZE=false y DB_DROP_SCHEMA=false verificados; versión antigua incompatible no puede reinstalar índice global. Down después de datos nuevos requiere forward recovery o deshabilitar writes, jamás eliminación de registros firmados.

### Scheduler / delivery

GenerateDailyVehicleChecks es comando idempotente de aplicación, scheduler sólo lo invoca con facility+operational_date y actor SYSTEM. UNIQUE unidad+jornada + índice CHECK activo funcionan entre réplicas; sin mutex sólo de proceso. Configuración de horario/elegibilidad obligatoria antes de habilitar.

Outbox CHECK independiente del envelope VisitaCerrada. Ledger y envelope en txn de agregado; handlers locales usan mismo manager. Notificaciones y replay requieren idempotency eventId, audience authorized y delivery durable; no I/O remoto dentro de closure SQL. Runner de pendientes CHECK puede recuperar mensajes al reiniciar; alcance restringido a eventos nuevos, no refactor notify dual-stack.

## Alternatives Considered

Data URL CHECK en DB, synchronize deployment, borrar evidencia firmada por lifecycle de bucket, cron crea directo saltando comando: rechazadas. No storage provider nuevo instalado en Slice 0.

## Consequences / Risks

Object orphaning, TTL temporal y locks de cleanup deben probarse. Config production y permisos privados son inputs reales. Migraciones coordinadas y replay son infraestructura nueva acotada.

## Follow-up

Definir conexión S3/MinIO, key management, runner schedule y credenciales por entorno sin secretos en repo; habilitar sólo tras checks de auth/storage/migrations. Guardar hashes del lado servidor.

## Related Artifacts

[Contrato](../contracts/CHK-001-contract.md), [SPEC](../specs/SPEC-CHK-001.md), [plan](../migrations/CHK-001-visita-backfill-plan.md).

## Ownership

Mantenimiento owns CHECK; infraestructura owns adapters/runtime; cada módulo escribe su schema. Aprobación owner D13, 2026-10-01. Slice 0 documental únicamente.


## Approved addendum — R01–R05 / Slice0 approval (2026-10-01)

Este addendum conserva el cuerpo histórico; sustituye sus referencias a revisión/decisiones R pendientes conforme a aprobación actual. No autoriza implementar.

### R01/R05 / approval supplement

Arquitectura/plan aprobados, ejecución retenida. Facility configurable por vehículo y un facility inicial permitido. Daily eligibility: administrativa ACTIVA + fuente física Flota EN_PATIO disponible para preparación + ausencia de CHECK activo; nunca EN_RUTA/EN_TALLER/INACTIVA ni fuente física desconocida/inconsistente. Scheduler horario configurable de despliegue; cualquier invocación usa jornada local America/Mexico_City y command idempotente, no TTL ni duplicate generation.

Config inicial de escalación retorno2h proviene de R05 owner, se persiste/versiona por dueño Alertas/Logística; no literal hard-coded en engine. Rangos PSI se provisionan por unidad/tipo, sin mock defaults. Migrations foundation Slice1 no implementa physical/doc/storage/scheduler de slices posteriores; plan global detalla secuencia y gates por slice.
