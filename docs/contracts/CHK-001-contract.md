# CHK-001 — Implementation contract (Slice 0)

## Status and authority

Approved Slice0 technical contract — owner 2026-10-01, D01–D14 y R01–R05 adoptadas. EWO015 implementation-ready técnicamente, sin permiso para ejecutar código. [SPEC](../specs/SPEC-CHK-001.md) owns acceptance criteria; ADR-016–020 own decisions. Existing code remains as-is until approved EWOs execute. [Slice 0 review](../engineering-work-orders/CHK-001-slice-0-review.md) registra decisiones resueltas e inputs técnicos de ejecución.

## Canonical aggregate and compatibility

Visita in public.visitas is the sole OT aggregate/ID. Column contract:
- work_order_type CHECK/PREVENTIVE/CORRECTIVE; work_order_status PENDING/ASSIGNED/IN_PROGRESS/COMPLETED/CANCELLED.
- assigned_user_id, assigned_at, started_at, completed_at, cancelled_at, version, blocks_operation and block_reason/actor; requires_reinspection on maintenance work.
- legacy_compat_draft boolean defaults false; legacy tipo remains PREDICTIVO/CORRECTIVO. Legacy estado is a compatibility mirror, not a second authority; CHECK never enters legacy API/query.
- check_inspections has UNIQUE visita_id; source, facility_id, operational_date, configuration versions, result, reviewed_version, snapshot/hash, signature ref. All CHECK evidence is mandatory.

CHECK source = DAILY_AUTOMATIC/LOGISTICS_MANUAL/CHECK_OUT/CHECK_IN/REINSPECTION. APIs show Spanish labels. New maintenance APIs accept canonical types; adapters translate PREDICTIVO ↔ PREVENTIVE for legacy requests. Never reinterpret inspection as maintenance.

Lifecycle:
- Create → PENDING (unassigned); assign → ASSIGNED; permitted claim assigns atomically; start ASSIGNED → IN_PROGRESS.
- Editing technical condition requires IN_PROGRESS and assigned authorized mechanic. Start can be combined with eligible claim as one explicit command.
- Reassignment before start by Logistics/Admin; reassignment after start is not silently allowed (reject state conflict in V1).
- IN_PROGRESS → COMPLETED only via signed completion; pending/assigned/in-progress → CANCELLED with authorized reason.
- COMPLETED/CANCELLED never reopen. Expiration/invalidation are separate facts, not changes to signed content or lifecycle.
- Condition/Evidence/Findings/Review are exactly four visible steps, not four extra OT states.

Legacy APIs keep their outcomes and own draft slot. New N maintenance orders do not occupy that slot. Reads/hub/cadence explicitly scope maintenance; signed CHECK never appears as a maintenance CERRADO. Details and staged enforcement in [migration plan](../migrations/CHK-001-visita-backfill-plan.md).

## Actor and authorization contract

TrustedActor = {subject, displayName, roles[], facilityScopes[], authMode, attributionLevel}. Production fields come from verified identity adapter and server-side policy, not browser headers. subject is stable opaque ID, not necessarily UUID; persists without fake UUID casts. Signature captures subject/name snapshot/occurredAt server and auth attribution. Identity is never inferred from driver, createdBy or assignment.

| Operation | Allowed authority |
|---|---|
| Create manual CHECK, assign/reassign before start | LOGISTICA or ADMIN_DIRECTIVO, mismo facility autorizado que la unidad |
| List own/eligible, claim | MECANICO trusted, CHECK unassigned en facility autorizado del vehículo |
| Start, condition, evidence, finding, review, sign | Assigned MECANICO with active scope; every writer rechecks assignment |
| Read CHECK | MECANICO own/eligible scope; LOGISTICA operational scope; ADMIN audit scope |
| Cancel active | Logistics/Admin within scope with reason; no cancellation of COMPLETED |
| Invalidate completed | MECANICO: motivo técnico; LOGISTICA: incidente/evento operacional; ambos con motivo obligatorio y facility scope demostrado. Producers incident/safety/maintenance por puerto autorizado |
| Configure PSI/safety/facility/documentation | ADMIN_DIRECTIVO through owning configuration capability |
| Maintain POLIZA_SEGURO | ADMIN_DIRECTIVO in documentary capability |
| Daily generate / integration events | SYSTEM actor with limited capability, never sign |
| Admin signed rewrite | Forbidden, regardless role |

