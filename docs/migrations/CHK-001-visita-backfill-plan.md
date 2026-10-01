# CHK-001 — Plan de migración y backfill de Visita

## Estado y autoridad

Approved — plan Slice0 aprobado por owner 2026-10-01; ninguna migration creada como código ni ejecutada. Decisiones aprobadas: [ADR-016](../adr/016-visita-check-evolution.md), [ADR-020](../adr/020-check-storage-migrations-scheduler.md). [Contrato](../contracts/CHK-001-contract.md) define writers/compatibilidad. No asumir base de producción ni conexión real desde este informe.

## Objetivo / compatibilidad final

public.visitas sigue siendo ID/tabla OT. Nuevas columnas tipo/status/version canónicas y extensión CHECK1:1. No duplicar aggregate ni renumerar IDs/folios históricos. Preservar relaciones de visitas/trabajos/piezas/fotos/firmas legacy.

Compatibility adapter:
1. POST /unidades/:unidadId/visitas conserva body obligatorio choferId/km/tipo y outcomes 201 CREATED / 200 EXISTING_DRAFT.
2. El existente es exclusivamente el borrador con legacy_compat_draft=true (slot de ese adapter). Nunca devolver arbitrariamente otro de N mantenimientos.
3. Nuevas creaciones de ese endpoint usan slot=true. API nueva mantenimiento usa false y permite N; CHECK siempre false. Idempotency key nueva de mantenimiento identifica un request, no “un mantenimiento por unidad”.
4. Un índice único del slot legacy conserva carreras/outcomes únicamente para adapter; no limita N órdenes nuevas. Cierre/eliminación libera slot en misma transacción.
5. GET/PATCH/DELETE/cerrar legacy rechazan CHECK y no enumeran registros sin representación legacy. New maintenance can project BORRADOR/CERRADO for open/completed; CANCELLED no se finge BORRADOR, se consulta por API canónica.
6. Legacy estado es mirror nullable controlado por único writer: mantenimiento active→BORRADOR, completed→CERRADO, cancelled→NULL; CHECK→NULL. CHECK además conserva resultado, no false legacy CLOSED. Nunca escribir estado por su cuenta desde un endpoint.
7. Old client listado/hub que asuma una sola orden trabaja sobre slot legacy; nuevo listado canónico y hub modernizado muestran todas las órdenes mantenimientos abiertas. Desplegar esos callers antes de activar UI nueva de coexistencia; el requisito N ya existe en nueva API, no se mantiene la vieja restricción global.
8. SUPERVISOR legacy permisos/reglas A–E, piezas, foto≤8, CHOFER/JEFE y VisitaCerrada permanecen. Delete legacy draft mantiene semántica existente sólo para mantenimiento no firmado/consumido; no puede alcanzar un CHECK/hijo firmado.
9. Reemplazar test O-04 global con dos caracterizaciones: slot legacy atómico y coexistencia N por API nueva+CHECK único. No quitar cobertura.

## Inventario previo — sólo consultas autorizadas en ejecución futura

Guardar counts por unidad/tipo/estado, IDs, relaciones y versión schema. Preflight no destructivo:
- duplicates BORRADOR por unidad; old partial index definición/validez y dueño/permisos;
- null/unknown tipo, estado, unidad_id; orphan relaciones y child signatures;
- closed rows sin cerradoAt o con payload outbox incompatible;
- DTO/code callers que consultan primer BORRADOR, historial CERRADO o ultimoKmCerrado;
- tablas schemas/extension y version TypeORM real, conexiones/URL y permisos de migration.
No imprimir secretos ni Data URL de firmas/fotos. Emitir sólo metadata/IDs autorizados; proteger evidencia.

Si incompatibles: abortar antes de contract/backfill, producir lista de reparación aprobable sin cerrar/eliminar/escoger registros automáticamente. EWO-011 no garantiza que la DB real aún cumpla; auditoría se vuelve a ejecutar.

## Secuencia TypeORM versionada

Labels M001–M006 son pasos de plan, no nombres de archivos ya creados. Al implementar, cada clase MigrationInterface lleva timestamp TypeORM de creación y registro en DataSource aislado. No reutilizar synchronize para actualizar columnas/enum/índices.

