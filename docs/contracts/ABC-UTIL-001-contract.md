# ABC-UTIL-001 — Proposed operational contract

## Status, authority and scope

Proposed engineering detail, 2026-10-15. Product/ownership decisions are confirmed
in [ADR025](../adr/025-abc-utilization-downtime.md); acceptance criteria belong to
[ABC](../specs/ABC-daily-release-spec-and-gap-analysis.md) and
[UTIL](../specs/SPEC-UTIL-INPUTS-001.md). This is not an approved schema/API design,
execution EWO or deployment instruction. The decision-linked extensions below
replace conflicting target behavior in the older CHK contract only as specified;
unchanged auth/storage/calendar/legacy contracts remain authoritative.

## Owner boundaries

| Fact | Owner / authorized seam |
|---|---|
| Identity and administrative eligibility | Existing Kernel catalog/auth ports |
| ABC, findings, verification, technical holds | Mantenimiento |
| Downtime episode/reason ledger and projection | Mantenimiento capability; proposed records below, no new BC |
| Operational stop, assignment/routing, external release | Logistics commands through downtime owner; no direct table write |
| Trip authorization/departure/return | Logistics durable journey contract |
| Physical transition and custody signatures | Flota owner capability |
| Reports | Read projection over versioned owner facts; no source editing from graph |

Keep opaque references, schema-per-module, no cross-schema SQL JOIN/FK or parallel
WorkOrder identity. Remote/storage operations are outside SQL commit; existing
verified immutable objects are referenced inside commit. Notify stacks unchanged.

## Minimum facts (logical, not SQL)

- Episode: unit, effective start/end, revision, registration times and source refs.
- Reason: stable ID, episode/unit, maintenance/operational/external category,
  source order/stop/event, responsible team, effective start/resolution, actor and
  supersession. Completion history is append-only; active set drives current state.
- External service: stop/episode, routing assignment, release evidence/actor/time;
  separately versioned cost amount+currency or pending. Proposed amount validation:
  finite nonnegative decimal in configured currency precision, no negative refund
  inference, zero only explicitly confirmed; bound precision/size/currencies before
  implementation. No receipt/provider/tax field required by product decision.
- Journey: stable ID, authorized unit/driver/destination/scope, authorization state,
  departure and durable return endpoints, actors, revisions and correlation ref.
  Keep existing departure audits. Never fabricate an endpoint from current state.
- Verification: base ABC, named finding/hold IDs, repair refs, new facts/evidence,
  result, assigned signer and policy version, immutable snapshot/hash and signature.
- Correction: target revision, replacement facts, effective time, original
  registration, justification, actor, request ref and affected interval preview.

Do not infer downtime start from legacy OT timestamps. Reconcile existing active
work with confirmed effective time before activating new gates/report coverage.

## Commands and common guarantees

Every command validates TrustedActor, resource/facility, existing capability,
state, expected revision and command identity. Identical durable retry returns the
same outcome; conflicting payload/version returns current references for review.
No actor, time, result or permission from a browser can override server authority.

Unit coordinator locks unit first, then order/episode/reason/resource in deterministic
order. All authorization-affecting writers participate, including required-check
creation/cancellation, order opening/completion/cancellation, reason handoff,
correction with current impact, verification, safety hold, documents and movement.
Owner ports share the monolith transaction context; no foreign-owner writes.

| Logical command | Atomic owner effects / invariant |
|---|---|
| OpenMaintenance | Validate existing opening rights; opened marker + source-linked reason + start/join episode; no event claiming repair performed. |
| RecordCorrectiveStop | Logistics capability; add operational reason once, preserving observed start. |
| RouteInternal | Carry source refs into standard maintenance flow. On authorized opening atomically transfer/resolve an explicitly handed-off operational reason only when its owner agrees; otherwise retain both. Never clear on draft creation. |
| SaveExternalCost | Version cost only; no reason/episode resolution. |
| CompleteExternalService | Resolve own external reason on actual release; leave safety and other reasons untouched. Pending cost is visible, not fabricated. |
| CompleteMaintenance | Preserve maintenance closure/consumption/event semantics; resolve own reason, maintain independent safety/recheck obligations. |
| CancelMaintenance | Choice-specific survivor/justification/unresolved successor; resolve only own contribution and recompute, preserving audit. |
| ApplyCorrection | Administrativo, preview/justification; append supersession, reconcile current active reasons/gates and invalidate affected projection ranges. |
| CompleteVerification | Assigned mechanic; immutable fresh evidence; resolve only named eligible obligations. Failed result retains hold. |