SUPERVISOR legacy capabilities preserved; not automatically assigned MECANICO. No role broadening of Inventario/Andon to Logistics/Mechanic. Stub requires explicit non-production mode; production+stub fails startup and invalid credentials never fall back. Stub artifacts are NON_PRODUCTION, cannot authorize production departure. A blank canvas or a typed name is not a signature.

Actor o facility scope no demostrable para claim/assign/invalidation => deny affected command; absence of trusted production identity => no signing/departure. These are explicit configuration gates, not invented authorization.

## Condition, PSI, findings and disposition

A: aceite motor, agua/limpiaparabrisas where applicable, refrigerante, fugas visibles. Explicit confirmation, never default true. Item-specific anomaly input and physical note; no battery/brakes/suspension added. B: per-position PSI and explicit visual condition; positions/ranges/policy from configured unit/type, no screenshot values.

Configuration version is captured during inspection and reviewed snapshot. Validation checks complete positions, finite nonnegative PSI, configured ranges and safety classifications. Missing required configuration returns CHECK_CONFIGURATION_REQUIRED; never treats missing PSI/range as conforming. Review requires refreshed policy if policy version changed while draft; signed snapshot remains frozen.

Derive finding by stable source key and condition revision in the SAME transaction. Group related observations by versioned rule, never duplicate text capture. Classifications OBSERVATION/FIXED_DURING_CHECK/REQUIRES_WORK. Source changes invalidate outdated review/classifications/preparation as needed; archive previous derivation in audit, not delete signed evidence.

Server disposition:
- no anomaly => FIT;
- unresolved/non-blocking anomaly => FIT_WITH_OBSERVATION;
- hard safety blocker => UNFIT.
After a verified physical correction the current facts are re-evaluated; selecting FIXED_DURING_CHECK alone does not remove a hard blocker without the policy's required physical evidence/correction.
Hard blocker cannot be overridden to FIT (or any disposition permitting departure). Other changes only where configured safety policy allows with recorded reason; la configuración debe incluir la regla, ausencia no permite override; no arbitrary client result. R02 matriz hard queda adoptada: aceite motor crítico, refrigerante crítico, fuga visible severa, llanta severa/ponchadura, PSI fuera límites críticos. Numeric ranges son config por unidad/tipo; normalMin/normalMax y criticalMin/criticalMax son inclusivos, con 0<=criticalMin<=normalMin<=normalMax<=criticalMax. PSI dentro critical y fuera normal es no crítico→FIT_WITH_OBSERVATION; fuera critical es hard→UNFIT. Config ausente/inválida no deriva conformidad. No permitir downgrade de blocker a resultado operable.

Selecting REQUIRES_WORK is explicit selection to create corrective. Before completion only prepared context, no final OT/fake COR folio. Preparation inherits unidad_id, source_check_id, finding_id, note and evidence refs. No automatic diagnosis/parts/technician/schedule.
Completion creates one CORRECTIVE per selected eligible finding with UNIQUE source_check_id+finding_id; correctiva remains maintenance and blocks only via explicit independent blocks_operation policy. A completed CHECK may be UNFIT whether or not a corrective is created.

## Evidence, signatures and storage

ObjectStoragePort S3-compatible, private bucket; MinIO/self-host for development and configured production adapter. Proposed methods reserveTemporaryUpload, verifyObject, openAuthorizedRead, referenceImmutableObject, removeUnreferencedTemporary. Resource authorization at reservation/registration/read; keys created by server, user cannot attach object belonging to another CHECK.

Evidence required for ALL CHECK in V1: 2–5 READY photos, union tags covers ODOMETER/FUEL/WARNING_LIGHTS. One photo may cover multiple tags. No N/A or bypass. Coverage tagging is explicit capture by mechanic, not an assertion of OCR/AI verification. Optional odometer/fuel reading must match signed values where captured; no automatic reading assumed.

