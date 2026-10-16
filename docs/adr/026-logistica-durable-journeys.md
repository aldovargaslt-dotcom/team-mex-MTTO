# ADR-026 — Durable Logistics journeys in the existing Kernel seam

## Status

Accepted for EWO-038 implementation, 2026-10-15. Approval reference: owner in this chat,
“okay go ahead with the plan”. No external migration or deployment authorization. This is the bounded persistence amendment to ADR011/ADR025; it
does not approve ABC-UTIL-001 as a whole.

## Context

Current Logistics writes public.unidades and public.logistica_departure_audits.
Return discards salida_at; there is no return actor or durable journey identifier.
Flota movements are independently owned evidence. A retry after a later departure
must never close the later journey.

## Decision

Keep Logistics as the application service on Kernel, not a new bounded context.
Add public.logistica_journeys, public.logistica_journey_commands and
public.logistica_journey_capture, plus two journey coordination columns on
public.unidades. The detailed proposed fields, constraints and transitions are in
[the slice contract](../contracts/LOG-JOURNEY-001-contract.md).

Journey ID identifies one Logistics operational trip from its registered departure
to its registered return; it is not physical movement, an ABC, or a mutable
authorization ID. Later physical-correlation work must reuse that meaning.
Departure audit remains immutable and is referenced uniquely by the new journey.
No foreign-owner SQL JOIN/FK, Flota writes, new catalog or permission grant.

Per-unit monotonic revision, shared unit coordinator, row locks, unique open
journey and durable successful-command receipt jointly prevent duplicate endpoints
and stale return against a later journey. Browser transport carries command ID and
frozen journey/revision/history-state expectations and confirming-subject equality
precondition; trusted identity alone supplies attribution. The actual web BFF must
preserve those headers. Explicit missing-history states allow absent journey
revision without inventing one; row/pointer absence is revalidated under unit lock.
Return uses resource-only facility authorization, leaving departure calendar and
policy unchanged.

Owner retry decision, 2026-10-15, this chat reply “1. Yes” to GrillMe Q1: already
confirmed pending commands may resume automatically on reload, including a first
commit if the original send never arrived. Reuse the exact saved key/body/subject/
expectations; current gates still apply to any first commit. Identity/scope/state
conflicts suspend replay. This behavior decision is confirmed; overall ADR/design/
execution approval was subsequently granted by “okay go ahead with the plan”,
recorded in EWO-038. No external migration/deployment approval.

Legacy open journeys are explicitly incomplete. Unknown departure actor, driver,
effective time and authorization stay unknown. Current assignment is not proof of
historical driver. No closed-trip reconstruction.

Whole-slice follow-up additionally requires field-specific non-lifecycle writes:
catalog/status/assignment updates cannot resave stale journey state or revision.
Existing departure-affecting status/assignment writers share unit coordination.
Startup seed preserves existing lifecycle fields and captured units, cannot
reset trips on restart or create new unaudited EN_RUTA after capture, and guards
placeholder cleanup. This is lifecycle preservation, not a general seed/catalog
redesign. The expanded protection was included in the subsequent EWO-038 approval.

## Alternatives considered

- Use Flota movements as the journey ledger: rejected; changes independent custody
  semantics and ownership, and cannot prove Logistics departure/return.
- Only add returned_at on unidades: rejected; repeated trips overwrite history.
- New logistica schema: rejected for this slice; changes the established Kernel
  seam without a demonstrated need.
- Server-generated retry identity on every POST or timestamp-only matching:
  rejected; cannot bind a lost-response retry to the original trip.

## Consequences and risks

Additive storage and a small invisible client transport change are required.
Older clients lacking binding metadata must refresh; there is no unsafe unit-only
fallback. Durable receipts are retained without automatic expiry in this slice.
Unbounded history growth and future retention need a separate reviewed policy.
A coordinated cutover must drain old lifecycle writers; reverting to an old
history-discarding writer would invalidate capture coverage.

## Follow-up and ownership

Logistics/Kernel engineering owns implementation after bounded approval.
[Canonical AC](../specs/SPEC-UTIL-INPUTS-001.md#bounded-journey-slice--ac)
and [execution brief](../engineering-work-orders/LOG-JOURNEY-001-execution-brief.md).
Accept this proposal only with the contract/spec; preserve accepted ADR bodies.
Date: 2026-10-15. Decision approver/reference: owner, this chat,
“okay go ahead with the plan”; execution/evidence: EWO-038.
