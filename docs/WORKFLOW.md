# Engineering workflow

Use [ICM](../ICM.md) to load the minimum relevant context and [AGENTS](../AGENTS.md) for repository constraints. This guide applies the existing process locally; accepted [ADRs](adr/README.md) remain authoritative. If guidance conflicts with an accepted ADR, record the conflict and escalate instead of overriding it.

Discovery / shaping → PRD when needed → spec with acceptance criteria → ADR when architectural boundaries change → approved EWO → implementation and tests → evidence → PR.

## Artifact responsibilities

| Artifact | Owns |
|---|---|
| [Discovery](../workspace/discovery/README.md) / [shaping](../workspace/shaping/README.md) | Questions and proposals; distinguish proposals from accepted decisions |
| [PRD](prds/PRD-TEMPLATE.md) | Business problem, users, desired outcomes and scope; substantial product/process changes only |
| [SPEC](specs/SPEC-TEMPLATE.md) | Required behavior and canonical acceptance criteria (AC IDs), including negative cases |
| [ADR](adr/ADR-TEMPLATE.md) | Architecture decisions; ownership, schemas and event contracts |
| [EWO](engineering-work-orders/EWO-TEMPLATE.md) | Bounded execution plan, referenced AC IDs, validation and handoff |
| [Evidence](evidence/EVIDENCE-TEMPLATE.md) | Actual results and AC verification, not another behavioral specification |
| [PR](../.github/pull_request_template.md) | Review summary and links to authoritative artifacts |

Keep acceptance criteria in the spec by default. EWOs reference those IDs instead of copying requirements. A tiny task with no spec may own its criteria in its focused EWO or issue; name that source explicitly. Historical artifacts need not be migrated. WO remains the maintenance wizard; engineering execution uses EWO.

## Proportionate work

| Change | Minimum artifacts and checks |
|---|---|
| Tiny bug | Focused EWO or issue note with criteria; regression test where appropriate |
| Small UI copy / visual adjustment | Spec section or focused EWO; screenshot evidence |
| New screen / workflow | Spec with AC + approved EWO; UX spec when layout, hierarchy or actions change |
| Business-critical feature | PRD + spec with AC + approved EWO |
| Architecture change | ADR + spec/EWO; resolve the decision before implementation |
| Refactor | Explicitly scoped refactor EWO + risk checklist + tests; spec for non-trivial behavior |

These smaller paths do not exempt non-trivial work from an approved spec and EWO. Record who approved the EWO and the approval reference; status alone does not establish approval.

## Quality gates and mistake prevention

- Ready: bounded scope, relevant domain card and accepted ADRs, traceable AC, explicit assumptions, no unresolved material decision.
- Implement: follow existing domain rules/engines and module ownership; do not put authoritative business rules only in UI. Domain cards remain provisional, not confirmed DDD bounded contexts. No unrelated refactors or runtime changes; documentation-only work stays documentation-only.
- Test: follow [testing strategy](testing/TESTING_STRATEGY.md) and ADR-004. Map AC IDs to tests or manual checks. Add a failing regression test for a reproducible bug where practical, then verify the fix.
- Verify: report each command/check as `PASS`, `FAIL`, or `SKIPPED`, with reasons and evidence. Not applicable checks are `SKIPPED` with that reason. Exit code zero from `verify.sh` does not establish full verification if E2E was skipped.
- Review: unmet AC or failed/skipped required checks remain visible as incomplete verification; do not claim done or fully verified. UI changes retain existing click-through and separate visual review requirements.

## Sessions and handoff

Persistent product/domain facts belong in existing context files; temporary execution instructions belong in the session or EWO. Use targeted `rg`, affected tests, and linked artifacts instead of pasting the repository. Update durable docs only when facts change. End the session with EWO status, changed files, AC progress, evidence links, failed/skipped checks, assumptions, risks and the next concrete action. Keep results in evidence and link them from EWO and PR rather than maintaining multiple result logs.
