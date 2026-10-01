# CHK-001 — Final Slice0 consistency check (owner approval R01–R05)

## Authority / scope

Owner approved Slice0 package and adopted R01–R05 on 2026-10-01. D01–D14 remain unchanged. This execution only updates Markdown; no production code, migration execution, infrastructure configuration or feature tests.

## 1. Artifacts changed

- [SPEC](../specs/SPEC-CHK-001.md): Approved status and adopted R01–R05 with calendar/eligibility/safety/scopes/physical source/urgency boundaries.
- ADR [016](../adr/016-visita-check-evolution.md), [017](../adr/017-check-movement-seam.md), [018](../adr/018-mecanico-auth-signature-identity.md), [019](../adr/019-vehicle-insurance-policy.md), [020](../adr/020-check-storage-migrations-scheduler.md): explicit approval/R addenda; original decision bodies preserved, no reopening D01–D14.
- [Contract](../contracts/CHK-001-contract.md), [migration plan](../migrations/CHK-001-visita-backfill-plan.md), [UX](../design/ux-check-operativo-v1.md).
- [EWO015](../engineering-work-orders/EWO-015.md)–[EWO022](../engineering-work-orders/EWO-022.md): adopted policies, closed owner decisions, implementation authority still held; EWO015 technical Ready and exact test catalog.
- [Package review](../engineering-work-orders/CHK-001-slice-0-review.md), indexes, context/domain/AGENTS/ICM target overlays and original discovery latest status note. Older analysis/evidence is historical, no claim runtime implemented.
- This final evidence and [prior evidence](CHK-001-slice-0.md) linked as history.

## 2. Remaining unresolved decisions

None OWNER_DECISION_REQUIRED. R01–R05 are policies adopted, not questions.
Real facility/vehicle mapping, numeric PSI, identity provider/issuer/audience, private storage credentials/permissions, scheduler invocation time, DB target/backup and operational config values are provisioned during authorized future execution. They are not new owner decisions or requirements to implement the scoped Slice1 foundation. Failure to configure a capability prevents its activation.

## 3. Is EWO015 implementation-ready?

Yes, technically Ready for contract/scope. Package approved, scope and migration compatibility defined, no dependency on implementation of later slices, S1-T01–11 and merge gates traceable.
Execution remains explicitly held by owner's no-production-code instruction. Readiness does not permit starting implementation, running migrations or deployment.

## 4. Exact EWO015 scope

1. Extend existing Visita/public identity with canonical type/status/version and CHECK extension1:1; no parallel WorkOrder.
2. Legacy adapters201/200 and legacy draft slot; new maintenance API0..N and CHECK maxone active, backend plus partial PostgreSQL index.
3. Versioned TypeORM runner/DataSource and foundation migrations/audit/backfill/constraints; install new indexes before retiring global, safe old-writer drain/recovery. Minimal CI/package wiring for APIbuild and isolated migration rehearsal.
4. CHECK creation/read APIs, canonical maintenance create/list and proper role/scope/error/winner contracts; no claim/start/technical capture yet.
5. MECANICO/TrustedActor/AuthenticationPort and guards, explicit development stub boundary/production deny without trusted adapter; facility mapping+MexicoCity calendar config foundation, no physical state implementation.
6. Maintenance-only history/hub/km/cadence filters and unchanged VisitaCerrada semantics.

Excluded: daily/scheduler/modal/audit delivery; claim/condition/PSI; S3/evidence; findings/preparedCorrective; review/sign/closure/invalidation/signedchildtriggers; Flota physical/documentary/Tower/urgency; movement authorization. Real production auth/provider/deploy and non-disposable DB migrations also excluded absent separate authority.

## 5. Exact tests/gates before merge

[EWO015 Testing Requirements](../engineering-work-orders/EWO-015.md#testing-requirements) is canonical execution checklist:

- S1-T01/02: active states uniqueness and real PostgreSQL concurrent core manual/DAILY-source create→one201/one409+winningOT, no scheduler implementation.
- S1-T03/04: Nmaintenance coexistence and blocker independent type, legacy create body/validation201/200/slot concurrency, legacy API excludes CHECK.
- S1-T05/06/07: isolated migration runner with synchronize=false; up/version/idempotency/IDs/children/mapping; null/duplicates/orphans abort without automatic repair; indexes/deferred subtype constraint; old-bootstrap drain and non-destructive recovery.
- S1-T08: trusted actor/roles/facility, deny forged/missing/crossfacility, production+stub/missing trusted adapter no fallback.
- S1-T09: maintenance filters and legacy VisitaCerrada exact envelope/effects unchanged; CHECK create/read not inventory/cadence/maintenance; closure disabled here, real completion assertions belong Slice6.
- S1-T10: per-vehicle facility configurable, local MexicoCity23:59:59.999→next00:00 boundary, hostUTC irrelevant.
- S1-T11: API parsing/status/scope, structured errors and winner lookup outside aborted23505txn; unrelated indexes not misclassified.

Required future commands: in api, npm test -- --runInBand; npm run build; npm run test:e2e -- --runInBand. Migration rehearsal separately reported despite normal E2E synchronize setup. Full existing CI also web npm run lint/npm run build; no UI proof gate because this EWO does not modify UI.
Preflight effective disposable DB with DATABASE_URL precedence confirmed before destructive test fixtures. Required tests/gates all PASS; SKIPPED or FAIL remains incomplete. AC/evidence/risk/recovery/security/schema/compatibility review and authorized execution/PR review before merge. Merge does not authorize production deployment or migrations.

## Consistency matrix

| Layer | Final agreement |
|---|---|
| SPEC / contract / ADRs | OwnerR01–R05 adopted; D01–D14 closed, Visita sole aggregate, CHECK_COMPLETED never maintenance event |
| Calendar | Config facility per vehicle; V1 America/Mexico_City and local calendar midnight-to-next-midnight; no TTL24h |
| Daily | ACTIVA+Flota EN_PATIO available+no active; EN_RUTA/EN_TALLER/INACTIVA excluded; unproven/inconsistent source does not fabricate eligibility |
| Safety | Five hard conditions R02, PSI normal/critical configured unit/type; inclusive nested ranges; no hard downgrade operable |
| Auth | Authorized facility for claim/assign; mechanic technical and Logistics operational invalidation with reason; missing identity/scope deny |
| Physical | Flota/Patio owns enum4 explicit transition source; knowledge-null distinct from state; journey conflict visible without reconciliation |
| Urgency | Config persisted/versioned defaults overduepositive<=2hAttention/>2hCritical; zero nooverdue; source due instant baseline, no elapsed2h from departure |
| Migrations / EWOs | Global logical phases split by owning slice; Slice1 only foundation, no premature physical/storage/docs/signedcompletion |
| UX / EWOs | Existing DS/navigation, exactlyfoursteps; approved target, no UI implemented, later slices pending dependencies |

## Verification results

PASS final documentary audit: 36 Markdown artifacts and 330 local references verified; AC01–36 traceability complete; EWO015 Ready with execution held; tests S1-T01–11 specified; later EWO dependency scopes consistent; original ADR015 body unchanged; explicit approved R addenda present; only Markdown changed; no stale active owner-question claims. `git diff --check` passed.
Runtime API/web/E2E/migration/S3/auth tests: SKIPPED (documentation-only per instruction). Planned tests are not execution evidence.
