# SPEC-XXX — Title

Use this form for **new** functional specifications. Existing v0 specs in this folder (`fleet-manager-v0.md`, `fleet-tablero-viaje-v0.md`, `unit-health-v0.md`) stay as they are; do not rewrite them to match this template.

UI layout/hierarchy: also fill `docs/design/UX_SPEC_TEMPLATE.md`. This file does not replace ADRs.

## Status

Draft | Proposed | Approved | Superseded

## Problem

## Context

## Goals

- ...

## Non-goals

- ...

## Actors

`SUPERVISOR` | `ADMIN_DIRECTIVO` | `LOGISTICA` | …

## Functional Behavior

## Business Rules

- ...

## Domain Implications

Provisional area cards: `domain/<area>/CONTEXT.md`. Do not declare a new Bounded Context here without escalation.

## State Transitions

## Constraints

### Architecture

### Compatibility

### Security

### Performance

### UX / Operational

## Failure Behavior

## Edge Cases

- ...

## Acceptance Criteria

### AC-01
Given...
When...
Then...

## Dependencies

- ...

## Related ADRs

- `docs/adr/…`

## Open Questions

No material open question may remain when Status = Approved.

## Traceability and impact

PRD (if applicable; otherwise reason):
Affected domain card:
Current behavior and source evidence:
Desired behavior (detail in Functional Behavior above):
Data model / migration impact (or none):
API contract impact (or none):
UI impact and linked UX spec (or none):

## Negative cases and UI states

Cover relevant permission, invalid input, duplicate/retry and failure cases. For affected UI, specify loading, empty, error, success and disabled states; record why any state is not applicable.

## AC-to-test plan

Acceptance Criteria above is the canonical requirement source; EWOs reference its IDs.

| AC ID | Positive / negative scenario | Planned test file / test ID or manual check | Evidence link after execution |
|---|---|---|---|
| AC-01 | | | |

See [testing strategy](../testing/TESTING_STRATEGY.md). Results belong in [evidence](../evidence/EVIDENCE-TEMPLATE.md); do not mark planned tests as passed.

## Risks and assumptions

Identify evidence versus inference, operational/data risks, and unresolved decisions. Do not approve with material open questions. Follow the [workflow](../WORKFLOW.md).
