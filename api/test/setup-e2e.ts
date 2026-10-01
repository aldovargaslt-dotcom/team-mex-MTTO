if (process.env.EWO_DISPOSABLE_DB !== 'true') {
  throw new Error(
    'Verify a disposable database and set EWO_DISPOSABLE_DB=true before destructive e2e tests.',
  );
}
if (process.env.DATABASE_URL?.trim()) {
  throw new Error(
    'Clear DATABASE_URL before destructive e2e tests; it overrides the test DB_NAME.',
  );
}
// Prevent a subsequently loaded .env from supplying a non-test URL.
process.env.DATABASE_URL = '';
process.env.DB_HOST ??= 'localhost';
process.env.DB_PORT ??= '5432';
process.env.DB_USER ??= 'team_mex';
process.env.DB_PASSWORD ??= 'team_mex';
process.env.DB_NAME = 'team_mex_mtto_test';
process.env.DB_SYNCHRONIZE = 'true';
process.env.DB_DROP_SCHEMA = 'true';
