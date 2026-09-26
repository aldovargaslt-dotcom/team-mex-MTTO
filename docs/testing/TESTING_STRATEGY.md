# Testing strategy

[ADR-004](../adr/ADR-004-tdd-test-bar-andon-v0.md) owns the domain test bar and stable test IDs. This guide explains execution and reporting; it does not replace that catalog. See [workflow](../WORKFLOW.md).

## Existing strategy

API unit tests use Jest/ts-jest, pure rules/engines and in-memory fakes, plus service/adapter tests under `api/src`. API E2E uses Jest/Supertest against Nest and real PostgreSQL under `api/test`, with serial workers. Configuration: [API package](../../api/package.json), [E2E config](../../api/test/jest-e2e.json), [setup](../../api/test/setup-e2e.ts).

The frontend currently has lint/build and interactive click-through/screenshot verification, not an automated component/browser test suite. Preserve [screenshot workflow](../design/SCREENSHOT_WORKFLOW.md), [Visual QA](../design/VISUAL_QA.md), and the separate visual review required by AGENTS. Lint/build does not prove user interactions work. Do not introduce Playwright or another framework in this documentation change.

## Choosing checks

- Unit: business invariants, calculations, state transitions and failure cases in the owning domain rules/engine. Follow ADR-004 TDD expectations: failing test, minimal implementation, then safe refactoring.
- E2E: HTTP validation/roles, persistence, transactions, outbox and cross-module interactions through existing ports.
- Characterization: capture existing behavior before changing poorly covered code; distinguish observed behavior from approved new requirements.
- Regression: reproduce a bug with a failing test where practical, then verify the fix and relevant neighboring behavior.
- UI: map changed AC to role-based walkthroughs and relevant loading/empty/error/success/disabled states. Gradually identify repeated or risky interactions as candidates for future component tests; approve tooling separately before adding it. No framework is added here.

## Commands and data safety

| Working directory | Command | Purpose |
|---|---|---|
| `api` | `npm test` | Unit tests |
| `api` | `npm run test:e2e` | E2E against disposable PostgreSQL |
| `api` | `npm run test:cov` | Coverage report, not a configured coverage threshold |
| `api` | `npm run build` | API compile check |
| `web` | `npm run lint` | Frontend lint |
| `web` | `npm run build` | Frontend build |
| Repository root, Bash | `bash script/verify.sh` | API tests + web lint/build; E2E conditional on DB availability |

Install dependencies using each package's lockfile when execution is needed. Local DB setup stays in [README](../../README.md); CI configuration stays in [verify.yml](../../.github/workflows/verify.yml).

**In `api`, `npm run lint` includes `--fix` and may mutate files.** It is not a read-only review command. Formatting also writes files.

E2E setup sets `DB_NAME=team_mex_mtto_test`, `DB_SYNCHRONIZE=true` and `DB_DROP_SCHEMA=true`. Before running, confirm the resolved host/database is disposable. [Connection options](../../api/src/db/postgres-options.ts) prefer `DATABASE_URL` over `DB_NAME`; an inherited URL is not cleared by test setup. Do not point E2E at a working or production database. These are manual preflight checks, not a new automated protection.

## Traceability and reporting

Map SPEC AC IDs (or explicitly owned tiny-task criteria) to test IDs/files or named manual checks. Record actual commands, results and AC evidence in the [evidence record](../evidence/EVIDENCE-TEMPLATE.md); link it from EWO and PR. Never equate a planned test with an executed test.

Use `PASS`, `FAIL`, or `SKIPPED` for every check. For not run / not applicable checks use `SKIPPED` plus reason, impact and required follow-up. Documentation-only changes may skip runtime checks explicitly; inspect links and diff instead.

[verify.sh](../../script/verify.sh) can exit successfully after skipping E2E when PostgreSQL is unavailable. Report unit/web results individually and E2E as `SKIPPED`; this is **not full CI verification**. [CI](../../.github/workflows/verify.yml) requires API unit/E2E and web lint/build. Required failed or skipped checks leave verification incomplete, even when other checks pass. No tests/builds should be claimed without execution evidence.
