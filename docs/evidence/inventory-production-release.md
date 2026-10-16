# Inventory/unit production release evidence

User authorization: “Go ahead and do the changes to push to production.” Client date2026-10-15 (America/Los_Angeles). Original PR96 implementation evidence and independent UX review remain linked in EWO040. This instruction authorizes merge and production release, including the bounded additive financial migration.

## Preflight

- Original head8fb3b98: GitHub API/E2E, web lint/build and Vercel preview all SUCCESS.
- Existing production web and both documented Railway API health domains returned200 before release. Health did not yet contain the inventory release marker.
- This session has GitHub access. Cloud environment reports no Railway/Vercel credentials or production database bindings. No secret values inspected; no direct production database queries executed.

## Release fix

Adds inventory ledger to existing bounded pre-deploy/production bootstrap guard, shares lock/ledger with manual runner, and defaults costing enabled after schema preparation while honoring explicit operator disable. Public health includes a non-secret release marker, Railway commit when provided, and costing flag to distinguish old health from a deployed release. No runtime user, quantity, historic price or auth configuration is fabricated.

## Checks

- PASS: targeted production migration + financial integration11 tests, isolated PostgreSQL16 localhost55433. Legacy schema upgrade, concurrent/repeated deploy, quantity/order conservation, valuation preservation and unsynchronized Nest restart.
- PASS: feature activation unit tests2 cases (production default, explicit false/invalid override).
- Final build/full regression/CI and production observations recorded below as they complete.

Runbook: [Railway inventory release](../migrations/railway-inventory-cost-release.md). No production migration or authenticated operational workflow is claimed complete at preflight.

Final local regression after release changes:

- PASS: `npm --prefix api test -- --runInBand` —53 suites/257 tests.
- PASS: `DATABASE_URL='' DB_HOST=127.0.0.1 DB_PORT=55433 EWO_DISPOSABLE_DB=true npm --prefix api run test:e2e -- --runInBand --testTimeout=30000` —19 suites/153 tests.
- PASS: `npm --prefix api run build`.
- No new UI changes in this release fix; original web build/lint and independent UX proof remain valid. Exact updated head CI is required before merge.

GitHub CLI token expired during preflight; the authenticated GitHub connector remains authorized and is used to publish the exact tested file changes and perform the authorized merge. No credential value was printed or copied.
