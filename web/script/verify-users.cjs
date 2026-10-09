/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node integration fixture, not browser code. */
/* EWO-025: real Auth controllers/services/Postgres behind a synthetic OIDC
 * provider. Requires disposable DB confirmation; never uses real accounts.
 * From web: EWO_DISPOSABLE_DB=true DATABASE_URL='' node script/verify-users.cjs
 * AUTH_PROOF_KEEP=1 leaves the owned servers up for CDP walkthrough.
 */
require('../../api/node_modules/reflect-metadata');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const https = require('node:https');
const http = require('node:http');
const crypto = require('node:crypto');
const tls = require('node:tls');
const { spawn, spawnSync } = require('node:child_process');
const { generateKeyPair, exportJWK, SignJWT } = require('jose');
const { Test } = require('../../api/node_modules/@nestjs/testing');
const { Controller, Get } = require('../../api/node_modules/@nestjs/common');
const { ConfigModule, ConfigService } = require('../../api/node_modules/@nestjs/config');
const { APP_GUARD } = require('../../api/node_modules/@nestjs/core');
const { TypeOrmModule } = require('../../api/node_modules/@nestjs/typeorm');
const { TrustedAuthModule } = require('../../api/dist/auth/trusted-auth.module');
const { UserAdministrationModule } = require('../../api/dist/auth/user-administration.module');
const { AuthGuard } = require('../../api/dist/auth/auth.guard');
const { RolesGuard } = require('../../api/dist/auth/roles.guard');
const { UserAccess, UserAccessAudit } = require('../../api/dist/auth/user-access.entity');
const { Facility } = require('../../api/dist/visitas/checks/facility.entity');
const { DataSource } = require('../../api/node_modules/typeorm');
const { configureApp } = require('../../api/dist/configure-app');
const { createAuthMigrationDataSource } = require('../../api/dist/db/auth-migration-data-source');
const issuer = 'https://localhost:3212', origin = 'https://localhost:3213', apiOrigin = 'https://localhost:3211';
let app, child, provider, webTls, temp, subject = 'fixture-admin';
const json = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' }); res.end(JSON.stringify(body)); };
async function close() {
  child?.kill('SIGTERM');
  await app?.close();
  await Promise.all([provider, webTls].filter(Boolean).map((server) => new Promise((resolve) => { server.close(resolve); server.closeAllConnections(); })));
  if (temp) fs.rmSync(temp, { recursive: true, force: true });
}
async function main() {
  assert.equal(process.env.EWO_DISPOSABLE_DB, 'true', 'explicit disposable database authorization');
  assert.ok(!process.env.DATABASE_URL?.trim(), 'clear DATABASE_URL');
  assert.notEqual(process.env.NODE_ENV, 'production', 'fixture must not run in production');
  const connection = { type: 'postgres', host: 'localhost', port: 5432, username: 'team_mex', password: 'team_mex', database: 'team_mex_mtto_test' };
  temp = fs.mkdtempSync(path.join(os.tmpdir(), 'team-mex-users-'));
  const cert = path.join(temp, 'cert.pem'), key = path.join(temp, 'key.pem');
  assert.equal(spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost', '-addext', 'basicConstraints=critical,CA:TRUE', '-keyout', key, '-out', cert], { stdio: 'ignore' }).status, 0);
  tls.setDefaultCACertificates([...tls.getCACertificates(), fs.readFileSync(cert, 'utf8')]);
  const httpsOptions = { cert: fs.readFileSync(cert), key: fs.readFileSync(key) };
  const signing = await generateKeyPair('RS256');
  const jwk = { ...await exportJWK(signing.publicKey), kid: 'users-fixture', alg: 'RS256' };
  const mint = (sub, audience, claims = {}) => new SignJWT(claims).setProtectedHeader({ alg: 'RS256', kid: 'users-fixture' }).setIssuer(issuer).setAudience(audience).setSubject(sub).setIssuedAt().setExpirationTime('1h').sign(signing.privateKey);
  const codes = new Map();
  provider = https.createServer(httpsOptions, async (req, res) => {
    try {
      const url = new URL(req.url, issuer);
      if (url.pathname === '/select') { subject = url.searchParams.get('subject'); res.writeHead(302, { Location: origin }); return res.end(); }
      if (url.pathname === '/.well-known/openid-configuration') return json(res, 200, { issuer, authorization_endpoint: `${issuer}/authorize`, token_endpoint: `${issuer}/token`, jwks_uri: `${issuer}/jwks` });
      if (url.pathname === '/jwks') return json(res, 200, { keys: [jwk] });
      if (url.pathname === '/authorize') {
        assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
        const code = crypto.randomBytes(24).toString('hex');
        codes.set(code, { challenge: url.searchParams.get('code_challenge'), nonce: url.searchParams.get('nonce'), subject });
        const callback = new URL(url.searchParams.get('redirect_uri'));
        callback.searchParams.set('code', code); callback.searchParams.set('state', url.searchParams.get('state'));
        res.writeHead(302, { Location: callback.href }); return res.end();
      }
      if (url.pathname === '/token') {
        let body = ''; for await (const chunk of req) body += chunk;
        const params = new URLSearchParams(body), flow = codes.get(params.get('code'));
        codes.delete(params.get('code'));
        if (!flow || params.get('client_secret') !== 'fixture-secret' || crypto.createHash('sha256').update(params.get('code_verifier') ?? '').digest('base64url') !== flow.challenge) return json(res, 400, { error: 'invalid_grant' });
        const access = await mint(flow.subject, 'team-mex-api');
        const id = await mint(flow.subject, 'web-client', { nonce: flow.nonce, at_hash: crypto.createHash('sha256').update(access, 'ascii').digest().subarray(0, 16).toString('base64url') });
        return json(res, 200, { token_type: 'Bearer', access_token: access, id_token: id, expires_in: 3600 });
      }
      json(res, 404, {});
    } catch { json(res, 500, { error: 'fixture_error' }); }
  });
  await new Promise((resolve) => provider.listen(3212, 'localhost', resolve));
  // Only this explicitly disposable DB is touched; isolate Auth from CHECK migrations.
  const migration = createAuthMigrationDataSource(connection);
  await migration.initialize();
  try {
    assert.equal((await migration.query('SELECT current_database() AS name'))[0].name, 'team_mex_mtto_test');
    await migration.query('DROP SCHEMA IF EXISTS auth CASCADE');
    await migration.query('DROP TABLE IF EXISTS auth_schema_migrations');
    await migration.runMigrations();
  } finally { await migration.destroy(); }
  const config = new ConfigService({ AUTH_MODE: 'OIDC', AUTH_ACTOR_STORE: 'DATABASE', NODE_ENV: 'test', AUTH_OIDC_ISSUER: issuer, AUTH_OIDC_AUDIENCE: 'team-mex-api', AUTH_OIDC_JWKS_URL: `${issuer}/jwks`, AUTH_OIDC_ACTORS: JSON.stringify({ 'fixture-admin': { displayName: 'Administrador de prueba', roles: ['ADMIN_DIRECTIVO'], facilityScopes: ['users-mex'] } }) });
  class FixtureViews {
    badge() { return { unread: 0 }; }
    empty() { return []; }
    checks() { return { items: [], counts: { total: 0, active: 0 } }; }
  }
  Controller()(FixtureViews);
  Get('notifications/badge')(FixtureViews.prototype, 'badge', Object.getOwnPropertyDescriptor(FixtureViews.prototype, 'badge'));
  Get('checks')(FixtureViews.prototype, 'checks', Object.getOwnPropertyDescriptor(FixtureViews.prototype, 'checks'));
  Get(['configuracion/alertas', 'andon/avisos', 'inventario/stock', 'inventario/pendientes-comprobante', 'notifications'])(FixtureViews.prototype, 'empty', Object.getOwnPropertyDescriptor(FixtureViews.prototype, 'empty'));
  const testContext = await Test.createTestingModule({ imports: [ConfigModule.forRoot({ isGlobal: true }), TypeOrmModule.forRoot({ ...connection, entities: [Facility, UserAccess, UserAccessAudit], synchronize: false, dropSchema: false }), TrustedAuthModule, UserAdministrationModule], controllers: [FixtureViews], providers: [{ provide: APP_GUARD, useClass: AuthGuard }, { provide: APP_GUARD, useClass: RolesGuard }] }).overrideProvider(ConfigService).useValue(config).compile();
  const db = testContext.get(DataSource);
  await db.query('CREATE TABLE IF NOT EXISTS public.facilities (id varchar PRIMARY KEY, name varchar NOT NULL, timezone varchar NOT NULL, version integer NOT NULL)');
  await db.getRepository(Facility).save({ id: 'users-mex', name: 'Patio de prueba', timezone: 'America/Mexico_City', version: 1 });
  app = testContext.createNestApplication({ httpsOptions, logger: false });
  configureApp(app); await app.init(); await app.listen(3211, 'localhost');
  child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '3210', '-H', 'localhost'], { cwd: path.resolve(__dirname, '..'), env: { ...process.env, NODE_ENV: 'production', WEB_AUTH_MODE: 'OIDC', AUTH_APP_ORIGIN: origin, AUTH_OIDC_ISSUER: issuer, AUTH_OIDC_CLIENT_ID: 'web-client', AUTH_OIDC_CLIENT_SECRET: 'fixture-secret', AUTH_SESSION_SECRET: crypto.randomBytes(32).toString('base64'), API_URL: apiOrigin, NODE_EXTRA_CA_CERTS: cert }, stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = ''; child.stdout.on('data', (chunk) => logs += chunk); child.stderr.on('data', (chunk) => logs += chunk);
  webTls = https.createServer(httpsOptions, (req, res) => {
    const upstream = http.request({ hostname: 'localhost', port: 3210, path: req.url, method: req.method, headers: req.headers }, (response) => { res.writeHead(response.statusCode, response.headers); response.pipe(res); });
    upstream.on('error', () => { res.writeHead(502); res.end(); }); req.pipe(upstream);
  });
  await new Promise((resolve) => webTls.listen(3213, 'localhost', resolve));
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw new Error(`Next fixture failed: ${logs}`);
    try { if ((await fetch(`${origin}/api/auth/session`)).status === 200) break; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  const begin = await fetch(`${origin}/api/auth/login`, { redirect: 'manual' });
  const flowCookie = begin.headers.getSetCookie().find((cookie) => cookie.startsWith('team-mex-login='))?.split(';')[0];
  const authorization = await fetch(begin.headers.get('location'), { redirect: 'manual' });
  const callback = await fetch(authorization.headers.get('location'), { redirect: 'manual', headers: { Cookie: flowCookie } });
  const session = callback.headers.getSetCookie().find((cookie) => cookie.startsWith('team-mex-session='))?.split(';')[0];
  assert.ok(session?.split('=')[1]);
  const headers = { Cookie: session, Origin: origin, 'Content-Type': 'application/json' };
  assert.equal((await fetch(`${origin}/backend/admin/users`)).status, 401);
  const list = await fetch(`${origin}/backend/admin/users`, { headers });
  assert.equal(list.status, 200); assert.ok(list.headers.get('cache-control').includes('no-store'));
  const initial = await list.json(); assert.equal(initial.length, 1);
  const account = { subject: 'fixture-http-mechanic', displayName: 'Mecánico HTTP', roles: ['MECANICO'], facilityScopes: ['users-mex'], active: true };
  const created = await fetch(`${origin}/backend/admin/users`, { method: 'POST', headers, body: JSON.stringify(account) });
  assert.equal(created.status, 201); const user = await created.json();
  const mechanicToken = await mint(account.subject, 'team-mex-api');
  assert.equal((await fetch(`${apiOrigin}/admin/users`, { headers: { Authorization: `Bearer ${mechanicToken}`, 'X-Role': 'ADMIN_DIRECTIVO' } })).status, 403);
  const { subject: unusedSubject, ...fields } = account; void unusedSubject;
  const disabled = await fetch(`${origin}/backend/admin/users/${user.id}`, { method: 'PATCH', headers, body: JSON.stringify({ ...fields, active: false, version: user.version }) });
  assert.equal(disabled.status, 200); const inactive = await disabled.json();
  assert.equal((await fetch(`${apiOrigin}/auth/me`, { headers: { Authorization: `Bearer ${mechanicToken}` } })).status, 401);
  assert.equal((await fetch(`${origin}/backend/admin/users/${user.id}`, { method: 'PATCH', headers, body: JSON.stringify({ ...fields, version: user.version }) })).status, 409);
  assert.equal((await fetch(`${origin}/backend/admin/users/${user.id}`, { method: 'PATCH', headers, body: JSON.stringify({ ...fields, version: inactive.version }) })).status, 200);
  const audit = await fetch(`${origin}/backend/admin/users/${user.id}/audit`, { headers });
  assert.equal((await audit.json()).length, 3);
  const admin = initial[0];
  assert.equal((await fetch(`${origin}/backend/admin/users/${admin.id}`, { method: 'PATCH', headers, body: JSON.stringify({ displayName: admin.displayName, roles: admin.roles, facilityScopes: admin.facilityScopes, active: false, version: admin.version }) })).status, 409);
  console.log('PASS OIDC → encrypted web session → real Admin API → PostgreSQL; create/edit/disable/re-enable, stale-version/last-admin denial, audit and non-admin 403.');
  if (process.env.AUTH_PROOF_KEEP === '1') { console.log(`READY browser proof ${origin}; only provider and unrelated empty domain views are synthetic.`); return; }
  await close();
}
process.on('SIGTERM', () => { void close().then(() => process.exit(0)); });
process.on('SIGINT', () => { void close().then(() => process.exit(0)); });
main().catch(async (error) => { console.error(error); await close(); process.exitCode = 1; });
