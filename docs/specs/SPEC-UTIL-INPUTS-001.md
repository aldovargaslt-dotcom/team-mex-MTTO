# SPEC-UTIL-INPUTS-001 — Operational inputs and utilization

> Extensión de análisis propuesta, cliente2026-10-18:
> [SPEC-AN-MTTO-001](SPEC-AN-MTTO-001.md) consolida las cuatro vistas, costos
> externos y horarios configurables acordados en Q1–Q16. Su Utilización en
> horario esperado es un indicador adicional propuesto, distinto del denominador
> histórico de F6. No sustituye silenciosamente F6, ni aprueba contratos de
> reporting/horarios, ni modifica las autoridades de motivos/liberación. Resolver
> su contrato antes del slice de implementación correspondiente.

## Status

Revised 2026-10-15. User-confirmed product rules, with technical contracts Proposed
and safety validation pending; NOT implementation-ready. Supersedes the supplied
draft's manual-only maintenance downtime behavior. D1–D6 product choices are resolved
below; unresolved engineering gates are explicit. [ADR025](../adr/025-abc-utilization-downtime.md)
owns decisions. [UX](../design-system/ux-utilization-inputs-v1.md) owns interactions.

## Problem, context and goals

OT preparation, actual withdrawal, physical location, journey, safety holds and
historical duration are different facts. Record withdrawal as part of opening
maintenance, let Logistics route operational stops, and reuse existing context.
No separate utilization form or duplicate technical inspection entry.

The supplied inventory described older code (including PSI/default normal facts),
not desired behavior. Current source has departure audits but returns clear
salidaAt without durable return endpoints. Physical history alone does not prove
historical release eligibility. Source support is not deployed-data readiness.

## Actors and ownership

Mantenimiento owns the downtime ledger and internal technical work; Logistics owns
operational reasons/routing and external completion, through owner contracts.
Supervisor/Administrativo manage maintenance reasons; existing authorized mechanic
opening remains valid and automatically contributes downtime. No general manual
downtime management, maintenance creation/closure or Flota permission is inferred
from being a mechanic. Each actor needs proven facility scope and existing writer
capability. ADMIN_DIRECTIVO is the canonical Administrativo role.

Administrativo applies historical corrections; Supervisor/Logistics request them.
Flota owns physical transitions. Logistics authorizes departure. Shared visibility
does not grant cross-team clearance rights or cross-module table writes.

## Functional behavior

### F1 — Prepare and open internal work

Creating/editing a draft has no downtime effect. Opening PREVENTIVE/CORRECTIVE
means withdrawal now, not scheduling future work. Reuse unit/order/actor/time and
cause; the existing opening confirmation states the effect, without a second
normal downtime form. On-route opening requires explicit confirmation of current
unavailability. Preserve the trip; never invent a return or workshop movement.

CHECK, REQUIRES_WORK preparation and generated unopened correctives do not start
downtime. Existing maintenance capture, parts and signatures keep their semantics.

### F2 — Logistics corrective-stop routing

Logistics records/assigns a corrective stop, with contextual unit, observed issue,
actor and current time. If unavailability is already recorded, reuse its episode.
Choose external service or internal repair; internal routing carries context into
standard corrective creation and its authorized opening. No new Logistics power
to edit/sign/close internal maintenance is implied. Preserve the operational reason
until an explicit coordinated handoff is acknowledged; never clear it merely on
draft creation. The exact handoff contract is Proposed, not implemented.

External service captures bounded service cost associated with the stop. Saving
cost never ends downtime. Logistics explicitly confirms External service completed
on real release; remaining reasons/technical verification still apply. Proposed
minimum cost contract is amount+currency, pending cost allowed and audited revision
history. No full procurement, tax, accounting or parts-purchase subsystem is added.

### F3 — Reasons, completion and cancellation

One open episode per unit; multiple orders/reasons; one order can span later
episodes. New reasons do not reset the start. Each team resolves its own reason.
Last reason resolution ends the episode; OT completion does not resolve independent
operational reasons, physical movement, journey or safety holds.