Final persistence design must enforce one open episode per unit and one applied
source contribution per opening/event, including replay. Episode end occurs when
its last active reason resolves; overlapping causes produce auditable segments.
Historical correction validates same-unit ordering and prevents duplicate total
episodes without rejecting genuine trip/downtime overlap. Invalid operations
leave originals unchanged. Never resurrect completed/cancelled work implicitly.

## Effective approval and signing

Evolve SignedCheckReadPort/DeparturePolicyPort to expose base ABC, scoped verified
finding resolutions, unresolved holds/invalidations, required active work, expiry,
versioned evidence and complete cause list. Latest-created completed record alone
is insufficient. Never fall back to an older FIT to bypass newer UNFIT/requirements.

An append-only repair requirement must carry eligible finding/order scope. A
legacy blanket invalidation has no assumed scope; unresolved legacy cases require
full inspection/authorized reconciliation, not silent reclassification. Recheck
does not clear incident/blanket invalidation or extend base day. New-day daily ABC
can satisfy the new calendar requirement while persistent repair hold still exists.

Proposed combined signing: display a manifest of distinct daily ABC and recheck
snapshots, constituent hashes, named requirements, evidence, signer and policy
versions. Sign the manifest hash with a fresh canvas; atomically persist the
manifest and both immutable records/approvals. Any constituent change rejects the
whole stale candidate. Failed required verification cannot produce an operable
effective approval. This requires schema/storage/API review and is not provided
by the old single-record signature contract.

Independent serious safety holds survive maintenance terminal status and next-day
ABC. Only authorized personal verification clears eligible named holds. Ordinary
nonblocking drafts/corrective existence remain distinct from opened downtime.

## Correlated authorization and physical departure

Separate Logistics permission, journey, and Flota movement IDs. Owner ports carry
correlation and record references, without implicitly synchronizing loops.
At authorization validate current gates; at physical commit validate again with
fresh calendar time. Exempt only the exact same correlated journey from the
already-in-route duplicate check; another journey, different unit, reused consumed
authorization or incompatible movement is rejected. Final binding/order of journey
start and custody commit must be reviewed against existing APIs before execution.

Any new blocker/expiry suspends authorization; reconfirmation retains business
inputs and refreshes approval/document refs. Keep old decisions as audit. One
consumption per physical departure; repeat identical commit returns same record.
Preserve CHOFER/AVAL. Return records remain usable under existing signatures/km/
time rules even if insurance/ABC expired. Historical late events are corrections,
not a bypass of new-departure policy.

## Reporting and failure contract

Store effective and registered times, source revisions and calculation revision.
Fleet/detail use the same snapshot; pending recalculation serves last-known totals
with visible as-of rather than a mixture. Report source gaps, unassessed eligibility
and held/unconfirmed yard separately. Current readiness uses live owner facts,
never a potentially stale report projection. Pagination/filter counts are scoped.

Missing auth/scope rejects; stale/duplicate-incompatible commands conflict; missing
required safety policy/facts prevents completion; authoritative source failure
fails closed technically. Persistence failures do not emit success. Unknown network
outcomes reuse command identity. Follow existing error shape/code conventions;
exact endpoint names and payload codes remain design work, not invented runtime API.

## Required pre-execution review

Validate safety matrix, defect evidence limits and issue-link grouping; external
cost precision/currency limits; reason-handoff authority; manifest signing/storage;
departure correlation/commit boundary; historical correction projection and rollout
reconciliation. Add schema/migration/index/rollback designs and reviewed AC-to-test
mapping to bounded EWOs. No general rewrite of old EWOs, permissions or runtime
is authorized by this contract.
