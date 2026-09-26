# EWO-XXX — Title

## Status

Draft | Ready | In Progress | Verification | Closed | Blocked

IDs: `EWO-001`, `EWO-002`, … — never `WO-xxx` (WO is the visit wizard).

## References

SPEC:
ADR:
Domain area card (`domain/…/CONTEXT.md`):
UX spec / corte brief (if UI):

## Objective

One clearly defined outcome.

## Context

Minimum implementation-relevant context (ICM: do not paste the repo).

## Scope

- ...

## Out of Scope

- ...

## Domain Rules

- ...

## Dependencies

- ...

## Acceptance Criteria

Reference canonical SPEC AC IDs and links; do not duplicate their text. For a tiny task without a SPEC, define Given / When / Then criteria here and identify this EWO as their source.

## Testing Requirements

Expected tests and corresponding canonical AC IDs:
Exact validation commands and working directories:


- API: ADR-004 IDs if domain rules change; `cd api && npm test && npm run test:e2e`
- UI: skill `proof-ui` (click-through, no Playwright) if `web/src` changes

## Constraints

### Architecture

### Compatibility

### Security

### Performance

### UX

## ICM Context

### Required

- ...

### Optional / Load On Demand

- ...

### Do Not Load By Default

- ...

## Expected Evidence

- tests executed;
- results;
- files changed;
- acceptance criteria verification;
- screenshots when visual (`docs/screenshots/` or `docs/evidence/`);
- deviations;
- known limitations.

File under `docs/evidence/` using [EVIDENCE-TEMPLATE.md](../evidence/EVIDENCE-TEMPLATE.md).

## Escalation Conditions

Stop and escalate if:
- product decision required;
- domain rule/concept missing, or a Bounded Context would be declared/redrawn;
- architecture must materially change;
- accepted SPEC/ADR conflicts;
- scope must materially expand (including fuera de v0);
- dual-stack notify would be “unified” or “fixed”;
- WO (wizard) terminology would be overloaded;
- acceptance criteria conflict.

## Definition of Ready

- [ ] Objective is clear
- [ ] Scope is bounded
- [ ] Out-of-scope is explicit
- [ ] Domain area identified (provisional card)
- [ ] Relevant rules documented
- [ ] SPEC/ADR references resolved where applicable
- [ ] Acceptance criteria verifiable
- [ ] No material decision remains open
- [ ] ICM execution context defined

## Execution plan

PRD (if applicable):
Approval by / reference (required before non-trivial execution):
Likely affected files / modules:
Ordered implementation steps:
Implementation steps should reference Testing Requirements above; keep the test plan in that section rather than repeating it here.

## Assumptions, risks and data checks

Separate confirmed constraints from assumptions; link evidence. Identify rollback/compatibility risks for authorized refactors. Before destructive tests, confirm a disposable test database and resolved connection target, including `DATABASE_URL`; test setup does not clear an inherited URL. Document schema/data impact and recovery approach if applicable. No production migration policy is assumed. See [testing strategy](../testing/TESTING_STRATEGY.md).

## Acceptance and completion checklist

- [ ] Canonical AC IDs linked and each verified in evidence
- [ ] Required tests/checks complete; failures or omissions remain explicit
- [ ] Scope respected; no unrelated refactor
- [ ] Data/UX risks and assumptions documented
- [ ] Evidence and handoff linked

## Verification results reference

Canonical result record: [evidence template](../evidence/EVIDENCE-TEMPLATE.md) → completed evidence file link:

Each command/check uses `PASS / FAIL / SKIPPED`. Include exact commands, reasons for skipped checks and AC mapping there. Skipped E2E is incomplete verification, even if `verify.sh` exits zero. Do not close as fully verified with a required check skipped.

## Session handoff

Current status / remaining AC IDs:
Changed files:
Evidence link (including failed/skipped checks):
Open assumptions / risks / blockers:
Next concrete action:
Required context for next session (links only):