Presigned PUT sólo se emite para namespace temporal. Finalización referencia objeto final inmutable y su objectVersionId si el adapter versiona; lectura/verificación/snapshot usan esa versión, nunca latest mutable. URLs temporales previas no pueden sobrescribir el objeto firmado. IAM/policy protege namespace final y versiones contra reemplazo/delete; bucket lifecycle no elimina versiones firmadas. Configurar versioning/retención o protección equivalente y probarla con MinIO/production adapter antes de habilitar cierre.

Registration verifies content MIME (not just provided header), size, SHA256, stored object identity, timestamps/actor and allowed image formats; limits byte-size/formats configured in server. Reserve/count maximum slots with aggregate lock; incomplete upload is not evidence. Pending sixth object is refused even if URLs previously issued.

Signature object: verified nonblank image generated by tactile canvas, width/height, method TOUCH_CANVAS, object key/hash, signer/name snapshot and signed_content_hash. Backend rejects empty/blank/invalid images; exact behavioral detector must be tested, not regex-only Data URL. Mouse input may support desktop accessibility; stored method records actual supported canvas workflow, never text signature.

Temporary S3 upload completes BEFORE domain completion txn; DB commit references existing verified objects. Do not put remote network writes inside SQL closure. Cleanup acquires same reference/reservation coordination and rechecks no live reference; only temporary unreferenced objects. No automatic deletion of signed evidence/signatures; keys cannot be overwritten by application writer. Runtime permissions/bucket configuration enforce private access and signed retention.

Snapshot canonical serialization and server SHA256 include schemaVersion, aggregate ID/revision, unit identity snapshot, operational date/facility/timezone/day end, source, condition/PSI/config versions, evidence keys/objectVersionIds/hashes/tags/readings, findings/classifications/prepared derivations, disposition/reason, signer identity/attribution. Do not include expiring read URLs in hash. Store snapshot and hash; edits invalidate review token and signature candidate.

## Validity, invalidation and movement ports

FacilityCalendarPort resuelve facility configurado por vehículo (un facility Team Mex inicial permitido), timezone America/Mexico_City y operationalDate calendario local. Intervalo [00:00 local,00:00 del día siguiente) incluye todo 23:59. Suministra dayEndInstant desde calendario/timezone, guarda versión/facility. No offset UTC fijo. Not rolling TTL; local operational day can have 23/25 hours. DAILY_AUTOMATIC same-day signed valid result can satisfy repeated CHECK_OUT. Compare operational day plus invalidation state and signature/snapshot; no new CHECK for each departure.

SignedCheckReadPort validates {unidadId, facilityId, operationalDate, now, transactionContext} → {checkId, snapshotHash, result, valid, reason, version, dayEndInstant}. A valid UNFIT is still departure-blocking. If no suitable valid CHECK, return required; when active already exists reuse/start it rather than duplicate. If expired/invalidated previous completed, request new CHECK subject to active uniqueness.

Append-only invalidation events: INCIDENT_DAMAGE, NEW_SAFETY_ANOMALY, AUTHORIZED_INVALIDATION with actor/reason, MAINTENANCE_REINSPECTION_REQUIRED with source work/order/event. Idempotent sourceEventId, no rewrite snapshot/COMPLETED. Expires at day end without generating invalidation. Maintenance completion integrates via a new authorized port/event ONLY when requires_reinspection is explicitly true; ordinary VisitaCerrada preserves semantics.

Flota movement adds opaque source_check_id, snapshot_hash and validation refs on NEW departures. No cross-schema FK. Retain CHOFER+AVAL for every patio SALIDA/ENTRADA; CHECK does not satisfy those signatures. Logistics departure validates via same policy port but does not implicitly create patio movement; regreso doesn't mutate flota.

DeparturePolicyPort returns {allowed, reasons[], signedCheckRef, insuranceRef, blockVersions, evaluatedAt, operationalDate}. Server validates signed valid operable CHECK, insurance and hard blockers INSIDE coordinated transaction. Capture source refs in movement/journey audit even where journey lacks a movement entity. Revalidate on authorization/commit; stale UI or previous preflight cannot authorize.

Use one unit-scoped advisory transaction lock/key via an application coordinator shared by all writers affecting authorization (departure, check invalidation/completion, documentary replacement, maintenance block/reinspection, physical transition). Lock then owner ports read/write with same EntityManager/transaction context. No writer touches another owner's tables. Lock order unit → visita → child/resources; deterministic unit ordering for multi-unit jobs, no batch global mutex. Date validity is evaluated at commit; expiration passing during long-running request must fail/retry authorization. PostgreSQL advisory lock is coordination in addition to unique constraints, not a substitute.

