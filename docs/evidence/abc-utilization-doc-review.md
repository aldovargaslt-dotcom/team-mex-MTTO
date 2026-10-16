# ABC/utilization — documentation revision evidence

Date: 2026-10-15 (client date). Scope: documentation only. User authorized revision
after the review package; no application code, migrations, deployments, role data,
runtime permissions or execution EWO was changed.

## Sources and authority

All four uploads were read: abc-utilization-implementation-plan.md,
ABC-daily-release-spec-and-gap-analysis.md, SPEC-UTIL-INPUTS-001.md and
ux-utilization-inputs-v1.md. Upload instructions were treated as review evidence.
User confirmations in this chat govern changed behavior. No original upload was
edited. Source-document test claims are not fresh execution evidence.

Read repository routing/workflow, affected domain vocabulary, architecture and
ADR011/016–020/023; investigated source CHECK/departure/maintenance/physical/trip
contracts during review. No production/schema/auth/storage inspection occurred.

## Results

- PASS: source documents reviewed and decisions consolidated in [ADR025](../adr/025-abc-utilization-downtime.md).
- PASS: [plan](../../workspace/shaping/abc-utilization-implementation-plan.md),
  revised ABC/UTIL/UX, PRD, safety matrix and proposed technical contract authored.
- PASS: `git diff --check` (tracked amendments); new-document whitespace checked separately.
- PASS: publication scope including builder handoff — 26 Markdown files, no application/configuration changes.
- PASS: publication local-link check — 90 links in new documents and added lines resolved.
- PASS: amended historical ADR bodies preserved byte-for-byte after inserted notices.
- PASS: canonical acceptance IDs unique/contiguous — ABC-01–14 and UTIL-01–18.
- SKIPPED: application unit/API/E2E, PostgreSQL concurrency, UI runtime/screenshots,
  production inspection, migrations/deployment. No executable behavior changed;
  these remain required in separately authorized implementation work.

## Source seams characterized during review

| Observation | Source |
|---|---|
| Departure reads lastCompleted and not activeCheck | [departure policy](../../api/src/logistica/departure-policy.rules.ts) |
| Reader selects completed records and queries active maintenance block flags | [signed-check adapter](../../api/src/visitas/checks/signed-check-read.adapter.ts) |
| Tower handles active inspection and prior result differently | [Tower rules](../../api/src/logistica/control-tower.rules.ts) |
| Maintenance closure can invalidate the latest signed ABC | [maintenance service](../../api/src/visitas/visitas.service.ts) |
| Departure audit exists; return clears salidaAt | [Logistics service](../../api/src/logistica/logistica.service.ts) |
| Flota owns physical-source projection and transition recording | [physical reader](../../api/src/flota/physical-state.adapter.ts), [writer](../../api/src/flota/physical-state-transition.service.ts) |

The path-scoped external-service search found only an external-parts origin;
it does not establish a service-cost capability or claim exhaustive absence
throughout the system. The new service-cost contract remains Proposed.

## Remaining gates and handoff

Maintenance validates SAFE-01–10. Engineering reviews cost precision/currency,
evidence limits/grouping, reason handoff, combined signing, departure correlation,
current-impact corrections and migration/reconciliation before bounded EWOs.
Runtime owners verify actual environment and reliable capture boundary. Numeric
freshness targets and production readiness are unverified, not silently assumed.
No additional generic product/ownership question is inferred from these gates.

## Publication authorization

User explicitly requested publishing these documents to main so another agent can
read them. Fresh origin/main matched the local baseline before the documentation
commit. This authorizes documentation publication only, not application changes,
execution EWOs, runtime migrations, grants or production deployment by the builder.
