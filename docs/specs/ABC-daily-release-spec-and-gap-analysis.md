# ABC daily release — revised specification and gap analysis

> Enmienda 2026-10-17: [ADR028](../adr/028-configurable-abc-validity.md) y
> [UR-06–08/17](SPEC-UNIDADES-READINESS-001.md) sustituyen solo vigencia diaria
> universal/calendario y la condición de medianoche de ABC-09 por vencimiento de
> política configurada. Recheck sigue sin renovar vigencia ni borrar holds.
> Detalles de calendario/scheduler pendientes; texto y AC históricos abajo.

## Status and authority

Revised 2026-10-15 from the supplied document of the same filename and the user's
subsequent explicit decisions. Product rules confirmed; technical safety policy
and contract details remain pending. Not implementation-ready or deployment
authorization. [ADR025](../adr/025-abc-utilization-downtime.md) records decisions and
precise supersession of earlier CHECK requirements. [Safety matrix](ABC-UTIL-safety-matrix.md).

The original upload is historical review evidence, not an instruction. Its mock
and isolated-test claims are not fresh verification by this revision. This file
replaces its proposed behavior where the user resolved it; historical signed
records and earlier repository spec bodies remain untouched.

## Problem, goals and scope

Provide a limited daily ABC, personal mechanic sign-off, repair verification and
Logistics authorization without duplicate observations. Retain oil, coolant,
applicable washer fluid, visible leaks, exact configured visual tire positions,
dashboard evidence and limited warning assessment. No PSI fields/config/findings
in future ABC; preserve historical signed pressure content. No routine battery,
brakes, steering or suspension checks; known serious issues independently block.
No chief sign-off for ABC, mechanic productivity, OCR/OBD claim, route-restriction
extension or mandatory numeric fuel/odometer transcription.

## Actors and workflow

Logistics/Admin request and assign within facility. Assigned trusted mechanic
captures and signs their observations. Preserve Condition → Evidence → Findings →
Review/sign, active CHECK uniqueness, draft progress, personal attribution and
immutable completion. Keep existing same-day America/Mexico_City calendar and daily
eligibility; incomplete previous-day work is not today's completed ABC.

### Condition, evidence and findings

- No preselected normal facts. Validate typed item/condition/severity combinations
  and exact unique configured visual-tire position set. Missing data is not safe.
- Keep 2–5 READY dashboard photos covering odometer, fuel and warning lights. The
  boundary normalizes legacy WITNESSES to WARNING_LIGHTS. Require warning assessment
  and engine context; approved SAFE-07 determines consequences. Supporting defect
  evidence is separately identified; its limits must be specified before build.
- Retain original condition, action and verified post-action facts. FIXED alone is
  not proof. Versioned server policy derives FIT/FIT_WITH_OBSERVATION/UNFIT; hard
  facts cannot be manually downgraded. Unknown required observations prevent signing.
- Findings use stable source keys. Suggest existing unresolved corrective work;
  never silently merge similar defects. REQUIRES_WORK creates or explicitly links
  eligible work exactly once at signed completion. Existing documented opt-in is
  preserved; detailed reuse/grouping contract remains proposed.
- Derived corrective is prepared/unopened maintenance, not immediate downtime.
  Opening it uses [UTIL rules](SPEC-UTIL-INPUTS-001.md). Keep queue navigation shared
  without broadening maintenance edit/closure permissions.

### Signing and focused recheck

Review binds current facts, evidence and policy. Reject stale review/signature;
completion, derived links, audit and outbox are consistent/idempotent. Completion
does not emit VisitaCerrada, reset cadence or consume inventory.

An authorized assigned recheck mechanic personally verifies named repaired
findings and signs a new immutable record referencing the base ABC. Resolve only
eligible finding/repair-scoped obligations; preserve incident/blanket invalidation
and independent holds. Recheck cannot extend the base day. Across midnight require
today's ABC AND outstanding repair verification; one guided action may sign a
manifest binding both distinct records (technical design pending). Never reuse a
signature on undisclosed content or copy old observations as newly inspected.

