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

### AC-01
Given...
When...
Then...

## Testing Requirements

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