| Paso lógico (aplica por slice dueño) | up aprobado / gate | rollback seguro |
|---|---|---|
| M001 Expand | Agregar work_order_type/status/version, legacy_compat_draft, assignment/time/block/source fields nullable donde backfill requiera; estado admite NULL; tipos nuevos separados de enums legacy. Crear CHECK extension y coordinación/config foundation Visita/facility/identidad; las tablas condition/tires/evidence/signature/findings/audit/daily/prepared-link se introducen en migration del slice dueño; actuales siguen funcionando | Si no hay datos nuevos, down sólo objetos vacíos y compatible; con nuevos datos no drop |
| M002 Backfill auditado | Mapear tipos/estados conocidos; marca slot legacy en BORRADOR existentes; rows con ambigüedad reportadas, no inferidas. Establecer constraints NOT VALID donde proceda y validar después | Restaurar columnas legacy sólo desde mapping reversible, no reinterpretar nuevo contenido |
| M003 Constraints nuevas | Instalar CHECK-active index y slot legacy index; daily UNIQUE; subtype/status constraints foundation. En slices dueños posteriores, child source UNIQUE, derivación corrective UNIQUE y protección hijos firmados/triggers/DELETE RESTRICT adecuado | No retirar CHECK index mientras creación nueva habilitada; preservar firma/object refs |
| M004 Contract writers/bootstrap | Desplegar versión que no instale old index, adapters/queries filtradas y todos writers dual-update coherentes. Parar/drain replicas antiguas, auditar que ninguna pueda reinstalar old index | Pausar writes y volver sólo a versión migration-aware, no binario antiguo sobre schema nuevo |
| M005 Retirar global | Tras evidencia de nuevos constraints y ausencia de writers viejos, DROP sólo visitas_un_borrador_por_unidad_uidx. Revisar equivalent indexes, no drop genérico por nombre aproximado. Habilitar nueva API N/ CHECK flags luego de audit | Recrearlo es IMPOSIBLE si N borradores ya existen; no borrar para rollback. Forward recovery/disable feature |
| M006 Validate / activate | Version columns requeridas para nuevas rows, VALIDATE constraints; flags por capability; fixtures reales de config/auth/doc/storage, runner y proof; auditoría post-rollout | Conservar lectura y datos; desactivar nuevos writes/scheduler/departures si faltan gates; no eliminar firmados |

Controlled deployment DB_SYNCHRONIZE=false y DB_DROP_SCHEMA=false antes de ejecutar migrations con target confirmado. Migrator no inicia Nest/Seed ni VisitasInvariantService viejo. Docker/init/CI cloud Postgres usa mismos schemas/migrations y evidencia; synchronize sólo si se autoriza explícitamente entorno descartable separado, nunca sustituto de migration test.

M001–M005 se coordinan como un release schema/writer con fase sin writes incompatible. Si no se puede garantizar rolling compatibility, usar ventana corta de writes pausados y drain; no anunciar zero downtime sin prueba. CREATE INDEX CONCURRENTLY si elegido requiere migration transaction=false y recuperación de invalid indexes; no mezclar con backfill transactional suponiendo atomicidad. Estrategia inicial puede usar CREATE INDEX normal durante writes pause, ensayada con volumen real.

## Mapping explícito backfill

| Legacy | Canonical aprobado | Lo que NO se infiere |
|---|---|---|
| tipo=PREDICTIVO | work_order_type=PREVENTIVE; conservar tipo=PREDICTIVO para adapter | Nuevas categorías/diagnóstico, no renombrar enum legacy |
| tipo=CORRECTIVO | work_order_type=CORRECTIVE | Bloqueo por ser correctiva |
| estado=BORRADOR | work_order_status=PENDING; legacy_compat_draft=true; mirror BORRADOR | startedAt, assigned_user_id, firma mecánica, resultado CHECK |
| estado=CERRADO | work_order_status=COMPLETED; completed_at=cerrado_at; slot=false; mirror CERRADO | trusted signer actual, aptitud, operational_date de CHECK |
| tipo/estado NULL o desconocido | No auto mapping: reporte y bloquea activación del grupo afectado | PREVENTIVE por default, COMPLETED inventado |
| existing createdBy | Preservar exacto y proveniencia LEGACY_HEADER donde se exponga trust metadata | Identidad legalmente atribuible |
| legacy firma/foto Data URL | Mantener en tablas legacy con contrato actual; no inventar hashes/object keys de CHECK | Migración global de blobs no pedida |

PENDING histórico es un estado de compatibilidad documentado, no afirmación de que nunca se trabajó la visita. No llenar CHECK extension en legacy maintenance. Existing blocking behavior no derivaba Corrective blocker; nuevos campos de maintenance históricos no inventan bloqueos. Si se necesita clasificar bloqueos de mantenimiento real, hacerlo mediante decisión explícita versionada, no backfill type=CORRECTIVO ⇒ true. Nuevos commands exigen decisión de blocker cuando corresponda.

## DDL conceptual de constraints

No ejecutar desde este documento. Nombres finales deben coincidir con traducción de 23505 en servicio y tests.

```sql
CREATE UNIQUE INDEX check_un_activo_por_unidad_uidx
ON public.visitas (unidad_id)
WHERE work_order_type = 'CHECK'
  AND work_order_status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS');

CREATE UNIQUE INDEX visitas_legacy_draft_slot_uidx
ON public.visitas (unidad_id)
WHERE legacy_compat_draft = true
  AND work_order_type IN ('PREVENTIVE', 'CORRECTIVE')
  AND work_order_status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS');

-- Ejecutar DROP del índice global sólo en M005 con todos los gates:
-- DROP INDEX public.visitas_un_borrador_por_unidad_uidx;
```

