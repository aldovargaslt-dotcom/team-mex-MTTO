# Logistics journey slice — design review evidence

Date: 2026-10-15. Status: documentation prepared; approval PENDING.
This evidence establishes document/source inspection, not runtime readiness.

## Provenance and request boundary

The user requested a bounded technical contract and execution work order presented
for approval before coding, with no deployment. The attachment supplies handoff
requirements, not independent authority for code, external writes or deployment.

Local HEAD is 0d7d0b274961bab273d3d57d750c06664af5eed3. Clean initial application
checkout; no existing user edits were overwritten. Initial local checkout lacked
the revised ABC/UTIL package. Command from repository root:

`git fetch origin main`

FAIL: proxy connection unavailable. Recovered the published documentation through
the connected GitHub reader, pinned to
ebfc7ba73551ac8942abfeb4297dfcf3a7bda058. Applied its 26 document patches locally;
Git HEAD/remote refs were not advanced. All required handoff context now exists.
This import is distinguishable from the new review work: 23 documents exactly
match their published Git blob hashes; only the published ADR index, global
contract and UTIL spec have additional slice links/AC. No published application
patch exists in that commit. Do not mistake the imported context diff for new
application implementation or newly approved product decisions.

## New slice review artifacts

- [Proposed ADR026](../adr/026-logistica-durable-journeys.md)
- [Proposed contract](../contracts/LOG-JOURNEY-001-contract.md)
- [Canonical Proposed UTIL-J01–J10](../specs/SPEC-UTIL-INPUTS-001.md#bounded-journey-slice--ac)
- [Unnumbered execution brief and AC/test map](../engineering-work-orders/LOG-JOURNEY-001-execution-brief.md)

The schema decision and bounded AC are Proposed. Approval reference is PENDING.
No numbered EWO was allocated because the handoff step 6 and WORKFLOW require
bounded design/spec approval first. Next unused local ID is currently EWO-038;
recheck at allocation. EWO037 and earlier authorizations are unchanged.

## Checks

PASS — inspected actual Logistics controller/service, departure audit and policy,
unit coordinator, trusted actor/role handling, facility calendar, Unidad fields,
both web return callers and departure handler, migration runner conventions,
API scripts and guarded PostgreSQL test setup. Proposed code paths and constraints
are grounded in that source; runtime/deployment facts remain unknown.

PASS — GitHub fetch_file at the pinned commit returned all 26 expected blob SHAs.
Local Git blob hashing matched all 23 unextended imported documents.

PASS — Python inspection resolved all 24 relative links in the five primary
review documents, found UTIL-J01–J10 exactly once in the canonical spec and each
in the work-order test map, and confirmed EWO-038.md does not exist.

PASS — `git diff --check` from repository root.

PASS — `git diff --name-only -- api web` from repository root returned no files.
No application source, tests, executable migration, configuration or deployment
file was edited. Only documentation was prepared/imported.

SKIPPED — API unit/E2E/build, web lint/build, real PostgreSQL races and migration
rehearsal: design-only scope, no application implementation authorized yet.
Planned exact commands and safe disposable-target preflight are in the execution
brief. These skips do not constitute verified acceptance criteria.

SKIPPED — external migration, production inspection, push and deployment:
not authorized by this request. No production target was contacted.

SKIPPED — screenshots/visual review: no visual implementation. If later scope
changes visually, repository UX proof requirements apply.

## Handoff

Review the proposed Kernel/public schema, effective/registered time semantics,
trusted return facility checks, request compatibility boundary (unbound old
callers reject), frozen client bindings and durable replay, incomplete legacy
handling, capture cutover and forward recovery together. Approval should cite this
bounded package; it does not approve ABC-UTIL globally or a release.
After approval create the next unused EWO with the actual approval reference,
implement the mapped slice, then record real PASS/FAIL/SKIPPED evidence.