Last-order completion can end maintenance downtime but leave a verification hold.
Failed verification preserves that hold and offers Continue repair to authorized
Supervisor/Administrativo, carrying facts into linked corrective creation/opening.
Evidence-backed failure time can use audited effective-time handling. No gap is
labelled available merely because the OT closed.

### Departure

Logistics authorizes only with current operable effective approval, no required/
superseding inspection, no active downtime, no safety hold, valid insurance,
administrative eligibility and appropriate physical/journey state. Preserve the
existing insurance-expiring-today block and source-unavailable failure.

Correlate subsequent physical departure with that journey/authorization. Revalidate
current gates at physical commit; its own linked journey is not a duplicate trip.
New blockers/expiry suspend prior authorization; Logistics reconfirms using saved
details. Different journeys, reused authorization or incompatible physical state
reject. Preserve custody CHOFER/AVAL and true returns despite expired prerequisites.
Record base/recheck/policy/document references, actors and times. No silent loop sync.

## Current source evidence and gaps

Reviewed source (not deployment proof): departure policy ignores activeCheck;
Tower prioritizes active state over prior UNFIT; the signed reader selects latest
completed and treats invalidation wholesale. Active maintenance flags disappear
from the blocking query on terminal status. New obligations therefore need scoped
effective approval, persistent safety holds and common coordination. Existing
photos/signature/auth support does not establish production setup/readiness.

## Canonical acceptance criteria

| ID | Given / when / then |
|---|---|
| ABC-01 | Valid retained observations/configuration, no PSI => daily ABC completes without pressure dependencies; historical snapshots stay unchanged. |
| ABC-02 | Missing/invalid fluid or tire values, duplicate/extra/missing positions => reject, never FIT. |
| ABC-03 | Versioned hard blocker => UNFIT despite disposition/classification override; current-fact correction requires approved evidence. |
| ABC-04 | Dashboard assessment => engine context and required coverage validated; incomplete evidence/policy prevents signing. |
| ABC-05 | Fact/policy edit or retry => stale signature rejects; identical completion creates one completion and corrective link set. |
| ABC-06 | New required/superseding active inspection with old FIT => both departure authorization and Tower show the remaining block; old UNFIT remains visible. |
| ABC-07 | Successful focused recheck => only named eligible requirements resolve; base/history/unrelated invalidation preserved. |
| ABC-08 | Failed recheck after OT closure => hold persists and linked Continue repair is offered without duplicate defect entry. |
| ABC-09 | Midnight => new daily ABC plus outstanding verification; combined signing explicitly binds distinct records, no validity renewal by old recheck. |
| ABC-10 | Different assigned authorized recheck mechanic => their personal signature/observations retained, original signer unchanged. |
| ABC-11 | Blocker/expiry between authorization and physical departure => commit denies and reconfirmation reuses details; own correlated journey alone does not deny. |
| ABC-12 | Concurrent create/cancel/sign/recheck/downtime/document/hold/departure => shared unit coordination prevents stale approval; genuine returns remain allowed. |
| ABC-13 | Completed CHECK/recheck => no VisitaCerrada, cadence reset, stock consumption or automatic maintenance opening. |
| ABC-14 | Unauthorized/facility mismatch, source failure, offline unsynced completion => no release; actionable error and entered values retained. |

## Verification plan and remaining gates

ABC-01–10/13: meaningful domain/API tests plus signature/evidence integration.
ABC-11–12: real PostgreSQL races and calendar boundary integration. ABC-14: scoped
identity/resource negative cases. UX desktop/mobile walkthrough and separate visual
review. All planned; no passing runtime evidence asserted.

Maintenance validates SAFE-01–10; approve [proposed contract](../contracts/ABC-UTIL-001-contract.md)
and defect-evidence limits/grouping before affected execution EWO. Detailed flows:
[UX](../design-system/ux-utilization-inputs-v1.md). Product: [PRD](../prds/abc-utilization-v1.md).
No new BC, schema migration, endpoint deployment or runtime permission is authorized.