Missing CHECK/config/doc/source, UNFIT or other blocker => reject NEW departure. Entry/return is not rejected simply because insurance/check expired; still enforce existing patio driver/aval/km/time closure rules. CHECK_IN may be requested without making physical return conditional on completion of a new inspection.

## Minimal documentary capability

vehicle_documents schema; POLIZA_SEGURO only in V1, opaque unidad_id, expiration_date DATE, version/current, actor/time and supersedes reference. Owner validates Unit existence via port. Current version UNIQUE unidad+document_type; replacement append-only history. Admin writer, scope-authorized readers. No full future catalog, no refactoring Kernel into Master Data.

VehicleInsurancePolicyPort evaluated in SAME operational calendar context as departure:
- missing => MISSING_INSURANCE hard block;
- expiration_date <= operationalDate => INVALID_INSURANCE hard block (including today);
- greater => valid;
- unavailable source => POLICY_SOURCE_UNAVAILABLE, fail closed; do not claim “expired”.
Candidate HTTP: GET /unidades/:id/documentos/poliza-seguro and POST /unidades/:id/documentos/poliza-seguro/versions. DTO expirationDate ISO date, no timestamp timezone ambiguity. Historical units have no fabricated document; populate approved real data before enabling departure gates.

## Control Tower contract

GET /logistica/torre-control with q, physicalState, readiness, checkState, urgency, cursor/limit; counts from same authorized snapshot/filter scope, distinct unit IDs. Batch composition through ports, no N+1 per-row queries or cross-schema JOIN.

Row {unidadId, identification, physicalState, physicalSource, readiness, checkState, urgency, activeCauses[], activeCheck?, lastValidCheck?, asOf, sourceVersions, staleSources[]}.
Physical state EN_PATIO/EN_RUTA/EN_TALLER/INACTIVA es propiedad Flota/Patio, con transición explícita/source ledger; físico no conocido devuelve null+physicalKnowledge=UNAVAILABLE/UNINITIALIZED, no enum UNKNOWN. EN_TALLER nunca deriva de CORRECTIVE. Fuente Flota/Patio divergiendo de journey produce operationalInconsistency visible, sin reparar/sincronizar loops. Kernel ACTIVA/INACTIVA is distinct administrative availability; do not silently use a Corrective as EN_TALLER.
Readiness: Despachada for routed unit; otherwise Bloqueada if hard cause, Pendiente when required CHECK incomplete/absent/expired/invalidated, Lista only all departure gates satisfied. Unknown critical source cannot produce Lista. Source conflict is explicit, never merge loops.
Check state exposes lifecycle and result/validity separately; “Apta” only valid signed FIT, “Apta con observación” valid FIT_WITH_OBSERVATION, “No apta” UNFIT, otherwise “En progreso”/“Requerido” according state/validity.
Urgency max active-cause severity per D11; CRITICAL and ATTENTION precedence deterministic. Blocking KPI counts hard reasons, not all Correctives. Defaults R05 se persisten/versionan como configuración: overdue positivo <=2h ATTENTION y >2h CRITICAL, zero no overdue. Hard blocker/UNFIT/invalid required document CRITICAL; CHECK required/in progress/FIT_WITH_OBSERVATION ATTENTION; ninguna causa NORMAL. Config in engine no literals. Overdue se calcula contra due instant de source: returnDueAt explícito si existe; V1 preserva baseline sin-regreso configurado de Logística (salidaAt+umbral duración) cuando no hay otro due timestamp. Escalación2h comienza tras ese vencimiento, no tras salida; existente baseline8h/24h no se cambia por R05. Source unknown no se finge NORMAL confiable.
Dashboard /logistica, movement /flota, no global DS migration. Polling/refresh with asOf/stale/error; no “live” promise without proven freshness SLA/config.

## HTTP contracts (proposed names)

All mutation requests include expectedVersion except first create; signed completion has idempotencyKey + reviewedVersion/hash. Body actor/source cannot override server actor. Time/folio computed server-side.