Cancellation choices are duplicate/replaced (link survivor), mistaken opening
(justification), or abandoned work (explicit unresolved successor reason). No
automatic safety clearance. Recompute present status from remaining facts: yellow
before an order can become downtime while open and yellow again after cancellation
if still applicable. Never restore stale state. Preserve genuine historical
downtime; mistaken history is separately corrected by Administrativo.

No auto-closing by timeout. A forgotten reason is flagged for review, not erased.
Ending downtime does not mark the unit ready to depart.

### F4 — Physical location and technical holds

Opening/closing work does not alter administrative ACTIVA/INACTIVA, record a yard
return or set EN_TALLER. Use Flota's authorized explicit capability for genuine
movement. Combined effects require authorization for each and coordinated commit;
otherwise separate actions show separate results. Do not claim full success on
partial persistence. Existing CHOFER/AVAL remain applicable.

Serious technical holds persist independently of order terminal status. Signed
verification resolves only named eligible holds. Last-order completion can end
downtime while verification remains pending; failed recheck offers linked Continue
repair and retains the hold. See [ABC](ABC-daily-release-spec-and-gap-analysis.md).

### F5 — Correction and historical coverage

Normal effective time is server current time. Administrativo corrects with
justification, explicit business-timezone effective time and before/after interval
preview. Preserve originals, registration time, actors, source and revision. No
arbitrary age cutoff for evidence-supported correction; no unsupported reconstruction.
Changes to a trip are applied through its owner, not direct ledger table writes.

Keep prior authorization decisions as contemporaneous audit. A correction with
current impact must coordinate/recompute current gates; it cannot retroactively
authorize an earlier movement. Recompute affected unit/ranges, show pending status,
and do not mix report revisions in fleet/detail totals. Exact latency target is a
readiness input, not an invented guarantee.

### F6 — Always show current status; report supported intervals

Every unit displays identity, current physical/journey/maintenance/readiness facts,
remaining reasons, source freshness and next action. Missing/conflicting source =>
Requires confirmation, never inferred available. Known current state cannot prove
an unknown historical transition time. Graph colors are reporting categories, not
an override of departure policy. Yellow returning after cancellation is derived
from current causes; no user-maintained color field is introduced.

Use half-open intervals [start,end), actual elapsed time, clipping to the reporting
window/cutoff. Union downtime once per unit. Retain separate trip evidence; a
genuine in-trip breakdown is valid overlap, not automatically an inconsistency.
Flag actual contradictions/missing endpoints without fabricating a return.

Exclusive totals: downtime first; trip outside downtime; evidenced yard split into
available, held, availability unconfirmed; remaining eligible time unclassified.
Require positive yard evidence and historical gate evidence for available status.
Awaiting required recheck after downtime ends is held yard time only if yard
presence is evidenced. Multiple causes give operational/maintenance/mixed segments;
never arbitrarily allocate simultaneous time between causes.

Fleet overview includes range/facility filters, category hours, coverage, cause
breakdown and drill-down. Unit detail explains source intervals, reasons, linked
orders/CHECK/rechecks, corrections and current holds. Both use identical calculations.
Denominator is elapsed historically eligible administrative-active unit-time in
the selected facility/window, including unclassified time. Demonstrably inactive
time is excluded; unknown eligibility/facility is separately unassessed, never
assumed active. Show hours/coverage first; percentages only with supported
eligibility/denominator. No scheduled-shift or engine-productivity claim.

Reliable capture begins at the verified boundary; prior history is imported only
with trustworthy evidence. Existing open orders at rollout need explicit current
reconciliation; do not backdate downtime to their creation/opening without proof.

## State transitions and D1–D6 resolution

| Trigger | Result |
|---|---|
| Draft / daily ABC / prepared corrective | No downtime transition |
| Maintenance opens / confirmed operational stop | Start or join episode and add reason |
| Order/service completes | Resolve own reason; close only with none remaining |
| Cancellation | Resolve/transfer own contribution according to explicit choice; preserve safety/history |
| Required verification pending | Separate safety hold, not automatic continuing maintenance downtime |
| Correct event | Append correction and recompute; preserve original/audit |

