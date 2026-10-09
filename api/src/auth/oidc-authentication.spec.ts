import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { OidcAuthentication } from './oidc-authentication';

const configValues = () => ({
  AUTH_MODE: 'OIDC',
  AUTH_OIDC_ISSUER: 'https://identity.example.test',
  AUTH_OIDC_AUDIENCE: 'team-mex-api',
  AUTH_OIDC_JWKS_URL: 'https://identity.example.test/jwks',
  AUTH_OIDC_ACTORS: JSON.stringify({
    'mechanic-1': {
      displayName: 'Mecánico de prueba',
      roles: ['MECANICO'],
      facilityScopes: ['mex'],
    },
  }),
});
const oidcTestConfig = () => new ConfigService(configValues());
const request = (token?: string) =>
  ({
    header: (name: string) =>
      name === 'authorization'
        ? token
          ? `Bearer ${token}`
          : undefined
        : 'ADMIN_DIRECTIVO',
  }) as Request;

describe('AUTH-02 OIDC authentication', () => {
  let keys: Awaited<ReturnType<typeof generateKeyPair>>;
  let adapter: OidcAuthentication;
  beforeAll(async () => {
    keys = await generateKeyPair('RS256');
    const jwk = {
      ...(await exportJWK(keys.publicKey)),
      kid: 'key-1',
      alg: 'RS256',
      use: 'sig',
    };
    adapter = new OidcAuthentication(
      oidcTestConfig(),
      createLocalJWKSet({ keys: [jwk] }),
    );
  });
  const token = (
    changes: Record<string, unknown> = {},
    secret?: Parameters<SignJWT['sign']>[0],
  ) =>
    new SignJWT({
      sub: 'mechanic-1',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60,
      iss: 'https://identity.example.test',
      aud: 'team-mex-api',
      roles: ['ADMIN_DIRECTIVO'],
      facilityScopes: ['*'],
      ...changes,
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'key-1' })
      .sign(secret ?? keys.privateKey);
  it('maps verified stable subject to server-owned name, roles and scopes, ignoring claims and headers', async () => {
    const actor = await adapter.authenticate(request(await token()));
    expect(actor).toEqual({
      subject: 'mechanic-1',
      displayName: 'Mecánico de prueba',
      roles: ['MECANICO'],
      facilityScopes: ['mex'],
      authMode: 'TRUSTED',
      attributionLevel: 'SERVER_VERIFIED',
    });
    actor!.roles.push('ADMIN_DIRECTIVO' as never);
    expect((await adapter.authenticate(request(await token())))!.roles).toEqual(
      ['MECANICO'],
    );
  });
  it.each([
    { iss: 'https://attacker.test' },
    { aud: 'web-client' },
    { sub: 'unknown' },
    { exp: Math.floor(Date.now() / 1000) - 60 },
    { exp: undefined },
    { iat: Math.floor(Date.now() / 1000) + 600 },
    { iat: undefined },
    { nbf: Math.floor(Date.now() / 1000) + 600 },
  ])('rejects invalid claims or unprovisioned subject: %j', async (changes) => {
    expect(
      await adapter.authenticate(request(await token(changes))),
    ).toBeNull();
  });
  it('rejects a forged signature and unsupported symmetric algorithm', async () => {
    const forged = await generateKeyPair('RS256');
    expect(
      await adapter.authenticate(request(await token({}, forged.privateKey))),
    ).toBeNull();
    const symmetric = await new SignJWT({ sub: 'mechanic-1' })
      .setProtectedHeader({ alg: 'HS256' })
      .sign(new Uint8Array(32));
    expect(await adapter.authenticate(request(symmetric))).toBeNull();
  });
  it('rejects absent/malformed credentials without header fallback', async () => {
    expect(await adapter.authenticate(request())).toBeNull();
    expect(await adapter.authenticate(request('not-a-jwt'))).toBeNull();
  });
  it('fails closed on key service outage', async () => {
    const unavailable = new OidcAuthentication(oidcTestConfig(), async () => {
      throw new Error('JWKS unavailable');
    });
    expect(await unavailable.authenticate(request(await token()))).toBeNull();
  });
  it('rejects missing configuration, unsafe endpoints, empty scopes and interactive SYSTEM actors', () => {
    for (const config of [
      {},
      {
        AUTH_OIDC_ISSUER: 'http://identity.example.test',
        AUTH_OIDC_AUDIENCE: 'api',
        AUTH_OIDC_JWKS_URL: 'https://identity.example.test/jwks',
      },
      {
        ...configValues(),
        AUTH_OIDC_ACTORS: JSON.stringify({
          x: { displayName: 'X', roles: ['MECANICO'], facilityScopes: [] },
        }),
      },
      {
        ...configValues(),
        AUTH_OIDC_ACTORS: JSON.stringify({
          x: { displayName: 'X', roles: ['SYSTEM'], facilityScopes: ['mex'] },
        }),
      },
    ])
      expect(() => new OidcAuthentication(new ConfigService(config))).toThrow();
  });
});