| Endpoint | Success / principal failures |
|---|---|
| POST /unidades/:id/checks | 201 detail; 409 ACTIVE_CHECK_ALREADY_EXISTS + active {id,folio,status,step,assignedActor,startedAt,anomalySummary,deeplink}; logistics/manual origins allowed by policy |
| GET /unidades/:id/checks/active | 200 detail-or-null; role/scope enforced |
| GET /checks?scope=mine-or-eligible | 200 paginated items + scoped counts; no unsupported free actor filter |
| POST /checks/:id/assign or /claim or /start | 200 current revision; ASSIGNMENT_CONFLICT, INVALID_STATE, denied policy |
| GET /checks/:id/condition | 200 saved condition payload/progress/version or null; MECANICO + resource/facility scope |
| PATCH /checks/:id/condition | 200 condition+derived findings/progress/version; numeric/config/source validation |
| POST /checks/:id/evidence/uploads | 201 reserved slot/key/upload instructions; PHOTO_LIMIT_EXCEEDED; auth |
| POST /checks/:id/evidence | 201 verified READY metadata/version; object/config/count failure |
| DELETE /checks/:id/evidence/:evidenceId | 200 new revision before signature; CHECK_IMMUTABLE after |
| PATCH /checks/:id/findings/:findingId | 200 classification+prepared context/version; no extra confirmation |
| POST /checks/:id/review | 200 candidate snapshot/hash/version/disposition; incomplete step errors |
| POST /checks/:id/complete | 200 signed completed detail/createdCorrectives; repeated identical key returns same result |
| POST /checks/:id/cancel | 200 CANCELLED; reason/state/scope validation |
| POST /checks/:id/invalidations | 201 append-only event; source-id retry returns same event; no snapshot edit |
| POST /unidades/:id/mantenimiento-ordenes | 201 new maintenance canonical type, independent of other maint; idempotency per request; no EXISTING_DRAFT global |
| GET /mantenimiento-ordenes | 200 paginated canonical maintenance only, including multiple open orders |
| GET /logistica/torre-control | 200 composed snapshot or explicit unavailable state; never inferred Lista on failure |

Standard error {code,message,details,currentVersion?}; 401 no trusted authentication, 403 scope/role, 404 resource invisible/absent, 400 malformed input, 422 incomplete physical/evidence/signature/policy configuration, 409 active/version/immutable/state conflict, 503 authoritative source unavailable. Departure blockers return 409 DEPARTURE_BLOCKED with cause list (or 503 source failure). Frontend HttpError must preserve code/details, including winning active CHECK. Existing legacy status contracts stay unchanged.

If race winner completed/cancelled before querying active after 23505, do not retry create silently: return 409 CHECK_CREATION_CONFLICT with existing command/aggregate ref if obtainable and refresh instructions. Same-day automatic generation uses durable generation record even if previous completed/cancelled.

## Closure and integration events

One transaction locks unit+CHECK, checks actor/state/version, complete condition/PSI/2–5 evidence/full coverage, all findings classified, disposition policy, verified signature hash/review match; writes immutable snapshot, signature, result, completion; creates selected Correctives; writes ledger/outbox. Any failure rolls all SQL back. Signed objects were staged before transaction; not distributed SQL/S3 atomicity.

CHECK_COMPLETED envelope {eventId,eventType,schemaVersion,occurredAt,actorRef,unidadId,checkId,revision,source,operationalDate,facilityId,snapshotHash,result,correctiveIds[]}. No blob/expiring URL. Not VisitaCerrada.
Audit CHECK_CREATED/ASSIGNED/STARTED/FINDING_CREATED/FINDING_CLASSIFIED/REVIEW_STARTED/SIGNED/COMPLETED/CANCELLED/INVALIDATED/CORRECTIVE_PREPARED_FROM_CHECK/CORRECTIVE_CREATED_FROM_CHECK; actor/time/vehicle/order/source/reason where relevant. Content writes add revision audit.
Ledger append-only in owner; outbox same transaction; replay consumer eventId dedupe. CHECK handlers do not invoke legacy inventory/cadence/Andon consumers. Maintenance event envelope unchanged.

Notifications new CHECK source/deeplink and audience policy for scoped Logistics/Admin/assigned mechanic as applicable, not broadcast all items to all roles. Per-user read marker ≠ authorization audience. Transaction manager carried through local handlers; remote delivery only after durable commit. Preserve default noop and dual Andon factories.