D1: shared scoped responsibilities above. D2: explicit withdrawal, independent
location/holds, current derived status. D3: phase tracking deferred. D4: CHECK alone
never starts downtime; opening its maintenance does. D5: justified correction and
visible report revision, latency target still unverified. D6: physical movement and
reason resolution have distinct effects. These replace the uploaded draft's open
product choices; no technical readiness is implied.

## Canonical acceptance criteria

| ID | Given / when / then |
|---|---|
| UTIL-01 | Draft or daily ABC => no downtime; explicit maintenance opening => one reason/episode, no duplicate form or invented movement. |
| UTIL-02 | Two open orders => one unioned episode; completing one leaves the other reason and original start. |
| UTIL-03 | Yellow → open → cancel => recomputed yellow if appropriate, not stale snapshot; independent reasons/holds survive. |
| UTIL-04 | Duplicate/mistaken/abandoned cancellation => survivor/justification/retained unresolved reason as applicable; genuine history remains. |
| UTIL-05 | On-trip opening/breakdown => explicit confirmation, original trip preserved, no fabricated return. |
| UTIL-06 | Logistics routes external/internal => same episode and original time, contextual internal flow, no broadened maintenance privileges. |
| UTIL-07 | External cost saved => downtime unchanged; explicit service completion resolves only its reason. |
| UTIL-08 | Operational and maintenance reasons => each team clears only own authorized reason; last resolution ends downtime. |
| UTIL-09 | Genuine workshop/yard return or combined action => authorized Flota transition; no implicit journey change or partial-success claim. |
| UTIL-10 | Failed recheck => hold remains; Continue repair reuses issue and starts/joins downtime on authorized opening. |
| UTIL-11 | Historical correction => originals/justification/preview/timezone retained; current impact coordinated and affected reports visibly recalculated. |
| UTIL-12 | Duplicate/retried/concurrent start/end/cancel/correction => idempotent outcome or referenced conflict, no lost reason/double episode. |
| UTIL-13 | Unauthorized/facility mismatch => no mutation; unknown network outcome reuses command identity; failed save preserves input. |
| UTIL-14 | Every unit => current status/reasons displayed; unknown historical endpoint does not become available time. |
| UTIL-15 | Window/open intervals/mixed causes => totals reconcile using clipping/union; fleet and unit agree at same revision. |
| UTIL-16 | Last OT closes at 14:00, verification at 16:00, evidenced yard => two hours held yard, not available or continuing maintenance downtime. |
| UTIL-17 | Valid breakdown overlaps trip => source layers preserved; elapsed downtime counted once without blanket inconsistency warning. |
| UTIL-18 | Missing eligibility/facility/return history => explicit coverage/unassessed time; denominator not improved by dropping unknown eligible hours. |

## Bounded journey slice — AC

Status: Approved for EWO-041, 2026-10-15. Approval reference: owner in this chat,
“okay go ahead with the plan”. These criteria bound durable Logistics journey/return capture only.
[Contract](../contracts/LOG-JOURNEY-001-contract.md),
[ADR027](../adr/027-logistica-durable-journeys.md) and
[execution brief/test mapping](../engineering-work-orders/LOG-JOURNEY-001-execution-brief.md)
form the approved bounded package. Owner authorized implementation in this chat:
“okay go ahead with the plan”. Results belong to [EWO-041 evidence](../evidence/EWO-041.md);
these criteria do not approve the global ABC/UTIL feature.

