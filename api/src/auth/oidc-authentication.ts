import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { createRemoteJWKSet, jwtVerify, JWTVerifyGetKey } from 'jose';
import { ActorDirectoryPort } from './actor-directory.port';
import {
  AuthenticationPort,
  TrustedActor,
  validateActor,
} from './trusted-actor';

export function configuredOidcActors(
  config: ConfigService,
): Record<string, TrustedActor> {
  const raw: unknown = JSON.parse(config.get<string>('AUTH_OIDC_ACTORS', '{}'));
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw new Error('AUTH_OIDC_ACTORS must be a server-side subject mapping.');
  const actors = Object.create(null) as Record<string, TrustedActor>;
  for (const [subject, value] of Object.entries(raw)) {
    const entry = value as Partial<TrustedActor>;
    const actor = validateActor(
      {
        subject,
        displayName: entry?.displayName,
        roles: entry?.roles,
        facilityScopes: entry?.facilityScopes,
        authMode: 'TRUSTED',
        attributionLevel: 'SERVER_VERIFIED',
      },
      'production',
    );
    if (actor.roles.includes('SYSTEM'))
      throw new Error('Interactive OIDC actors cannot have the SYSTEM role.');
    actors[subject] = actor;
  }
  return actors;
}

export class OidcAuthentication extends AuthenticationPort {
  readonly kind = 'TRUSTED' as const;
  private readonly issuer: string;
  private readonly audience: string;
  private readonly actors: Record<string, TrustedActor>;
  private readonly keys: JWTVerifyGetKey;

  constructor(
    config: ConfigService,
    keys?: JWTVerifyGetKey,
    private readonly directory?: ActorDirectoryPort,
  ) {
    super();
    this.issuer = config.get<string>('AUTH_OIDC_ISSUER', '').trim();
    this.audience = config.get<string>('AUTH_OIDC_AUDIENCE', '').trim();
    const jwks = config.get<string>('AUTH_OIDC_JWKS_URL', '').trim();
    if (!this.audience || !this.issuer || !jwks)
      throw new Error('OIDC requires issuer, audience and JWKS URL.');
    for (const value of [this.issuer, jwks]) {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.username || url.password)
        throw new Error(
          'OIDC issuer and JWKS must use HTTPS without credentials.',
        );
    }
    const store = config.get('AUTH_ACTOR_STORE', 'CONFIG');
    if (
      !['CONFIG', 'DATABASE'].includes(store) ||
      (store === 'DATABASE' && !directory)
    )
      throw new Error('OIDC requires a valid configured actor store.');
    if (store === 'CONFIG' && directory)
      throw new Error('CONFIG cannot use a database directory.');
    this.actors =
      store === 'CONFIG'
        ? configuredOidcActors(config)
        : (Object.create(null) as Record<string, TrustedActor>);
    this.keys =
      keys ??
      createRemoteJWKSet(new URL(jwks), {
        timeoutDuration: 5000,
        cacheMaxAge: 300000,
        cooldownDuration: 30000,
      });
  }

  async authenticate(request: Request): Promise<TrustedActor | null> {
    const header = request.header('authorization');
    if (!header?.startsWith('Bearer ') || header.length > 16384) return null;
    try {
      const { payload } = await jwtVerify(header.slice(7), this.keys, {
        issuer: this.issuer,
        audience: this.audience,
        algorithms: ['RS256'],
        requiredClaims: ['sub', 'exp', 'iat'],
        clockTolerance: 5,
      });
      if (
        typeof payload.sub !== 'string' ||
        typeof payload.iat !== 'number' ||
        payload.iat > Date.now() / 1000 + 5
      )
        return null;
      const actor = this.directory
        ? await this.directory.resolve(this.issuer, payload.sub)
        : this.actors[payload.sub];
      return actor
        ? {
            ...actor,
            roles: [...actor.roles],
            facilityScopes: [...actor.facilityScopes],
          }
        : null;
    } catch {
      // Includes invalid signature/issuer/audience, expiry and JWKS outage.
      // No browser headers or unverified token claims can supply an actor.
      return null;
    }
  }
}