## Daily command and operational activation

GenerateDailyVehicleChecks(facilityId, operationalDate, SYSTEM actor, commandId) uses configurable vehicle→facility mapping y sólo unidades administrativa ACTIVA, físicas Flota EN_PATIO/disponibles para preparación y sin CHECK activo. No EN_RUTA/EN_TALLER/INACTIVA ni fuente física no demostrable/inconsistente. Usa single create service. Unique unit+jornada durable ledger; existing active => skipped-with-ref, race => conflict-with-ref; two concurrent creates that both passed precheck produce one creation and one conflict. Automatic completed/cancelled generation never repeats same date. Next day generation doesn't override existing active order.

Inputs operativos: mapping real facility/vehículos, frecuencia/hora scheduler, auth provider/issuer/audience, numeric PSI/config unit/type, umbrales versionados con defaults R05, documentos reales, storage endpoints/credentials y migration target/backup. Políticas R01–R05 ya resueltas; estos valores de entorno no son OWNER_DECISION_REQUIRED ni requisitos para implementar foundation de Slice1. Missing inputs keep affected feature flags disabled. No default values copied from mock or inferred current production configuration.

## Implementation boundaries / tests

No source or SQL executed by this contract. Tests traced in SPEC AC-01–36 and EWO-015–022. Domain characterization + real PostgreSQL concurrent create/claim/sign/upload/outbox/departure races. Production trusted identity and object authorization tested, SQL UPDATE/DELETE signed rows rejected, cleanup cannot remove referenced objects. UI 4 steps, compact normal path, no redundant disposition/Corrective confirmation, mobile canvas and scoped read-only Logistics.


## R01–R05 adoptadas — owner, 2026-10-01

El owner aprobó el paquete Slice0 y estas políticas; son target aprobado, no configuración desplegada ni permiso para producción. D01–D14 permanecen sin cambios.

| ID | Política V1 adoptada |
|---|---|
| R01 | Facility configurable por vehículo; despliegue inicial puede usar un facility Team Mex. Timezone America/Mexico_City. Día operacional calendario local 00:00–23:59, implementado como intervalo [00:00, 00:00 del día siguiente) para incluir segundos/fracciones del último minuto. DAILY_AUTOMATIC sólo vehículo ACTIVA, físico EN_PATIO/disponible para preparación y sin CHECK activo. No auto generar EN_RUTA, EN_TALLER o INACTIVA. |
| R02 | Hard blockers: aceite motor crítico, refrigerante crítico, fuga visible severa, llanta severa/ponchadura y PSI fuera de límites críticos configurados. No crítico→FIT_WITH_OBSERVATION; hard→UNFIT, sin override operable. Rangos normales/críticos por posición son configuración de vehículo/tipo, no screenshots. |
| R03 | MECANICO puede claim CHECK no asignado en facility autorizado. Logistics/Admin asignan dentro de ese facility. Invalidation explícita MECANICO por hallazgos técnicos, LOGISTICA por incidentes/eventos operativos; ambos con motivo. Scope/actor no demostrable→deny. |
| R04 | Flota/Patio posee physical state EN_PATIO/EN_RUTA/EN_TALLER/INACTIVA. EN_TALLER sólo transición operacional explícita registrada, no existencia de Corrective. Divergencia journey/patio se expone como inconsistencia; jamás reconciliación silenciosa. |
| R05 | Defaults de urgencia de retorno configurables: retraso positivo <=2h ATTENTION; >2h CRITICAL. Hard operational blocker, UNFIT o documentación requerida inválida→CRITICAL. CHECK requerido/en progreso o FIT_WITH_OBSERVATION→ATTENTION. Sin causa activa→NORMAL. Thresholds en configuración persistida/versionada, no constantes hard-coded de dominio. |

Los valores numéricos PSI, listado real de vehículos/facilities, hora de invocación del scheduler y credenciales/provider son inputs de configuración de ejecución. No son nuevas OWNER_DECISION_REQUIRED: contratos config/validación/fail-closed definidos. No inventar PSI ni tomar las 2h del mock: las 2h están autorizadas aquí por owner.
