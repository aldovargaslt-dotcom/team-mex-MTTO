# GrillMe review — Logistics journey slice

Date: 2026-10-15. Initial review verdict: revise before bounded approval.
No application code, migration or deployment performed. The follow-up below records
document revisions; proposed contract/ADR026/work order remain unapproved.

Workflow: GrillMe entry -> grill-with-docs -> grilling + domain-modeling.
Repository fact-checking was delegated to a read-only reviewer as required by
the grilling workflow. Findings below were checked against the current files.

## Findings

1. **P1 — Required binding headers are stripped by the actual web proxy.**
   Contract lines 130–134 require three X-Logistica headers.
   web/src/app/backend/[...path]/route.ts:9 forwards only content-type, accept,
   idempotency-key and x-role. Updated browser commands would reach the API without
   their required metadata. Include this route in the execution brief, explicitly
   allowlist the binding headers and verify the actual browser/BFF/API path.

2. **P1 — Saved intent is not bound to the confirming subject on the server.**
   Contract lines 136–139 promise subject isolation using sessionStorage namespacing.
   web/src/lib/role.tsx caches session identity, while the BFF uses the current
   session cookie per request. Another tab can change that cookie while the old
   tab retains a prior actor's pending intent. Freeze the confirming subject as
   a technical precondition and compare it with authenticated subject server-side.
   The browser value must never supply actor attribution or permissions. Forward
   the precondition through the BFF and test cookie/identity changes between
   preparation, first send and retry.

3. **P1 — Dangling journey UUID cannot meet the required revision header.**
   Contract lines 112–115 preserve the UUID when the pointed journey row is absent;
   lines 133–134 require a genuine journey revision for any UUID reference.
   Recovery cannot construct such a request. Define explicit missing-history
   context permitting absent journey revision, with absence revalidated under
   unit coordination before recovery. Extend LJ-06 and LJ-09 for this exact case.

4. **P2 — Return's proposed facility lookup also requires valid calendar config.**
   Contract lines 91–98 intend resource-only authorization, but
   api/src/visitas/checks/facility-calendar.port.ts:42 rejects an unexpected timezone.
   A correctly scoped return could fail on calendar configuration. Use a
   resource-facility resolver returning mapping/version facts without requiring
   operational-calendar validity. Preserve trusted scope and reject unknown
   facility; do not add a departure-readiness prerequisite to genuine return.

These are engineering corrections that do not require new product discovery.
They should be reflected in contract/AC/test map before renewed approval.

## Owner decision frontier

Q1: May an already confirmed pending command execute automatically after reload,
even if its first request never reached the server?

Recommendation: require explicit resumption using the saved command identity and
frozen expectations. Automatic reconciliation may read a durable receipt; an
absent receipt is not proof an earlier request cannot still commit. Do not
automatically send a new mutation or generate a replacement key. An explicit retry
can safely reuse the original key under the reviewed idempotency contract.

This distinguishes recovering a committed outcome from performing a first commit
later. It does not change server-side departure gates, custody or trip ownership.
Owner answer: YES, this chat, 2026-10-15, “1. Yes” to the question above.
This permits automatic resumption of already confirmed commands, including a first
commit later if the initial request never arrived. It supersedes this review's
explicit-resumption recommendation. It does not authorize coding or approve the
whole slice.

## Follow-up disposition

Contract, ADR026, canonical UTIL-J03/J06/J07/J09 and execution brief revised:

- Finding 1: explicit BFF header allowlist scope and full browser/BFF/API verification.
- Finding 2: frozen Expected-Subject equality precondition enforced by the API;
  actor attribution still exclusively from authentication, with cookie-switch tests.
- Finding 3: explicit historyState, genuine null revision for MISSING_ROW UUID or
  MISSING_POINTER sentinel, and locked absence revalidation before recovery.
- Finding 4: facility-owner resource read port for return/context without calendar
  validation; departure calendar/policy preserved.
- Q1: confirmed envelope automatically resumes once per page load with original
  identity/key/body/expectations. Conflicts suspend replay; drafts never replay.

These close the findings in the proposed design only. Implementation, tests and
runtime verification remain outstanding and require bounded execution approval.

