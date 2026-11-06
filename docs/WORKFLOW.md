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
- Review: unmet AC or failed/skipped required checks remain visible as incomplete verification; do not claim done or fully verified. UI changes follow [UI review chain](#ui-review-chain). Record unverified coverage explicitly.

## Roles and escalation

| Decision / action | Who | Where recorded |
|---|---|---|
| Approve an EWO to move to Ready/In Progress | Project Owner (named in the EWO with an approval reference; status alone is not approval) | EWO `Status` + approval line |
| Accept or supersede an ADR | Project Owner | ADR status; [ADR index](adr/README.md) |
| Spec/ADR conflict, out-of-v0, ownership, notify unification | Escalate to Project Owner; do not decide silently | EWO `Deviations` or evidence `New Decisions Discovered`, plus a note in the PR |
| Visual OK before merge on UI changes | SD / visual OK (PR template) | PR `Visual QA` |

The repository does not name the people holding these roles. The Owner should confirm them here once; until then, ask rather than assume.

## UI review chain

Single source for the order; other docs link here instead of restating it.

1. Approved UX spec (when layout, hierarchy or actions change).
2. [Impeccable Operate](design/EXTERNAL_SKILLS.md#impeccable-operate--estándar-antes-de-generar-ui) note, before JSX.
3. Implementation and interaction checks.
4. [`better-ui`](design/EXTERNAL_SKILLS.md#better-ui--gate-estándar-de-pulido) review, then fixes.
5. `proof-ui` click-through and screenshots (evidence only; it does not issue a verdict).
6. Independent [`ux-auditor`](design/VISUAL_QA.md) Visual QA.

**Severity and authority**

| Pass | Verdict vocabulary | Effect |
|---|---|---|
| `better-ui` | `Block` / `Approve` / "No actionable UI-polish findings"; HIGH/MEDIUM/LOW | An applicable HIGH (broken interaction, accessibility) blocks until fixed and re-verified. MEDIUM/LOW are advisory. |
| `proof-ui` | Evidence only | Supplies screenshots for the next pass. |
| `ux-auditor` | `OK` / `no OK`; P0–P2 | A "fail inmediato" item is `no OK`. P-levels order the fixes. |

If passes disagree, the stricter blocking finding stands until it is fixed or the Owner waives it in the PR. Local design rules (ADR-003, `docs/design/*`) override upstream skill recipes. `better-ui` approval never replaces functional or visual acceptance.

**Independent review.** The `ux-auditor` pass must be run by a reviewer who did not write the diff: a separate agent session, or a human. If only the implementing session is available, record the pass as `SKIPPED (no independent reviewer)` in evidence; this leaves verification incomplete.

**Handoffs.** Each pass writes its result into the evidence record (see its *UI review* section), not into a separate log. After a blocking finding is fixed, the pass that raised it re-checks the affected surface and re-captures the screenshots that changed.

**Trivial UI fast lane.** Copy-only changes, or changes with no layout, hierarchy, action, state, motion or color effect: issue note or focused EWO with criteria, and one screenshot. Operate note, `better-ui` and `ux-auditor` are recorded as `SKIPPED (not applicable: <reason>)`. Anything beyond that uses the full chain.

## Verification in agent sessions

`script/verify.sh` requires an explicitly disposable PostgreSQL target (`EWO_DISPOSABLE_DB=true`). An agent session may set it only after confirming the target is disposable (for example a local Postgres created for this session as in the README, or CI). Otherwise record the API test and E2E commands as `SKIPPED (no disposable database)`, which keeps verification incomplete.


## Sessions and handoff

Persistent product/domain facts belong in existing context files; temporary execution instructions belong in the session or EWO. Use targeted `rg`, affected tests, and linked artifacts instead of pasting the repository. Update durable docs only when facts change. End the session with EWO status, changed files, AC progress, evidence links, failed/skipped checks, assumptions, risks and the next concrete action. Keep results in evidence and link them from EWO and PR rather than maintaining multiple result logs.
