# LOG-JOURNEY-001 — Durable Logistics journey/return contract

Status: Approved for EWO-041 implementation, 2026-10-15. Approval reference: owner in this chat, “okay go ahead with the plan”.
Owner approved bounded code and disposable migration rehearsal through EWO-041.
External migration, push and deployment remain unauthorized.
[ADR027](../adr/027-logistica-durable-journeys.md) owns the proposed schema choice;
[UTIL journey AC](../specs/SPEC-UTIL-INPUTS-001.md#bounded-journey-slice--ac)
own behavior. The broad ABC-UTIL contract remains Proposed.

## Source baseline and scope

Application baseline: 0d7d0b274961bab273d3d57d750c06664af5eed3. Published context:
ebfc7ba73551ac8942abfeb4297dfcf3a7bda058 (documentation only). Source observations:

- LogisticaService.registrarSalida uses a transaction, UnitOperationCoordinator,
  departurePolicy.authorize, unit row lock, unit save and departure audit save.
- registrarRegreso uses the same coordinator/row lock, validates EN_RUTA, sets
  DISPONIBLE and clears salidaAt; no journey history or actor argument.
- LogisticaController departure has TrustedAuthentication and Actor; return lacks
  both. Both successful POSTs return 204 with no body.
- DeparturePolicyService already checks facility scope, current ABC/insurance,
  administrative, physical, journey and maintenance conditions. Preserve its
  actual rules; target ABC/recheck rules are not implemented by this slice.
- Both web/src/components/LogisticaDashboard.tsx and web/src/app/flota/page.tsx
  call return with only the unit ID. Departure is called by LogisticaDashboard.
  Their handlers must carry invisible transport metadata; no new form fields.
- The actual browser/BFF/API path includes web/src/app/backend/[...path]/route.ts.
  Its current header allowlist strips the proposed lifecycle headers; extending
  that allowlist and verifying the full path are required within this slice.

In scope: durable trip identity, retained departure evidence, matched return time,
trusted actor/facility provenance, safe retry/concurrency, incomplete legacy
representation, additive migration design and test coverage.
Excluded: downtime writers/corrections, reason ledger, costs, PSI removal, safety
policy/recheck/hold changes, new readiness gates, physical departure correlation,
custody changes, graphs, assignment UI, role grants, notify redesign and deployment.

## Persistence (public, Logistics through Kernel)

All IDs UUID unless stated; times timestamptz; actors varchar(128); versions bigint
serialized as decimal strings in JSON. No FKs to foreign-owned entities, including
CHECK, insurance, facilities or Flota. No deletion cascades. Same-owner journey/
receipt/audit integrity is enforced by constraints below and the transaction.

| Location | Data / constraints |
|---|---|
| unidades | active_logistica_journey_id nullable; logistica_journey_revision NOT NULL DEFAULT 0 CHECK >=0. Only lifecycle writers increment this revision, once per successful new departure/return. Do not use updatedAt, which unrelated edits change. |
| logistica_journeys | id PK; unidad_id NOT NULL; origin CAPTURED/LEGACY_OPEN/LEGACY_RECOVERED; capture_id NOT NULL; revision NOT NULL (1 open, 2 returned); departed_effective_at, departed_registered_at, departure_actor_id, departure_auth_mode, departure_attribution_level, departure_facility_id, departure_mapping_version, departure_facility_version nullable for legacy; departure_audit_id nullable UNIQUE; driver_id nullable; driver_provenance EXPLICIT_DEPARTURE/STANDING_ASSIGNMENT_SNAPSHOT/UNKNOWN; ambito/destino nullable; context_provenance DEPARTURE_SNAPSHOT/LEGACY_OBSERVED; legacy_observed_context jsonb nullable; history_gaps jsonb NOT NULL; created_at NOT NULL DEFAULT clock_timestamp(). |
| journey return endpoint columns | returned_effective_at, returned_registered_at, return_actor_id, return_auth_mode, return_attribution_level, return_facility_id, return_mapping_version, return_facility_version, return_command_id. All null while open; all NOT NULL together once returned. One-way write, never overwritten by a retry. |
| logistica_journey_commands | PK(actor_id,command_id); unidad_id; kind DEPARTURE/RETURN; request_hash varchar(64); expected_unit_revision; expected_history_state; expected_journey_ref text (UUID or legacy sentinel, null for available departure); expected_journey_revision nullable only for explicit missing history or available departure; result_journey_id; result_unit_revision; result_journey_revision; response_status=204; registered_at DEFAULT clock_timestamp(). Successful receipts only; retain indefinitely in this slice. |
| logistica_journey_capture | id PK; schema_version; boundary_at NOT NULL; baseline_commit; legacy_open_count; coverage_note. One verified capture epoch; append a new epoch after a documented capture interruption, never move an old boundary. |

Indexes: UNIQUE logistica_journey_open_unit_idx on unidad_id WHERE
returned_effective_at IS NULL; UNIQUE departure_audit_id WHERE nonnull;
logistica_journey_unit_start_idx on (unidad_id,departed_effective_at,id);
logistica_journey_return_idx on (unidad_id,returned_effective_at) WHERE nonnull;
logistica_command_unit_idx on (unidad_id,registered_at).
Keep existing logistica_departure_unit_created_idx unchanged.

Checks: CAPTURED requires departure times/actor/facility/audit and
context_provenance=DEPARTURE_SNAPSHOT; its optional driver remains optional.
Legacy forbids inventing those required CAPTURED facts and uses explicit gaps.
Known effective return >= known effective departure. Journey revision matches
endpoint presence. Same-owner audit reference must exist and match unidad_id;
use a same-seam FK to the audit ID plus transactional same-unit validation.
No FK to unidades/choferes is required; retain history through catalog changes.

## Time, identity and evidence semantics

After obtaining locks and successful validation, sample database clock_timestamp()
once as the endpoint effective instant and use it also for unidades.salida_at on
departure. It means the Logistics action took effect, not proof of physical
departure/arrival. registered_at is the database insertion/update clock, not a
claim of exact transaction commit time; both persist only on commit. Do not use
transaction-start now() as the effective time after lock waits. UTC storage,
offset-aware serialization; operationalDate and authorization.evaluatedAt retain
their existing calendar/decision meanings. No operator timestamp or correction
endpoint in this slice.

Allocate journey/audit IDs once inside the departure transaction. Store the
existing audit payload and signed CHECK/insurance validationRefs without
reconstruction; journey.departure_audit_id binds that exact decision.
Snapshot final accepted ambito/destino and selected driver ID at departure.
EXPLICIT_DEPARTURE means the submitted, server-validated driver reference;
STANDING_ASSIGNMENT_SNAPSHOT means only the assignment observed then, not proof
of who drove. Missing driver is UNKNOWN. Never fill historical driver/name from
a later assignment. The audit actor is the authorizer, not the driver.

Thread @TrustedAuthentication() and @Actor() through return controller to
registrarRegreso(unidadId, commandContext, actor). Actor comes only from the
validated AuthenticationPort, including persisted authMode/attributionLevel;
development stub facts remain NON_PRODUCTION. Enforce existing LOGISTICA or
ADMIN_DIRECTIVO capability against trusted roles as well as controller policy.

Resolve return/context resource scope through a FacilityResourceReadPort supplied
by the existing facility-mapping owner, using the transaction manager and existing
mapping read lock. It returns unit mapping, facility ID and mapping/facility versions
without computing an operational day or requiring a specific timezone. Do not
call FacilityCalendarPort.resolve for return or journey-context: its current
timezone check would introduce a calendar prerequisite. Leave departure's existing
FacilityCalendarPort and policy behavior unchanged. Check actor.facilityScopes
and persist actual mapping/facility versions.
Return validates current authorized facility, even if departure was elsewhere;
retain both. Missing/unavailable mapping fails explicitly, with no inferred
facility or bypass. This is resource authorization, not a departure readiness
test. Return never calls DeparturePolicyPort or demands valid ABC, insurance,
physical-ready or administrative-active state. An expired prerequisite must not
prevent a genuine authorized return. Retry rechecks current resource scope.

## Existing HTTP seam and transport contract

Keep POST /logistica/salidas/:unidadId, existing business body, and
POST /logistica/regresos/:unidadId with empty business body. Both return empty 204
on initial success and identical committed replay.

Add a trusted, role/facility-scoped, no-store GET
/logistica/unidades/:unidadId/journey-context returning a single coherent
snapshot: unidadId, opsEstado, unitJourneyRevision, journeyRef, journeyRevision,
historyState (AVAILABLE/KNOWN_OPEN/MISSING_POINTER/MISSING_ROW),
historyCoverage and stored observed trip context (ambito/destino/salidaAt).
Read under the unit coordinator in a short transaction; no mutation in GET.
For available new units with no history revision is 0 and journeyRef is null.
Known current journey uses its UUID, genuine revision and KNOWN_OPEN state.
Missing history while EN_RUTA with no pointer returns a legacy sentinel
legacy:<unidadId>:<unitJourneyRevision>, null journeyRevision, MISSING_POINTER and
explicit gaps. A dangling pointer returns its UUID, null journeyRevision and
MISSING_ROW. AVAILABLE requires DISPONIBLE, null journeyRef/revision and no open
journey. Contradictory existing state is an integrity conflict. Never invent a
revision or select a journey by newest timestamp.

Add journeyRef, journeyRevision, historyState and unitJourneyRevision as technical metadata to
existing GET /logistica/unidades item rows, read coherently with their unit fields
in one repeatable-read snapshot before existing post-read inbox evaluation. This
does not change list layout, existing fields or capability; IDs grant no authority.
The scoped context endpoint is the authority for command preparation. Existing
client action loads it when the unit is selected/opened, before enabling submit,
and verifies it agrees with the selected row's journey reference, historyState and
revisions. A mismatch
invalidates that intent and uses the existing conflict/error path for review; do
not silently bind a previously selected trip to a newer one. Freeze the context
for the intent. On return it must be EN_RUTA; on departure DISPONIBLE.
Send these technical headers, never render them as operator fields:

- Idempotency-Key: client-generated UUID for one confirmed intent.
- X-Logistica-Expected-Subject: frozen authenticated subject that confirmed intent.
- X-Logistica-Unit-Revision: frozen decimal unit journey revision.
- X-Logistica-History-State: frozen AVAILABLE/KNOWN_OPEN/MISSING_POINTER/MISSING_ROW.
- X-Logistica-Journey-Ref: frozen UUID or legacy sentinel on return; absent on departure.
- X-Logistica-Journey-Revision: required genuine revision for KNOWN_OPEN; absent for
  AVAILABLE, MISSING_POINTER and MISSING_ROW, including a dangling UUID.

Explicitly forward Idempotency-Key and all five X-Logistica headers above through
the BFF's narrow allowlist, preserving its current same-origin/auth checks. The API
compares Expected-Subject with actor.subject before receipt lookup or mutation;
mismatch returns 409 LOGISTICA_COMMAND_SUBJECT_CHANGED with no receipt/history
disclosure. This browser value is only an equality precondition, never an identity
source or permission. Obtain it from authenticated session identity when confirming.
Server comparison protects against another tab changing the cookie after browser
preparation. Missing subject binding is invalid context; do not replace it with
the currently logged-in subject during replay.

The shared web transport persists the pending envelope in sessionStorage only on
explicit action confirmation, namespaced by authenticated subject, unit and action,
before first POST. Drafts are never pending commands. Preserve
the exact normalized body, ID and expectations through timeout, network errors,
5xx, retry and reload; do not store credentials or let another subject reuse it.
Success clears pending state only after 204. Changed business input/new reviewed
intent gets a new ID; unknown results are resolved first by replay of the saved
envelope. Definitive conflict uses existing error handling and refreshed context;
never regenerate an ID and retry automatically against a later journey.
Owner decision Q1, this chat 2026-10-15, reply “1. Yes”: an already confirmed pending
command may resume automatically after reload, even if the original request never
reached the server. Such a retry may perform its first commit later. This resolves
retry behavior only; it does not approve the whole design or coding.

On reload after session identity is established, automatically replay only that
subject's saved envelope with its original key/body/expectations; never rebind it
to freshly loaded unit context. Use one in-flight replay per envelope and one
automatic attempt per page load, not a render-triggered retry loop. A transient
failure preserves pending data and existing retry/error behavior. Authentication,
subject, scope or lifecycle conflicts suspend automatic replay and require review;
never switch subjects, keys or journey expectations to force success. New departure
commits, including a delayed first send, still run every existing current gate.
Committed replay returns the saved outcome without creating another departure.
No periodic worker, background service or additional operator fields are added.

Missing/invalid metadata: 400 LOGISTICA_COMMAND_CONTEXT_REQUIRED, no mutation.
This deliberately rejects obsolete unit-only callers; response compatibility is
the unchanged 204/body and existing business body, not unsafe old request semantics.
Update both known callers together; no unit-only compatibility fallback.

Preserve existing 401/403/404, departure-policy errors and no-route 400 behavior.
New mismatched key/payload => 409 LOGISTICA_COMMAND_REUSED; stale binding =>
409 LOGISTICA_JOURNEY_CONFLICT. Use existing {code,message,details} convention;
details include authorized current journey/revision and refreshRequired=true,
never another facility's facts. Persistence/source faults remain 5xx, not success.

## Atomic command algorithm and races

1. Authenticate, validate envelope and compare expected subject. Start transaction;
   coordinator lock unit first, lock Unidad row, resolve/validate resource facility.
2. Look up receipt for actor.subject + command ID. If present, exact canonical
   request hash (kind, unit, normalized body, expected subject, history state,
   journey/unit refs/revisions, including explicit nulls) must match.
   Replay 204 before validating changed state or running departure gates; it
   repeats an already committed decision and does not authorize a new departure.
   Same key used concurrently for another unit is serialized by the receipt PK;
   on unique violation roll back and read/compare winning receipt in a new
   authorized transaction. Never swallow unrelated persistence errors.
3. Without receipt, lock/read the expected journey where present and compare unit
   revision and expected historyState/journey/ref/revision. Missing-history requests
   revalidate row/pointer absence under the same unit lock; an unexpectedly present
   row conflicts even if its revision appears compatible. Do not let a missing
   current row prevent replay of an existing receipt in step 2.
   Conflict changes nothing. Available/no-route return retains existing 400;
   a stale bound return after another departure is 409.
4. New departure: run unchanged departure policy with manager, existing input/
   driver checks; reject an inconsistent active pointer/open journey. Save audit,
   CAPTURED journey, unit EN_RUTA/salidaAt/pointer/revision+1 and receipt together.
5. Return: require EN_RUTA and matching open journey. Persist endpoint, trusted
   actor/facility and journey revision+1, then clear salidaAt and active pointer,
   set DISPONIBLE and increment unit revision, insert receipt, all in one commit.
   Do not clear ambito/destino/driver; preserve current compatibility.
6. Any failure rolls back all journey, audit, unit and receipt writes. Existing
   postcommit evalUnidad/inbox evaluation remains outside this transaction.
   If it fails after commit and caller sees 5xx, saved receipt still makes retry
   safe. Replay may reevaluate current unit facts, never replay an old journey's
   alert state against a later trip. No notify/outbox redesign is included.

J1 return K commits, response lost, J2 departs: retry K returns 204 for J1 without
touching J2. A new K2 still bound to J1 conflicts. Two return IDs for J1 produce
one endpoint and one success; loser conflicts. Departure/return serialize using
the same coordinator; only matching revisions succeed. Receipts preserve original
actor/time on duplicate; another actor is a separate intent and cannot claim the
original receipt. Unique open/audit/receipt constraints backstop service logic.

## Protect lifecycle facts from existing non-lifecycle writers

The coordinator in departure/return alone does not protect a new journey.
Current UnidadesService.update/marcarEnvioEspecial/reactivar and Logistics
assign/unassign load full Unidad entities then save them without coordination.
A stale entity saved after a journey commit can overwrite ops_estado, salida_at,
the active pointer and revision. Protect these paths as part of this bounded slice,
without new business behavior, driver-assignment UI or a general catalog refactor.

Catalog edits must use explicit allowed-field patches; never resave a previously
loaded full entity. Patch only validated DTO fields, preserve existing normalization,
not-found/response behavior, and exclude ops_estado, salida_at, ambito, destino,
active_logistica_journey_id and logistica_journey_revision. Status helpers patch
only their existing administrative fields; assignment patches only chofer_id.
Writers of existing departure-affecting status or assignment also take the shared
unit coordinator and read fresh state in the transaction before validating/writing.
No non-lifecycle writer increments or resets journey revision. Pure catalog edits
need no new readiness rule; do not change authorization capabilities.

SeedModule is imported unconditionally and SeedService.onModuleInit invokes
seedCatalogo. Existing-unit upsert currently rewrites ops state, trip context and
salida_at on restart; it must become an explicit catalog-only patch that preserves
all lifecycle fields, driver assignment and pointer/revision. Any administrative
seed writes must participate in coordination so they cannot race departure
validation. Do not rewrite journey/audit/receipt/capture rows from seed.
After capture is initialized, new ordinary seed units start DISPONIBLE with no
trip endpoint/pointer and revision 0; never create an unaudited EN_RUTA trip.
Demo EN_RUTA initialization is allowed only in an explicitly verified disposable
pre-capture fixture path, with later legacy reconciliation if capture is enabled.

Placeholder cleanup must skip, with an explicit diagnostic, any unit carrying
active pointer, nonzero journey revision or retained journey/command evidence.
Take the unit coordinator and recheck before deletion; no seed cleanup may remove
a captured/open unit between the check and delete. Leave unrelated seed content,
Flota facts and notifications outside this change.

PostgreSQL regression tests must pause stale catalog/assignment writers across
departure/return commit, then prove lifecycle state/pointer/revision/timestamps
are preserved. Re-run actual seed/bootstrap paths after both departure and return
and prove the same journey/audit/receipt/context remains. Include seeded new units
after capture and captured placeholder-key units; initial demo fixture setup
cannot stand in for restart verification.

## Legacy and missing-history return

At drained cutover materialize one LEGACY_OPEN row for each EN_RUTA unit and bind
its pointer. Store existing salida_at, ambito/destino as observed legacy context,
not asserted departure facts. Departure effective/registered time, actor, driver,
authorization/audit link stay null with named history_gaps. Do not heuristically
link an old audit or use migration time as departure time. Existing old audits
remain independently queryable. Do not create rows for already closed trips.

If an EN_RUTA unit lacks its record later, a bound authorized return can atomically
materialize LEGACY_RECOVERED and close it, preserving the expected UUID if present,
or allocating one for the sentinel. A MISSING_ROW command requires the exact dangling
pointer UUID and unit revision but no fabricated journey revision. MISSING_POINTER
requires the matching sentinel and still-absent pointer. Revalidate these explicit
absence states before recovery; a new/returned/other-unit row is a conflict.
Record current observation plus missing-history
reason, no new departure proof. Distinguish absence from a database read failure:
source failure rolls back, never fabricates legacy. Another existing open journey
or a different-unit reference is an integrity conflict, not permission to guess.
No silent repair of pointers with contradictory existing rows.

Thus a missing historical start cannot erase a real current return. A new reliable
return does not make the old interval complete or prove yard availability.

## Additive migration, capture boundary and recovery

Prepared additive migration (rehearsed only on disposable PostgreSQL):
api/src/db/migrations/1792022400001-LogisticaJourneyHistory.ts,
class LogisticaJourneyHistory1792022400001. Recheck name/ordering before coding.
Use a dedicated isolated Logistics migration DataSource/runner with an explicit
allowlist and public.logistica_schema_migrations journal; no opportunistic addition
to production startup/release preparation or implicit old migration replay.

In one controlled transaction: verify required legacy unit/audit tables and
columns, add two columns/tables/indexes/checks, record capture epoch and seed
LEGACY_OPEN rows/pointers for EN_RUTA units with revision 0. New departures/returns
increment from there. No old audit rewrites. Writers must be drained before
snapshot and remain drained until all lifecycle writers/clients use this contract;
migration timestamp is a reliable boundary only when that condition is verified.
Record committed boundary, source version, counts and verification in evidence.
No production rollout is authorized by design approval.

Missing schema/config must report not ready through GET /health/ready (503);
GET /health remains liveness only. No epoch is automatically invented. Use a
fail-closed command path, never a history-discarding fallback. New units start at revision 0/null pointer via
additive defaults. Existing application fixtures must register the entities;
synchronize-based E2E alone cannot verify migration behavior.

Migration failure rolls back as a unit. Retry checks journal/schema/data
consistency; IF NOT EXISTS alone is not verification. down is permitted only in a
confirmed disposable/pre-capture database with no CAPTURED rows, return endpoints,
command receipts or post-cutover revisions; legacy baseline rows may be discarded
only there. Any actual capture => refuse down, drain writers, preserve/export data,
and apply forward recovery. Never revert to the old return writer after capture.
An interrupted capture becomes an explicit coverage gap/new epoch; no guessed fill.
Backups/restores and external migrations require separately authorized operations.

## Approval boundary

Owner approved ADR027, this contract, UTIL-J01–J12 and the expanded execution
brief in this chat: “okay go ahead with the plan”. [EWO-041](../engineering-work-orders/EWO-041.md)
records the actual approval reference and execution. Earlier Q1 approved automatic
resumption only; the earlier conditional approval was not used.

The broad ABC-UTIL contract and later slices remain Proposed. No production
readiness, external migration or deployment approval follows from EWO-041.
See [implementation evidence](../evidence/EWO-041.md) for actual verification and limits.