Follow-up read-only GrillMe re-review: no remaining actionable blockers within
the reviewed scope. All four corrections and the owner's automatic-resumption
decision are consistent across contract/ADR/AC/execution brief. This is a design
review result, not implementation approval or runtime evidence.

Documentation checks: PASS — git diff --check; PASS —
git diff --name-only -- api web (empty). Python inspection: PASS — relative links,
five binding headers, UTIL-J01–J10 defined once and mapped to tests, pending overall
approval and no allocated EWO-038. Runtime tests/migrations remain SKIPPED because
this work only revises the proposed documents.

## Whole-slice follow-up after conditional approval

Owner message: “If grillme doesn't have more insights or observations, i approve,
if not grillme do a follow up.” A fresh whole-slice review found two additional
P1 issues. The no-further-findings condition was not satisfied, so no implementation
approval was recorded and no numbered EWO or code was created.

5. **P1 — Collateral full-entity saves can reverse a committed journey.**
   UnidadesService.update at api/src/unidades/unidades.service.ts:132–165,
   administrative helpers at :179–190 and Logistics assign/unassign at
   api/src/logistica/logistica.service.ts:232–261 read then save full Unidad
   without lifecycle coordination. A stale save after departure/return can restore
   old ops state, timestamp, active pointer and revision. This is a concrete
   TypeORM changed-column comparison issue, not prevented by a lock held only
   by departure/return.

6. **P1 — Automatic startup seed rewrites trip state.**
   AppModule imports SeedModule; SeedService.onModuleInit/seedCatalogo run at
   api/src/seed/seed.service.ts:64–70/104–106. Existing-unit upsert at :123–136
   explicitly overwrites ambito, opsEstado, destino and salidaAt. Restart after
   capture can contradict the durable journey. Placeholder cleanup also removes
   unit rows by legacy plate key; captured/open units require protection there.

Proposed corrections are now in the contract's collateral-writer protection
section, ADR026, canonical UTIL-J11/J12 and the brief's LJ-11/LJ-12:

- Explicit catalog/status/assignment field patches exclude lifecycle fields.
  Existing departure-affecting status/assignment validation shares coordination.
- Seed preserves existing trip context/state/pointer/revision, creates no ordinary
  unaudited post-capture EN_RUTA, and skips captured-unit cleanup with a diagnostic
  under the same unit lock. Disposable pre-capture fixtures stay explicit.
- Required real PostgreSQL tests cover paused stale saves across lifecycle commits
  and actual seed/bootstrap reruns after departure/return, including cleanup.

Follow-up read-only closure review found no further technical blockers for these
corrections. Approval boundary and brief explicitly name UTIL-J01–J12.
PASS — git diff --check; PASS — git diff --name-only -- api web (empty).
PASS — Python inspection of local links, 12 canonical AC definitions/test mappings,
pending overall approval and unallocated EWO. Runtime tests/migration rehearsal
remain SKIPPED because only proposal documents were changed.

Remaining owner decision: approve the expanded technical protection for existing
unit writers and startup seed together with the revised bounded package.
Previously confirmed automatic resumption Q1 remains unchanged.

## Next step

Present the expanded corrected package for follow-up bounded approval. No numbered EWO, coding,
migration execution or deployment
follows from this review or the Q1 answer.

## Explicit approval and implementation closure

Owner subsequently approved the expanded package: “okay go ahead with the plan”.
[EWO-038](../engineering-work-orders/EWO-038.md) records that actual approval;
the earlier conditional approval was not reused. Source implementation and actual
verification are in [EWO-038 evidence](EWO-038.md).

Read-only implementation review found and closed three P2 issues: original versus
active capture epoch, verified migration no-op/retry consistency, and readiness
without an invented capture epoch. It also identified the receipt-primary-key
verification omission within migration consistency. All were fixed and regression
verified; final bounded closure acknowledgment: no remaining findings.
Committed replay now skips optional alert projection, preserving the durable
outcome without replaying an old effect or holding extra SQL pool connections.
Interactive React walkthrough remains a visible manual handoff check. No working/
production migration or deployment was performed.
