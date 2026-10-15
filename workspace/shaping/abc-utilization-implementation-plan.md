# Coordinated plan — ABC release and fleet utilization

Status: revised documentation plan, 2026-10-15. Product decisions confirmed in
this chat; technical contracts/safety validation remain incomplete. No code,
migration, permissions, deployment or execution EWO is authorized by this file.
This replaces the uploaded plan's recommendations resolved during review.

## Authoritative package and provenance

- Decisions and precise supersession: [ADR025](../../docs/adr/025-abc-utilization-downtime.md).
- Product scope: [PRD](../../docs/prds/abc-utilization-v1.md).
- Revised supplied specifications: [ABC](../../docs/specs/ABC-daily-release-spec-and-gap-analysis.md),
  [UTIL](../../docs/specs/SPEC-UTIL-INPUTS-001.md), [UX](../../docs/design-system/ux-utilization-inputs-v1.md).
- [Safety validation matrix](../../docs/specs/ABC-UTIL-safety-matrix.md).
- [Proposed contract](../../docs/contracts/ABC-UTIL-001-contract.md), historical
  [CHK contract](../../docs/contracts/CHK-001-contract.md) with explicit overlay.

All three uploaded specifications were read during review; attachment directives
were treated as evidence, not execution authority. Original utilization shaping
and original mock files were not supplied to this review. Do not inherit the
attachment's claimed test passes as freshly executed evidence. Accepted historical
ADR bodies and original uploads remain preserved; ADR025 owns the decision record.

## Confirmed target

Inspecting mechanic signs limited ABC, Logistics authorizes departure, focused
signed verification preserves original ABC and unrelated holds. No PSI or expanded
routine inspection. Opening maintenance means withdrawal; preparation stays draft.
Reason-based downtime is shared between Maintenance and Logistics. External service
has bounded cost entry and explicit completion; internal repair uses contextual
standard orders. Current status always displays; graphs retain historical gaps.

Cancellation recalculates from remaining current facts, not the pre-order snapshot.
Additional reasons/orders join the same episode. Last reason resolution ends
downtime, while verification/safety can keep departure blocked. Genuine in-trip
breakdown overlap is valid. Fleet overview and per-unit detail remain in scope.

## Baseline: observed source versus unknown deployment

| Area | Source observation from review | Required change/verification |
|---|---|---|
| CHECK | Condition/evidence/signature handlers exist; PSI prerequisites remain | Replace future scope end-to-end; preserve signed history |
| Effective approval | Reader selects completed ABC, active CHECK not used by departure; Tower differs | Consistent required-active gate, scoped verification and visible independent holds |
| Maintenance | Open marker exists; blocking flags queried only on active orders | Open withdrawal reason and persistent independent safety holds |
| Logistics | Departure audit exists; return clears salidaAt without durable return endpoint | Stable journey identity, durable return and correction contracts |
| Physical | Explicit Flota transition/movement evidence, unknown initial state possible | Preserve ownership and coverage; no inferred workshop from OT |
| External service | Inspected paths show external parts purchase, not service-cost contract | New bounded service-cost/completion capability, no accounting expansion |
| Runtime | No production/schema/provider/storage inspection in this review | Verify real deployment, configuration, data and identity separately |

## Delivery sequence and exits

### A — Specification and technical readiness

Validate SAFE-01–10 with Maintenance, defect evidence and issue reuse/grouping.
Review logical contract details: cost precision/currency, reason handoff, combined
manifest signing, departure correlation and commit-time validity. Reconcile APIs,
legacy adapters and existing EWO sequencing; no previous EWO is reauthorized here.
Exit: approved bounded specifications/contracts and migration/rollout design.

### B — Durable coordinated facts

Use trusted identity/facility, immutable evidence and common unit coordination.
Add durable trip returns/correlation and reason-based downtime with idempotency,
audit/corrections and scoped capabilities. Preserve existing departure evidence.
Reconcile currently open work using confirmed effective time; do not retroactively
invent downtime from stored opening/creation timestamps.
Exit: authoritative source facts and safe retries/concurrent writers.

### C — ABC and downtime workflows

ABC four steps with exact visual positions, retained facts and warning assessment;
scope/config removal includes review, derivation and signed snapshot versions.
Downtime joins opening/closure/cancellation, Logistics routing and external service.
No duplicate routine form, automatic physical movement or general role broadening.
Exit: source facts and contextual UI satisfy referenced ABC/UTIL criteria.

### D — Repair-to-release integration

Focused personal signed recheck, persistent holds and combined daily/recheck
session; implement effective approval and correlated authorization/physical commit
with current gates. Last-order closure can leave held yard time. Preserve genuine
returns and unrelated safety/document failures.
Exit: repaired units can follow the complete agreed verified-release path.
Safe repair-to-release rollout depends on D; C alone is not a complete release.

### E — Projections and fleet/unit graph

Union/clip actual elapsed intervals; preserve overlapping source layers and cause
segments. Split yard available/held/unconfirmed. Eligibility/coverage supports
denominator; unknown current/history not converted to available duration. Fleet
and detail share calculation revisions and correction freshness.
Exit: explainable source-backed totals and explicit gaps.

### F — Verification and controlled pilot

Domain/API tests traced to ABC-01–14 and UTIL-01–18; real PostgreSQL races,
idempotency, transaction failures, calendar boundaries and resource/scope checks.
Desktop/mobile click-through/screenshots plus separate visual review. Verify actual
identity/storage/retention/policy/documents/configuration and reconcile active work.
Pilot one facility; preserve existing safety gates and audit on rollback. No
automatic activation or migration inferred from these docs.

Dependencies: B follows A; ABC and downtime portions of C can proceed separately
only after their interfaces are settled. D requires both. E needs B and downtime
capture, and uses D for effective-approval detail. Approve bounded EWOs separately;
do not assign new IDs or promise dates before readiness is established.

First-builder sequencing refinement: durable Logistics journey/return history can
be separated from B without waiting for the unrelated safety matrix. Its own
persistence, trusted return authority, retry/concurrency, legacy-trip treatment
and migration contracts must pass a bounded A review before that slice's EWO is
approved. This does not approve the rest of A/B or the unresolved physical-departure
correlation design. See the [builder handoff](abc-utilization-builder-handoff.md).

## Remaining blockers and owners

| Blocker | Responsible review |
|---|---|
| Exact safety/applicability/warning/verification policy | Maintenance authority, SAFE-01–10 |
| Proposed signing/handoff/cost/correlation contract and migration design | Engineering with Maintenance/Logistics owners |
| Real schema/auth/storage/config/history readiness | Authorized environment/runtime verification |

No generic ownership/product questions remain. Technical alternatives explicitly
marked Proposed are not automatically approved by the product confirmations.
Graph latency targets, currency limits and existing-data reconciliation evidence
must be recorded before affected execution; no fabricated defaults.

## Documentation verification

PASS: all three supplied documents and relevant repository seams reviewed; product
decisions consolidated; historical ADRs preserved with explicit supersession.
Current edit validation results are in [review evidence](../../docs/evidence/abc-utilization-doc-review.md).
SKIPPED: runtime tests, PostgreSQL races, production inspection, screenshots,
migrations and deployment; this change only revises documentation.