Row constraints: CHECK ⇒ legacy slot false + estado NULL + subtype presente; slot true ⇒ maintenance active + estado BORRADOR. Completar CHECK ⇒ signature/snapshot/result presentes; cancel no signature/complete; require source/facility/date. Los constraints de relación/subtype/child counts requieren trigger/procedimiento transaccional, no CHECK que consulta otra tabla. Exigencia CHECK1:1 se valida de forma diferida al final de la transacción, para permitir crear Visita y su extensión juntas sin una ventana de inconsistencia confirmada.
UNIQUE daily(unidad_id, operational_date); UNIQUE check_findings(check_id, source_key); UNIQUE corrective(source_check_id,finding_id) para derivaciones. Adjuntar fotos y preparar/firmar siempre con lock agregado/version.
Signed immutability triggers protegen aggregate/content/children, cascades y deletes; invalidations viven aparte y pueden añadirse sin editar signed row. Document tables tienen scope propio, sin FK cruzadas.

## Query/caller changes obligatorios

- VisitasService create/list/find/update/remove/close require type maintenance/representation legacy; slot queries typed/marked, no ORDER BY para escoger entre N como sustituto de contrato.
- UnidadesService ultimoKmCerrado, hub, historial/cadencia y VisitasService ultimoKmCerrado filtran maintenance.
- Salud/Andon lecturas maintenance y event consumers no consumen CHECK_COMPLETED; stock no aplica consumos de CHECK.
- New queue/read-model counts se consultan server-side sobre canonical status/scope; /ordenes y hub distinguen maintenance/CHECK, no N+1 legacy para nueva cola.
- New CHECK API rejects legacy children/firma Data URL routes; triggers prevent bypass.
- Legacy bootstrap invariant must be replaced with migration verification, not reinstalled after drop by unaudited startup.

## Pruebas de migración y recovery

En DB descartable con target URL demostrado (setup E2E usa DROP_SCHEMA):
1. Crear fixtures BORRADOR/CERRADO y relaciones/outbox; guardar checksums/IDs/counts no blobs.
2. Aplicar up M001–M005 via runner, comparar pérdidas=0, legacy contrato201/200, mapeos, indexes y triggers.
3. Fixtures NULL/duplicates/orphans ⇒ audit falla sin reparación automática; evidence identificable.
4. Crear N mantenimientos+1CHECK; second CHECK bloquea. Legacy slot cap no bloquea esas N.
5. Duplicate daily/derived corrective y concurrent manual/scheduler: único ganador.
6. CHECK close vs edit/upload/delete y SQL directo firmado rechazados; invalidation conserva snapshot.
7. Round-trip down sólo pre-new-data permitido; post-new-data rollback gate rechaza drop destructivo.
8. Dos versiones app/bootstrap: probar incompatibility gate, old index no reaparece.
9. Outbox/event comparison VisitaCerrada unchanged; CHECK no reset/stock/cadence.

Backups/restore, volumen/lock duration, migration credentials y registro migrations son inputs de despliegue; no PASS en Slice0. Final approvals de execution release/EWO antes de tocar DB. Evidencia actual documental sólo en [Slice0 evidence](../evidence/CHK-001-slice-0.md).


## R01–R05 adoptadas / partición por slice

Owner aprobó plan/contract; no ejecución autorizada. EWO015 ejecutará sólo migrations foundation public. Crear vehicle→facility config con timezone V1 America/Mexico_City y límite local midnight; no asignar todos los vehículos a un facility inventado en backfill. Mapping real se provisiona explícitamente (single Team Mex facility permitido). Historicos sin physical source no se marcan EN_PATIO: fuente física pertenece Flota, estados EN_PATIO/EN_RUTA/EN_TALLER/INACTIVA con ledger; fuente unknown es knowledge/null, no quinto estado.

Schema global referido en M001/M003 se introduce por migration incremental del slice dueño: condition/PSI17, evidence18, finding/preparation19, signature/immutability20, Flota physical/documentos/urgency21, gateways22. Slice1 incluye extension y columnas/reserved links/active constraints/legacy slot/backfill/auth/facility foundation; no crea todos esos módulos anticipadamente. M006 activation se aplica por capability, no habilitación total antes de Slice8.

R05 default escalation7200s es configuración aprobada persistida/versionada en Alertas/Logística de Slice7; no cambia baseline sin-regreso. Rangos PSI unit/type reales y matrices R02 se cargan por configuration workflow de Slice3, sin copia de mock. Inputs env/DB/identity/storage no son owner decisions pendientes. Gate migration ensaya public/índices en disposable sin acceder fuentes aún no implementadas.
