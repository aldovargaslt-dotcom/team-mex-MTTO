# ABC release and fleet utilization — product intent

## Status and owner

Product direction confirmed by the user; consolidated 2026-10-15. Not an
implementation-ready approval: technical safety definitions and proposed contracts
remain outstanding. [ADR025](../adr/025-abc-utilization-downtime.md) owns decisions.

## Summary and business problem

Make daily inspection, repair verification, Logistics release and fleet history
explainable with minimal duplicate entry. An open maintenance order now means the
unit has been withdrawn; preparation stays draft. Current journey state alone is
insufficient to reconstruct historical duration.

## Users and desired outcome

Mechanics inspect/sign; Maintenance Supervisor/Administrativo manage technical
work; Logistics routes corrective stops and authorizes departure. Both teams see
one episode with their own reasons. Every unit displays current status; fleet and
per-unit reports distinguish trip, downtime, held/available yard time and gaps.

## Scope and confirmed rules

- Limited visual-only ABC, immutable signature, focused signed recheck.
- Automatic downtime on maintenance opening; reason-based completion/cancellation.
- Logistics external-service or contextual internal-corrective routing.
- Bounded external-service cost capture; explicit completion separate from cost.
- Correlated journey/custody, current gates at actual departure, durable returns.
- Audited corrections, reliable coverage boundary and consistent drill-down totals.

## Non-goals

PSI and expanded routine mechanical inspection; mechanic productivity; GPS/TMS;
general costing, procurement/accounting or inventory changes; automatic physical
movement from work-order existence; replacing administrative state with downtime.
Numeric fuel/odometer transcription, conditional route restrictions and phase
tracking are deferred. Existing non-goals remain outside these named extensions.

## Current evidence, risks and success measures

The reviewed source has CHECK, evidence/signing, departure coordination and audits;
it does not prove deployed readiness. Returns lack durable journey endpoints;
active CHECK and effective approval need reconciliation. Capture actual actor/time
without retrospective invention. Technical safety policy needs Maintenance review.

Measure duplicate routine inputs, unexplained status cases, reporting coverage and
consistency of gate decisions during pilot. Baselines and numeric targets are not
known; do not claim improvements before measurement. Product owner reviews pilot;
Maintenance validates safety and Logistics validates operational flows.

## Related artifacts

Behavior and canonical AC: [ABC](../specs/ABC-daily-release-spec-and-gap-analysis.md)
and [downtime](../specs/SPEC-UTIL-INPUTS-001.md). [UX](../design-system/ux-utilization-inputs-v1.md).
[Plan](../../workspace/shaping/abc-utilization-implementation-plan.md). No execution
EWO is created or authorized here.