| ID | Given / when / then |
|---|---|
| UTIL-J01 | Successful new departure => one stable journey and exact existing departure audit reference persist atomically with EN_RUTA/salidaAt; repeated trips keep distinct records and immutable departure context. |
| UTIL-J02 | Matching genuine return => effective and registered times plus trusted actor/auth attribution and authorized facility versions persist before current departure state is cleared; later assignment changes do not rewrite historical driver context. |
| UTIL-J03 | Existing departure blockers => unchanged policy rejection and no partial writes; authorized genuine return remains possible despite expired ABC/insurance, inactive administrative state or invalid operational-calendar config when resource mapping/scope are valid, without implicit Flota/custody mutation or new departure-readiness requirement. |
| UTIL-J04 | Identical committed retry => original 204, endpoint, actor and times; incompatible key/payload or stale journey/revision => referenced conflict. Concurrent departure/return/two return intents cannot duplicate endpoints or close a later trip; J1 retry after J2 departure touches only J1's receipt. |
| UTIL-J05 | Audit/journey/return/unit/receipt persistence failure => transaction rolls back together; postcommit response/notification failure => durable receipt supports safe retry without duplicate history or later-trip mutation. |
| UTIL-J06 | Existing EN_RUTA legacy or genuinely missing historical record => explicit incomplete legacy representation and authorized matched return; dangling UUID uses MISSING_ROW with null journey revision, absent pointer uses MISSING_POINTER/sentinel; absence is revalidated under coordination. No fabricated departure/driver/actor/audit or closed-trip reconstruction. Contradictory/appearing history conflicts; source failure is not missing data. |
| UTIL-J07 | Missing/forged trusted actor, wrong role/facility or unavailable facility mapping => no mutation; frozen confirming-subject mismatch against current authenticated subject also rejects initial/replayed commands without disclosure. Return attribution comes only from AuthenticationPort; committed replay validates current scope. |
| UTIL-J08 | Additive migration/cutover => recorded verified capture boundary and legacy counts, drained old writers and isolated rehearsal; failure is atomic, populated history refuses destructive down, interruptions remain explicit coverage gaps with forward recovery. |
| UTIL-J09 | Both existing return callers and departure caller => unchanged business fields/empty 204 response; actual browser/BFF/API path preserves every binding header. Only confirmed pending commands resume automatically after reload, including first commit if unsent, with original subject/key/body/history expectations and at most one automatic attempt per load. Drafts never replay; identity/scope/state conflicts suspend replay. Stale metadata is never rebound; obsolete unbound calls reject without mutation. |
| UTIL-J10 | Captured/legacy/missing history is read => exact provenance, capture epoch and unknown endpoints remain distinguishable; a reliable new return cannot imply an unknown earlier interval was available or complete. |
| UTIL-J11 | Catalog/status/assignment update overlaps departure or return => its permitted fields change while lifecycle state, trip context, active pointer, revision and endpoints remain intact; no stale full-entity save can reverse the committed journey. Existing status/assignment authority and validation remain enforced under coordination. |
| UTIL-J12 | Startup seed/bootstrap runs after departure or return => recorded lifecycle state/context/pointer/revision and journey/audit/receipt evidence remain unchanged. Captured placeholder units are not deleted; post-capture ordinary seed creates no unaudited EN_RUTA trip. Disposable pre-capture fixtures remain explicitly separate. |

UTIL-05/11/12/13/17/18 remain broader related constraints. This slice does not
complete historical correction, downtime overlap/reporting, safety or the global
UTIL feature. Bounded execution is approved; verification results are recorded
in EWO-041 evidence.

Owner decision reference for automatic resumption: this chat, 2026-10-15,
reply “1. Yes” to GrillMe Q1. That answer resolves retry behavior only; bounded
design/spec/ADR and implementation were subsequently approved by “okay go ahead
with the plan”, recorded in [EWO-041](../engineering-work-orders/EWO-041.md).

## Constraints, non-goals and verification

Preserve module ports, opaque IDs, no cross-schema JOIN/FK or new WorkOrder/BC.
No routine timestamps, color/duration/percentage input, phase updates, new mandatory
ABC step, GPS or general costing. Existing safety gates stay enforced during pilot.

Planned: UTIL-01–10/14–18 domain+API integration; UTIL-11–13 real PostgreSQL
correction/concurrency/auth tests; desktop/mobile role walkthroughs and separate
visual review for UX states. The bounded journey subset has separate
[EWO-041 evidence](../evidence/EWO-041.md); other new AC remain unimplemented.
All affected data/migration/endpoint designs remain [Proposed](../contracts/ABC-UTIL-001-contract.md).
Approve technical handoff/cost contracts and safety policy, then bounded EWOs.
Product: [PRD](../prds/abc-utilization-v1.md); plan:
[delivery](../../workspace/shaping/abc-utilization-implementation-plan.md).
