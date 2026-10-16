# ABC/utilization — builder handoff

Status: prepared 2026-10-15 for a separate implementation agent. Technical readiness
and bounded execution approval are still required; this handoff grants neither
production access nor permission to implement the entire coordinated plan.

## Start in the correct checkout

Start from an updated main checkout containing this handoff and the revised
documentation package. Confirm the linked files exist before starting; a stale
worktree/clone must first incorporate the published documentation commit. Preserve
all existing user changes; do not reset/clean, overwrite old EWOs or reuse
production-release authorization from EWO037. Publication of the documentation does
not authorize the builder to push application changes or deploy.

## Builder instruction

Read AGENTS.md and ICM.md, then the revised plan, ADR025, ABC/UTIL specs, UX, safety
matrix and proposed ABC-UTIL contract. Characterize current source, not historical
claims of what was or was not implemented. These documents already record the
product decisions; do not restart product discovery or broaden inspection scope.

First prepare a bounded technical design and approval-ready execution brief for
**durable Logistics journey/return history**. This is a candidate first foundation
slice, not approval of every Proposed item in the global contract. No UI change,
new operator fields, new readiness gate or changed custody loop is required here.

### Concrete target behavior

- Successful new Logistics departure retains a stable journey reference and its
  existing departure authorization evidence in the same coordinated transaction.
- Successful Logistics return durably records the matching journey endpoint and
  attributable actor before the current-state departure fields are cleared.
- Concurrent/repeated operations cannot create duplicate trip endpoints or attach
  a return to a later trip. Specify durable retry identity and expected journey/
  revision binding through the existing client/server call, not new business input.
- Preserve departure/return response compatibility, current safety/document gates,
  facility authorization, unit coordination and independent Flota records.
- Existing open trips without a new journey record require an explicit legacy
  representation. Do not fabricate driver, departure time, return time, identity
  or readiness evidence. Preserve genuine return even with incomplete old history.
- Closed historical trips are not reconstructed from today's status. Reliable
  capture boundary and incomplete data remain visible for future reports.

### Required design before code

1. Identify owning persistence location under existing Logistics/Kernel seam;
   additive entity/columns, indexes and migration name; no cross-schema ownership
   shortcut. Record proposed schema decision/amendment for review.
2. Define journey identity, exact effective/registered timestamps, stable driver/
   trip context, departure audit link, return actor/facility validation and endpoint
   compatibility. Do not infer current driver's identity as historical proof.
3. Define return retry/concurrency behavior and legacy open-trip handling. Existing
   return service lacks actor input; thread trusted attribution through the actual
   controller/service rather than accepting a browser-supplied actor.
4. Define migration rollback/recovery, test database isolation and reliable capture
   boundary. Prepare additive migrations only after execution approval; no external
   migration or production deployment is inferred.
5. Add bounded acceptance criteria to the canonical UTIL spec for this slice and
   map them to tests. Existing UTIL-05/11/12/13/17/18 provide related constraints,
   not proof that broad feature criteria are completed by this small slice.
6. Obtain the bounded design/spec approval, then create the next unused EWO with
   the actual approval reference as required by the repository workflow. Do not
   mark this handoff or the entire proposed global contract Approved by inference.

### Expected implementation verification after approval

Use existing API tests and real disposable PostgreSQL integration: repeated trips
on one unit, matched return and retained departure audit, rollback on persistence
failure, concurrent departure/return/retry, stale return versus later journey,
legacy open trip, missing history, unauthorized scope and expired ABC/insurance
on genuine return. Run checks appropriate to the final diff and record PASS/FAIL/
SKIPPED plus exact commands in the slice evidence. No production connection or
destructive test target is assumed safe. Screenshots apply only if scope is
explicitly expanded to UI; the initial slice should not need that expansion.

### Exclusions

No automatic downtime/opening/cancellation writer, external cost flow, PSI removal,
safety-matrix invention, recheck/combined signature, persistent safety-hold change,
correlated physical-departure redesign, graph, role grant, deployment or rewrite
of notify. Those are later bounded slices. A later departure-correlation slice
must reuse this stable journey identity without silently changing its semantics.

## Subsequent sequence

After the first slice: approve reason-ledger and lifecycle/cancellation/handoff
contracts, then downtime capture and Logistics service routing; validate technical
safety policy before ABC changes, focused recheck and release integration; build
reports from reliable facts; pilot only after required runtime checks. Work can be
split only where interfaces are agreed; avoid two builders mutating the same
maintenance/departure coordination simultaneously.

## Required context

- [Plan](abc-utilization-implementation-plan.md)
- [ADR025](../../docs/adr/025-abc-utilization-downtime.md)
- [UTIL](../../docs/specs/SPEC-UTIL-INPUTS-001.md)
- [ABC](../../docs/specs/ABC-daily-release-spec-and-gap-analysis.md)
- [UX](../../docs/design-system/ux-utilization-inputs-v1.md)
- [Proposed contract](../../docs/contracts/ABC-UTIL-001-contract.md)
- [Safety matrix](../../docs/specs/ABC-UTIL-safety-matrix.md)
- [Logistics service](../../api/src/logistica/logistica.service.ts)
- [Departure audit](../../api/src/logistica/departure-audit.entity.ts)
- [Engineering workflow](../../docs/WORKFLOW.md)

## Handoff result expected from the builder

Return the exact first-slice scope, proposed technical choices, bounded AC and
approval reference before execution; after authorized code, return diff/evidence,
test outcomes, migration status and remaining blockers. An incomplete gate is not
a reason to bypass safety or claim production readiness.
