# Evidence — EWO-XXX

## Summary

Engineering Work Order: `EWO-xxx`
Worker model:
Verifier result:

Do not write **WO-xxx** here. WO is the visit wizard.

## Files Changed

- ...

## Tests Added / Changed

- ...

## Tests Executed

| Test / Command | Result | Notes |
|---|---|---|
| `cd api && npm test` | PASS / FAIL / SKIPPED | |
| `cd api && npm run test:e2e` | PASS / FAIL / SKIPPED | |
| `cd web && npm run lint` | PASS / FAIL / SKIPPED | |
| `cd web && npm run build` | PASS / FAIL / SKIPPED | |
| `proof-ui` screenshots | PASS / FAIL / SKIPPED | paths under `docs/screenshots/` |

## Acceptance Criteria

### AC-01 — PASS / FAIL / SKIPPED

Evidence:

## Domain Consistency

## Architecture / ADR Consistency

## Scope Review

Fuera de v0, ownership, visual-only vs `api/src`, dual-stack notify untouched unless in scope.

## Visual Evidence

[Reference `docs/screenshots/…` when applicable.]

## Deviations

None / ...

## Known Limitations

None / ...

## New Decisions Discovered

None / ... (if an ADR is required, escalate — do not silently record it only here)

## Follow-up

- ...

## Verification completeness

Record commands separately: if lint fails before a chained build starts, lint is `FAIL` and build is `SKIPPED`. Use `SKIPPED` for checks not run or not applicable, with reason, impact and follow-up. Link canonical SPEC AC IDs instead of restating requirements. A skipped required check means incomplete verification. `verify.sh` may exit zero with E2E skipped; never report that as full CI verification. See [testing strategy](../testing/TESTING_STRATEGY.md).
