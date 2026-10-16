# LOG-JOURNEY-001 — Bounded execution brief awaiting approval

Status: Historical approval brief, superseded for execution by [EWO-038](EWO-038.md).
Owner approved the expanded plan in this chat: “okay go ahead with the plan”.
The draft below preserves the package presented for approval; use EWO-038 for
current implementation state and verification evidence.
This is the approval-ready work order content, not a numbered/approved EWO.
Approval by/reference: PENDING. No coding, migration execution or deployment.
The handoff and WORKFLOW require approved SPEC before allocating an execution EWO.
After approval, recheck the next unused EWO number and record the actual reply
reference; do not reuse EWO037 production authorization.

## Objective and references

Persist one stable Logistics journey per successful new departure and one
attributed, safely retryable matching return, preserving current gates/audit/custody.

- [Contract](../contracts/LOG-JOURNEY-001-contract.md)
- [Proposed ADR026](../adr/026-logistica-durable-journeys.md)
- [Canonical UTIL-J01–J12](../specs/SPEC-UTIL-INPUTS-001.md#bounded-journey-slice--ac)
- [Handoff](../../workspace/shaping/abc-utilization-builder-handoff.md)
- ADR000/002/008/011/017/018/019/020/025, domain/logistica/CONTEXT.md,
  context/ARCHITECTURE.md, ICM.md, docs/WORKFLOW.md and testing strategy.

No unresolved product discovery is required. Owner resolved automatic reload
resumption in this chat, 2026-10-15, reply “1. Yes” to GrillMe Q1: a previously
confirmed pending command may perform its first commit after reload. Preserve
the key, subject, body and journey expectations. This answer does not authorize
coding or approve the remaining bounded design.

## Scope, constraints and dependencies

Implement only the contract. Additive public persistence owned through the existing
Logistics/Kernel seam; no foreign-owner writes/joins, Flota/custody changes or event
envelope changes. Preserve current departure safety/document policy and audit.
Trusted return role/facility checks are required; expired departure requirements
must not block genuine return. No visual change or new business fields.

Invisible web handler/transport updates are necessary: both existing return
callers, departure caller and pending-command recovery. Do not redesign components.
Do not add browser test tooling. If layout/copy/interaction design expands beyond
transport integration, stop and obtain explicit UX scope approval.

Whole-slice GrillMe follow-up adds two necessary protections: existing catalog/
status/assignment writes cannot overwrite lifecycle fields from a stale entity,
and automatic seed/bootstrap must preserve captured state/history. Use bounded
field patches and existing coordination, not a broad refactor. This changes the
technical execution scope; the conditional approval has not taken effect.

All handoff exclusions apply: no downtime ledger/writers, costs, correction writer,
PSI removal, recheck/signing, new safety policy/hold/readiness gate, graphs, role
grants, physical correlation, notify rewrite or deployment.
Do not share simultaneous lifecycle mutation work with a second builder.

## Likely affected files after approval

API logistica controller/service/module/types and new journey/receipt/capture
entities/service/rules; Unidad entity; isolated db migration DataSource/runner and
1792022400001-LogisticaJourneyHistory migration; focused API unit/integration tests.
UnidadesService catalog/status methods and Logistics assign/unassign: explicit
permitted-field patches; coordinate existing departure-affecting changes.
SeedService existing-unit upsert/new-unit defaults/placeholder cleanup: lifecycle
preservation and guarded fixture initialization only, no unrelated seed redesign.
Existing facility-mapping owner: transaction-aware FacilityResourceReadPort for
return/context scope without operational calendar validation; departure unchanged.
Web LogisticaDashboard.tsx, app/flota/page.tsx, existing api transport/types and a
small pending-command helper; app/backend/[...path]/route.ts must forward all
contract binding headers while preserving existing authentication/origin checks.
Existing departure-policy and Flota sources should
need no behavioral change. Evidence and final EWO are documentation.

## Ordered implementation work

1. Allocate EWO only after actual approval, verify current main/documentation
   baseline, recheck naming collisions, preserve user changes.
2. Characterize current safety/audit/return/notification behavior; add failing
   contract tests by the mapping below.
3. Add reviewed entities/constraints and isolated additive migration plus migration
   rehearsal. No external database action.
4. Implement coordinated departure/return, trusted scope, binding/replay and legacy
   handling in the actual service/controller seam; preserve policy/audit. Compare
   confirming subject server-side, make missing-history state explicit, and use
   resource-only facility authorization for return/context.
   Protect collateral Unidad writers and startup seed/cleanup as specified in
   UTIL-J11/J12 before claiming durable capture can survive concurrent edits/restart.
5. Wire both web return callers and departure caller to frozen context and durable
   pending transport through the actual BFF allowlist. Automatically resume only
   previously confirmed commands on reload, with unchanged key/subject/context.
   Exercise delayed first commit, committed replay, identity switch and stale
   missing-history paths with the current browser/BFF/API seam.
6. Run mapped verification, inspect final diff, record evidence and hand back.
   No deployment or production migration; skipped required checks stay incomplete.

## AC-to-test mapping

Canonical requirements live only in UTIL; identifiers below are planned test cases.

| AC | Planned test identity / location |
|---|---|
| UTIL-J01 | LJ-01 repeated departures/returns, distinct IDs/context and retained exact audit: logistica-journey.e2e-spec.ts |
| UTIL-J02 | LJ-02 endpoint actor/time, assignment change, server attribution and timestamps after lock wait: same integration suite |
| UTIL-J03 | LJ-03 existing departure policy matrix + genuine return with expired ABC/insurance/inactive unit/invalid facility calendar but valid resource mapping and scope; no Flota mutation: existing logistica/checks suites plus focused suite |
| UTIL-J04 | LJ-04 receipt replay, payload conflict, response lost then J2, two keys racing, departure/return, cross-unit key race: real PostgreSQL suite |
| UTIL-J05 | LJ-05 failure injection at audit/journey/endpoint/unit/receipt save; exact rollback and postcommit failure retry: real PostgreSQL suite |
| UTIL-J06 | LJ-06 cutover legacy with/without salidaAt, dangling UUID + null journey revision, absent pointer + sentinel, row appearing before recovery, conflicting history, no closed reconstruction: integration + migration suite |
| UTIL-J07 | LJ-07 missing/forged actor, trusted role mismatch, unauthorized facility, missing mapping, changed scope on replay; expected-subject mismatch on initial send and replay after cookie switch: HTTP integration through BFF where applicable |
| UTIL-J08 | LJ-08 baseline/additive up/retry/failure/down guards and explicit capture boundary: logistica-journey-migrations.e2e-spec.ts, synchronize=false |
| UTIL-J09 | LJ-09 browser/BFF/API preserves every required binding header for both return callers/departure; timeout/reload retains confirmed envelope; never-delivered command commits once automatically after reload; committed replay does not repeat endpoints; drafts never replay; stale row, missing-history states, cookie/subject switch, conflict suspension and one-attempt-per-load: helper/API tests using existing tooling + actual BFF/manual browser walkthrough |
| UTIL-J10 | LJ-10 known/unknown provenance and eligibility gaps remain distinguishable: persistence assertions + context endpoint integration |
| UTIL-J11 | LJ-11 deterministic PostgreSQL overlap: pause catalog/status/assignment changes across departure/return commit and prove no lifecycle state/context/pointer/revision/timestamp reversal; preserve existing validation/authority |
| UTIL-J12 | LJ-12 actual seed/bootstrap after captured departure and return, captured placeholder cleanup guard, post-capture new unit without naked EN_RUTA, explicit disposable pre-capture fixtures: real PostgreSQL integration |

Keep existing L6/L7 and L10/L11 coverage but update their authentication/context
setup; raw role-header-only return success is no longer acceptable attribution.
No new tests are claimed executed at this design stage.

Browser-to-BFF-to-API verification is required in LJ-07/LJ-09; direct Supertest
against Nest alone cannot prove header forwarding or cookie-switch protection.
Use existing tooling and a manual same-origin session walkthrough; record the
exact executed route-check commands/steps in evidence without adding a browser
framework. Do not substitute web lint/build for these functional checks.

## Exact planned validation commands and isolation

Working directory api unless stated. First follow README/.cursor/environment.json
native PostgreSQL setup for cloud agents. Inspect resolved host/port/database
without printing credentials. Explicitly clear DATABASE_URL (including dotenv
override), set local verified disposable connection selectors, verify
current_database() and host, then set EWO_DISPOSABLE_DB=true. Do not use any inherited
working/production target. Existing setup-e2e.ts enforces these guards and sets
team_mex_mtto_test with dropSchema=true; this is destructive and requires the
disposable preflight. Migration rehearsal must use a separate
logistica_journey_migration_test database, synchronize=false/dropSchema=false,
following the guarded existing rehearsal pattern. Restrict destructive schema resets
to that explicit test target; never run migration runner against the default DB.

After that preflight, commands to record verbatim with PASS/FAIL/SKIPPED:

- npm test -- --runInBand
- npm run test:e2e -- --runInBand --runTestsByPath test/logistica.e2e-spec.ts test/checks.e2e-spec.ts test/logistica-journey.e2e-spec.ts
- npm run test:e2e -- --runInBand --runTestsByPath test/logistica-journey-migrations.e2e-spec.ts
- npm run test:e2e -- --runInBand
- npm run build
- web working directory: npm run lint
- web working directory: npm run build

The proposed new migration test is selected by the E2E config; existing
npm run test:migrations matches only check-migrations.e2e-spec.ts and will not prove
this new migration. E2E requires PostgreSQL; no mocks as a race/migration substitute.
Required suite failures/skips block a fully verified handoff. No api lint --fix.
No screenshot requirement for transport-only change; if visual scope is approved,
use existing click-through/proof and separate visual review instructions.

## Migration, recovery and evidence

Follow the contract's drained cutover and forward recovery. No production target
is selected or contacted. Implementation approval permits preparing/rehearsing
migration code only; external migration/deployment requires separate authority.

Create docs/evidence/<allocated-EWO>.md with exact commands, resolved nonsecret
test target, schema/AC assertions, race winners, rollback injection results,
migration/capture epoch and limitations. Link it from the allocated EWO.
Screenshots apply only to separately approved visual scope.

## Readiness and session handoff

- Scope, proposed persistence, actor, retries, migration and AC mapping: prepared.
- Design/spec/ADR approval: PENDING; execution EWO number/reference: unallocated.
- Runtime tests/migration rehearsal: SKIPPED (design-only request).
- Runtime/production readiness: unverified; no deployment authorized.
- Next action: owner reviews this contract/ADR/AC/work order package. Following
  explicit bounded approval, allocate EWO with actual reference and implement.

Stop on schema/ownership conflict, changed gates, unsupported legacy ambiguity,
required new UI/business input, unverified destructive test target or any scope
expansion. Do not infer approval from status labels or prior releases.
