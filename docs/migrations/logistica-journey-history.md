# EWO-038 — Run and verify the Logistics journey implementation

Owner approved implementation in this chat: “okay go ahead with the plan”.
No deployment or external migration was authorized. This guide does not change
that boundary. [EWO](../engineering-work-orders/EWO-038.md),
[contract](../contracts/LOG-JOURNEY-001-contract.md),
[evidence](../evidence/EWO-038.md).

## Verify the implementation in this workspace

The implementation is already written. The current disposable native PostgreSQL
16 test cluster is at 127.0.0.1:55438, with data directory /tmp/ewo038-pgdata.
It is separate from the pre-existing service on port 5432, which was not used.
If this execution environment is replaced, follow the repository's native
PostgreSQL setup or documented human Docker setup first and verify the new target.

From /workspace/team-mex-MTTO/api:

```bash
npm ci
DATABASE_URL='' DB_HOST=127.0.0.1 DB_PORT=55438 DB_USER=team_mex DB_PASSWORD=team_mex DB_SSL=false EWO_DISPOSABLE_DB=true \
  npm run test:e2e -- --runInBand --runTestsByPath \
  test/logistica-journey.e2e-spec.ts \
  test/logistica-journey-migrations.e2e-spec.ts \
  test/journey-web-proxy.e2e-spec.ts
```

This command destroys/recreates test schemas. Use it only with the verified
disposable cluster. The migration suite uses logistica_journey_migration_test;
application suites use team_mex_mtto_test. An inherited DATABASE_URL is explicitly
cleared because it overrides DB_NAME. No production target is involved.

## Run the application against a prepared local baseline

Use the existing local configuration and trusted authentication setup. New return
commands require trusted identity; X-Role/X-User-Id alone are not authentication.
For a new database, prepare the existing Kernel/CHECK/other module baseline first.
This slice's isolated runner deliberately does not invent another module's schema.
Do not use synchronize to bypass the journal or invent a capture epoch.

Stop local writers, build the API, then inspect the explicitly selected local
baseline copy with existing DB connection selectors:

```bash
npm run build
DB_SYNCHRONIZE=false DB_DROP_SCHEMA=false \
  LOGISTICA_MIGRATION_DATABASE='<local-baseline-database>' \
  node dist/db/run-logistica-migrations.js inspect
```

For that local copy only, apply with the actual reviewed source commit and
confirmed drained writers:

```bash
DB_SYNCHRONIZE=false DB_DROP_SCHEMA=false \
  LOGISTICA_MIGRATION_DATABASE='<local-baseline-database>' \
  LOGISTICA_CAPTURE_COMMIT='<reviewed-40-character-source-commit>' \
  LOGISTICA_WRITERS_DRAINED=true \
  node dist/db/run-logistica-migrations.js up
```

The runner checks effective database name, journal, columns, primary/secondary
keys, constraints, audit/capture references and preservation of baseline data.
Retry is a verified no-op only when the journal/schema/data remain consistent.
It refuses synchronized schema drift without its dedicated journal. Do not launch
an older history-discarding writer after capture begins.

Start the API with the same selected local DB configuration:

```bash
DB_SYNCHRONIZE=false DB_DROP_SCHEMA=false npm run start:dev
```

From /workspace/team-mex-MTTO/web, start the web application:

```bash
npm ci
NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1 npm run dev
```

The TLS setting is needed for Google Fonts in this managed environment. It uses
system trust; no certificate validation is disabled and no font/app configuration
was changed. The same setting makes npm run build succeed here.

GET /health is liveness. GET /health/ready must return 200 before lifecycle capture
is ready; missing schema or capture configuration returns 503 without creating
facts. Existing open journeys remain marked as incomplete legacy history.

## Recovery and remaining checks

The migration was rehearsed only on disposable PostgreSQL, never on a working or
production DB. down is guarded to disposable pre-capture targets and refuses once
reliable endpoints/receipts/revisions exist. Preserve data and recover forward
after capture; an interruption requires an explicit new coverage epoch.

Existing gates, departure audits and Flota custody remain separate. Browser
commands carry technical identity/revision metadata; no new operator fields.
Confirmed pending commands automatically resume once after reload with their
original key/subject/context, including first commit if the original send was lost.
Conflicts suspend automatic resumption and require review.

Automated browser-storage/BFF/API/PostgreSQL coverage is in the evidence.
Interactive React click-through was not available in this environment and remains
a manual handoff check. No deployment, pilot or production readiness is claimed.
