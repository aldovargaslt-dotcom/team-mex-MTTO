import { randomBytes, createHash } from 'node:crypto';
import { EncryptJWT, jwtDecrypt, jwtVerify, createRemoteJWKSet } from 'jose';
import type { Role } from '../types';

export const SESSION_COOKIE = 'team-mex-session';
export const FLOW_COOKIE = 'team-mex-login';
export const cookieOptions = {
  httpOnly: true, secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const, path: '/',
};
export const noStore = { 'Cache-Control': 'private, no-store' };
export const legacyDevelopment = () => process.env.NODE_ENV === 'development' && process.env.WEB_AUTH_MODE !== 'OIDC';

export function authConfig() {
  const required = (name: string) => {
    const value = process.env[name]?.trim();
    if (!value) throw new Error(`Missing ${name}`);
    return value;
  };
  const secureUrl = (name: string, allowLocal = false) => {
    const url = new URL(required(name));
    const local = process.env.NODE_ENV !== 'production' && allowLocal &&
      ['localhost', '127.0.0.1'].includes(url.hostname) && url.protocol === 'http:';
    if ((!local && url.protocol !== 'https:') || url.username || url.password || url.hash || url.search)
      throw new Error(`Invalid ${name}`);
    return url;
  };
  const origin = secureUrl('AUTH_APP_ORIGIN', true);
  if (origin.pathname !== '/' || origin.search) throw new Error('AUTH_APP_ORIGIN must be an origin');
  const key = Buffer.from(required('AUTH_SESSION_SECRET'), 'base64');
  if (key.length !== 32) throw new Error('AUTH_SESSION_SECRET must be 32 random bytes in base64');
  secureUrl('AUTH_OIDC_ISSUER');
  return {
    origin: origin.origin, issuer: required('AUTH_OIDC_ISSUER'),
    clientId: required('AUTH_OIDC_CLIENT_ID'), clientSecret: required('AUTH_OIDC_CLIENT_SECRET'),
    scope: process.env.AUTH_OIDC_SCOPE?.trim() || 'openid profile', key,
    audience: process.env.AUTH_OIDC_AUDIENCE?.trim() || undefined,
    apiUrl: secureUrl('API_URL', true).href.replace(/\/$/, ''),
  };
}

type Metadata = { issuer: string; authorization_endpoint: string; token_endpoint: string; jwks_uri: string };
let discovery: { issuer: string; until: number; value: Metadata } | undefined;
export async function metadata() {
  const config = authConfig();
  if (discovery?.issuer === config.issuer && discovery.until > Date.now()) return discovery.value;
  const response = await fetch(`${config.issuer.replace(/\/$/, '')}/.well-known/openid-configuration`, {
    cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error('OIDC discovery unavailable');
  const value = await response.json() as Metadata;
  if (value.issuer !== config.issuer) throw new Error('OIDC issuer mismatch');
  for (const endpoint of [value.authorization_endpoint, value.token_endpoint, value.jwks_uri]) {
    const url = new URL(endpoint);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Invalid OIDC endpoint');
  }
  discovery = { issuer: config.issuer, until: Date.now() + 300000, value };
  return value;
}
export const random = () => randomBytes(32).toString('base64url');
export const challenge = (verifier: string) => createHash('sha256').update(verifier).digest('base64url');
export async function seal(value: Record<string, unknown>, seconds: number, audience: string) {
  return new EncryptJWT(value).setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuer(authConfig().origin).setAudience(audience).setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + seconds).encrypt(authConfig().key);
}
export async function open(value: string | undefined, audience: string) {
  if (!value || value.length > 4000) return null;
  try {
    const { payload } = await jwtDecrypt(value, authConfig().key, {
      issuer: authConfig().origin, audience, keyManagementAlgorithms: ['dir'],
      contentEncryptionAlgorithms: ['A256GCM'], requiredClaims: ['exp', 'iat'],
    });
    return payload;
  } catch { return null; }
}
export async function sessionToken(cookie: string | undefined) {
  const session = await open(cookie, 'session');
  return typeof session?.accessToken === 'string' ? session.accessToken : null;
}
export type Identity = { subject: string; displayName: string; roles: Role[]; facilityScopes: string[]; authMode: string; attributionLevel: string };
export async function identity(token: string): Promise<Identity | null> {
  const response = await fetch(`${authConfig().apiUrl}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
    redirect: 'error', signal: AbortSignal.timeout(5000),
  });
  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) throw new Error('Identity API unavailable');
  const actor = await response.json() as Identity;
  const roles: Role[] = ['MECANICO', 'SUPERVISOR', 'ADMIN_DIRECTIVO', 'LOGISTICA'];
  if (!actor.subject || !actor.displayName || !Array.isArray(actor.roles) || !actor.roles.length ||
      !actor.roles.every(role => roles.includes(role)) || !Array.isArray(actor.facilityScopes) ||
      !actor.facilityScopes.length || actor.authMode !== 'TRUSTED' || actor.attributionLevel !== 'SERVER_VERIFIED')
    throw new Error('Invalid server identity');
  return actor;
}
export function sameOrigin(request: Request) {
  return request.headers.get('origin') === authConfig().origin;
}
export async function verifyIdToken(token: string, nonce: string, accessToken: string) {
  const config = authConfig();
  const info = await metadata();
  const { payload } = await jwtVerify(token, createRemoteJWKSet(new URL(info.jwks_uri)), {
    issuer: config.issuer, audience: config.clientId, algorithms: ['RS256'],
    requiredClaims: ['sub', 'exp', 'iat'], clockTolerance: 5,
  });
  if (payload.nonce !== nonce || typeof payload.sub !== 'string' ||
      typeof payload.iat !== 'number' || payload.iat > Date.now() / 1000 + 5 ||
      (Array.isArray(payload.aud) && payload.aud.length > 1 && payload.azp !== config.clientId) ||
      (payload.azp !== undefined && payload.azp !== config.clientId)) throw new Error('Invalid login identity');
  if (payload.at_hash !== undefined && payload.at_hash !==
      createHash('sha256').update(accessToken, 'ascii').digest().subarray(0, 16).toString('base64url'))
    throw new Error('Access token hash mismatch');
  return payload;
}
