/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node CommonJS verification harness, not browser code. */
/* Local OIDC fixture and HTTP integration checks. No external accounts or DB.
 * Run after API/web builds: node script/verify-auth.cjs (from web).
 * AUTH_PROOF_KEEP=1 keeps fixture servers for separate browser proof.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const https = require('node:https');
const http = require('node:http');
const crypto = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');
const { generateKeyPair, exportJWK, SignJWT, EncryptJWT } = require('jose');
const { OidcAuthentication } = require('../../api/dist/auth/oidc-authentication');
const { ConfigService } = require('../../api/node_modules/@nestjs/config');
const webOrigin = 'https://localhost:3213', apiOrigin = 'https://localhost:3211', issuer = 'https://localhost:3212';
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'team-mex-auth-'));
let child, provider, api, webTls, calls = [], revoked = false, unavailable = false, mode = 'valid';
const codes = new Map();
const json = (res, status, data) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' }); res.end(JSON.stringify(data)); };
const close = async () => {
  child?.kill('SIGTERM');
  await Promise.all([provider, api, webTls].filter(Boolean).map(server => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); })));
  fs.rmSync(temp, { recursive: true, force: true });
};
async function main() {
  const cert = path.join(temp, 'cert.pem'), key = path.join(temp, 'key.pem');
  const result = spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=localhost',
    '-addext', 'subjectAltName=DNS:localhost', '-addext', 'basicConstraints=critical,CA:TRUE', '-keyout', key, '-out', cert], { stdio: 'ignore' });
  assert.equal(result.status, 0, 'local fixture certificate');
  const tls = require('node:tls');
  tls.setDefaultCACertificates([...tls.getCACertificates(), fs.readFileSync(cert, 'utf8')]);
  const signing = await generateKeyPair('RS256');
  const jwk = { ...await exportJWK(signing.publicKey), kid: 'fixture-key', alg: 'RS256', use: 'sig' };
  const actor = { displayName: 'Mecánico de prueba', roles: ['MECANICO'], facilityScopes: ['mex'] };
  provider = https.createServer({ cert: fs.readFileSync(cert), key: fs.readFileSync(key) }, async (req, res) => {
    try {
      const url = new URL(req.url, issuer);
      if (url.pathname === '/.well-known/openid-configuration') return json(res, 200, {
        issuer, authorization_endpoint: `${issuer}/authorize`, token_endpoint: `${issuer}/token`, jwks_uri: `${issuer}/jwks`,
      });
      if (url.pathname === '/jwks') return json(res, 200, { keys: [jwk] });
      if (url.pathname === '/authorize') {
        assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
        assert.equal(url.searchParams.get('audience'), 'team-mex-api');
        const code = crypto.randomBytes(24).toString('hex');
        codes.set(code, { challenge: url.searchParams.get('code_challenge'), nonce: url.searchParams.get('nonce') });
        const target = new URL(url.searchParams.get('redirect_uri'));
        target.searchParams.set('state', url.searchParams.get('state')); target.searchParams.set('code', code);
        res.writeHead(302, { Location: target.href }); return res.end();
      }
      if (url.pathname === '/token') {
        let body = ''; for await (const chunk of req) body += chunk;
        const params = new URLSearchParams(body), flow = codes.get(params.get('code'));
        codes.delete(params.get('code'));
        if (!flow || params.get('client_secret') !== 'fixture-secret' || params.get('client_id') !== 'web-client' ||
          params.get('redirect_uri') !== `${webOrigin}/api/auth/callback` ||
          crypto.createHash('sha256').update(params.get('code_verifier') || '').digest('base64url') !== flow.challenge)
          return json(res, 400, { error: 'invalid_grant' });
        const access = await new SignJWT({}).setProtectedHeader({ alg: 'RS256', kid: 'fixture-key' }).setIssuer(issuer)
          .setAudience('team-mex-api').setSubject(mode === 'unknown' ? 'unknown' : mode === 'multi' ? 'multi-fixture' : 'mechanic-fixture')
          .setIssuedAt().setExpirationTime(mode === 'expired' ? '-1m' : '1h').sign(signing.privateKey);
        const id = await new SignJWT({ nonce: mode === 'nonce' ? 'wrong' : flow.nonce,
          at_hash: mode === 'hash' ? 'wrong' : crypto.createHash('sha256').update(access, 'ascii').digest().subarray(0, 16).toString('base64url') })
          .setProtectedHeader({ alg: 'RS256', kid: 'fixture-key' }).setIssuer(issuer).setAudience('web-client')
          .setSubject(mode === 'multi' ? 'multi-fixture' : 'mechanic-fixture').setIssuedAt().setExpirationTime('1h').sign(signing.privateKey);
        return json(res, 200, { token_type: 'Bearer', access_token: access, id_token: id, expires_in: 3600 });
      }
      json(res, 404, {});
    } catch { json(res, 500, { error: 'fixture_failure' }); }
  });
  await new Promise(resolve => provider.listen(3212, 'localhost', resolve));
  // Real API adapter verifies against the fixture HTTPS JWKS endpoint.
  const adapter = new OidcAuthentication(new ConfigService({ AUTH_OIDC_ISSUER: issuer, AUTH_OIDC_AUDIENCE: 'team-mex-api',
    AUTH_OIDC_JWKS_URL: `${issuer}/jwks`, AUTH_OIDC_ACTORS: JSON.stringify({ 'mechanic-fixture': actor,
      'multi-fixture': { displayName: 'Usuario con dos roles', roles: ['MECANICO', 'SUPERVISOR'], facilityScopes: ['mex'] } }) }));
  api = https.createServer({ cert: fs.readFileSync(cert), key: fs.readFileSync(key) }, async (req, res) => {
    if (unavailable) return json(res, 503, { message: 'Fixture unavailable' });
    const trusted = await adapter.authenticate({ header: name => req.headers[name] });
    calls.push({ path: req.url, headers: req.headers });
    if (!trusted || revoked) return json(res, 401, { message: 'Unauthorized' });
    if (req.url === '/auth/me') return json(res, 200, trusted);
    if (req.url === '/fixture/revoke' && req.method === 'POST') { revoked = true; return json(res, 200, {}); }
    if (req.url === '/fixture/multi-next' && req.method === 'POST') { mode = 'multi'; return json(res, 200, {}); }
    if (req.url === '/fixture/file') { res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(Buffer.from([0, 1, 2, 255])); }
    if (req.url === '/checks?scope=mine-or-eligible') return json(res, 200, { items: [], counts: { total: 0, active: 0 } });
    if (req.url === '/notifications/badge') return json(res, 200, { unread: 0 });
    let bytes = 0; for await (const chunk of req) bytes += chunk.length;
    json(res, 200, { method: req.method, bytes, subject: trusted.subject });
  });
  await new Promise(resolve => api.listen(3211, 'localhost', resolve));
  const sessionKey = crypto.randomBytes(32);
  child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '3210', '-H', 'localhost'], {
    cwd: path.resolve(__dirname, '..'), env: { ...process.env, NODE_ENV: 'production', WEB_AUTH_MODE: 'OIDC',
      AUTH_APP_ORIGIN: webOrigin, AUTH_OIDC_ISSUER: issuer, AUTH_OIDC_CLIENT_ID: 'web-client', AUTH_OIDC_CLIENT_SECRET: 'fixture-secret',
      AUTH_OIDC_AUDIENCE: 'team-mex-api',
      AUTH_SESSION_SECRET: sessionKey.toString('base64'), API_URL: apiOrigin, NODE_EXTRA_CA_CERTS: cert },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  webTls = https.createServer({ cert: fs.readFileSync(cert), key: fs.readFileSync(key) }, (req, res) => {
    const upstream = http.request({ hostname: 'localhost', port: 3210, path: req.url, method: req.method, headers: req.headers }, incoming => {
      res.writeHead(incoming.statusCode, incoming.headers); incoming.pipe(res);
    });
    upstream.on('error', () => { res.writeHead(502); res.end(); }); req.pipe(upstream);
  });
  await new Promise(resolve => webTls.listen(3213, 'localhost', resolve));
  let logs = ''; child.stdout.on('data', chunk => logs += chunk); child.stderr.on('data', chunk => logs += chunk);
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw new Error(`Preview failed: ${logs}`);
    try { if ((await fetch(`${webOrigin}/api/auth/session`)).status === 200) break; } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  // Follow fixture's authorization endpoint without disabling certificate verification.
  const providerGet = url => new Promise((resolve, reject) => {
    https.get(url, { ca: fs.readFileSync(cert) }, res => { res.resume(); resolve(res.headers.location); }).on('error', reject);
  });
  const cookie = (response, name) => response.headers.getSetCookie().find(value => value.startsWith(`${name}=`))?.split(';')[0];
  const begin = async () => {
    const response = await fetch(`${webOrigin}/api/auth/login`, { redirect: 'manual' });
    assert.equal(response.status, 307);
    const flow = cookie(response, 'team-mex-login'); assert.ok(flow);
    const callback = await providerGet(response.headers.get('location'));
    return { flow, callback };
  };
  let response = await fetch(`${webOrigin}/api/auth/session`);
  assert.equal((await response.json()).authenticated, false);
  response = await fetch(`${webOrigin}/backend/fixture/echo`, { headers: { 'X-Role': 'ADMIN_DIRECTIVO', 'X-User-Id': 'forged', Authorization: 'Bearer attacker' } });
  assert.equal(response.status, 401);
  let flow = await begin();
  const bad = new URL(flow.callback); bad.searchParams.set('state', 'forged');
  response = await fetch(bad, { redirect: 'manual', headers: { Cookie: flow.flow } });
  assert.ok(response.headers.get('location').includes('authError=login')); assert.ok(!cookie(response, 'team-mex-session')?.split('=')[1]);
  for (const failure of ['nonce', 'hash', 'expired', 'unknown']) {
    mode = failure; flow = await begin();
    response = await fetch(flow.callback, { redirect: 'manual', headers: { Cookie: flow.flow } });
    assert.ok(response.headers.get('location').includes('authError=login'), failure);
  }
  mode = 'valid'; flow = await begin();
  response = await fetch(flow.callback, { redirect: 'manual', headers: { Cookie: flow.flow } });
  assert.equal(response.headers.get('location'), `${webOrigin}/`);
  const session = cookie(response, 'team-mex-session'); assert.ok(session);
  const setCookie = response.headers.getSetCookie().find(value => value.startsWith('team-mex-session=') && value.includes('Max-Age=3'));
  assert.ok(setCookie?.includes('HttpOnly')); assert.ok(setCookie?.includes('Secure')); assert.ok(setCookie?.includes('SameSite=lax'));
  response = await fetch(flow.callback, { redirect: 'manual', headers: { Cookie: flow.flow } });
  assert.ok(response.headers.get('location').includes('authError=login'), 'code replay rejected');
  response = await fetch(`${webOrigin}/api/auth/session`, { headers: { Cookie: session } });
  const state = await response.json(); assert.equal(state.actor.subject, 'mechanic-fixture');
  assert.deepEqual(state.actor.roles, ['MECANICO']); assert.ok(!JSON.stringify(state).includes('accessToken'));
  response = await fetch(`${webOrigin}/backend/fixture/echo`, { headers: { Cookie: session, 'X-Role': 'ADMIN_DIRECTIVO', 'X-User-Id': 'forged', Authorization: 'Bearer attacker' } });
  assert.equal(response.status, 200);
  assert.equal(calls.at(-1).headers['x-role'], undefined); assert.equal(calls.at(-1).headers['x-user-id'], undefined);
  assert.ok(calls.at(-1).headers.authorization.startsWith('Bearer ey'));
  response = await fetch(`${webOrigin}/backend/fixture/file`, { headers: { Cookie: session } });
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), Buffer.from([0, 1, 2, 255]));
  assert.ok(response.headers.get('cache-control').includes('no-store'));
  response = await fetch(`${webOrigin}/backend/fixture/echo`, { method: 'POST', headers: { Cookie: session, Origin: 'https://attacker.test' }, body: 'x' });
  assert.equal(response.status, 403);
  response = await fetch(`${webOrigin}/backend/fixture/echo`, { method: 'POST', headers: { Cookie: session, Origin: webOrigin }, body: '123' });
  assert.deepEqual(await response.json(), { method: 'POST', bytes: 3, subject: 'mechanic-fixture' });
  response = await fetch(`${webOrigin}/backend/fixture/echo`, { headers: { Cookie: session.slice(0, -5) + 'xxxxx' } }); assert.equal(response.status, 401);
  const expiredCookie = await new EncryptJWT({ accessToken: 'unused' }).setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuer(webOrigin).setAudience('session').setIssuedAt().setExpirationTime(Math.floor(Date.now() / 1000) - 60).encrypt(sessionKey);
  response = await fetch(`${webOrigin}/backend/fixture/echo`, { headers: { Cookie: `team-mex-session=${expiredCookie}` } }); assert.equal(response.status, 401);
  response = await fetch(`${webOrigin}/api/auth/logout`, { method: 'POST', headers: { Cookie: session, Origin: 'https://attacker.test' } }); assert.equal(response.status, 403);
  response = await fetch(`${webOrigin}/api/auth/logout`, { method: 'POST', headers: { Cookie: session, Origin: webOrigin } }); assert.equal(response.status, 204);
  assert.ok(response.headers.getSetCookie().some(value => value.includes('team-mex-session=;') && value.includes('Max-Age=0')));
  revoked = true;
  response = await fetch(`${webOrigin}/backend/fixture/echo`, { headers: { Cookie: session } }); assert.equal(response.status, 401);
  assert.ok(response.headers.getSetCookie().some(value => value.includes('Max-Age=0')));
  revoked = false;
  unavailable = true;
  response = await fetch(`${webOrigin}/api/auth/session`, { headers: { Cookie: session } }); assert.equal(response.status, 503);
  unavailable = false;
  console.log('PASS AUTH-01/02/03/04/05: PKCE, state/nonce/replay, expiry, provisioning, session, header spoofing, binary, CSRF, logout and revoked access.');
  if (process.env.AUTH_PROOF_KEEP === '1') {
    console.log(`Fixture ready for browser proof at ${webOrigin}; synthetic identity only.`);
    await new Promise(resolve => { process.once('SIGTERM', resolve); process.once('SIGINT', resolve); });
  }
}
main().then(close).catch(async error => { console.error(error.message); await close(); process.exitCode = 1; });
