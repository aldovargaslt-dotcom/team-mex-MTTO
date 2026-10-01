import { UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { Rol, ROLES_VALIDOS } from './roles.enum';

export interface TrustedActor {
  subject: string;
  displayName: string;
  roles: (Rol | 'SYSTEM')[];
  facilityScopes: string[];
  authMode: 'TRUSTED' | 'DEVELOPMENT_STUB';
  attributionLevel: 'SERVER_VERIFIED' | 'NON_PRODUCTION';
}
export abstract class AuthenticationPort {
  abstract readonly kind: 'TRUSTED' | 'DEVELOPMENT_STUB' | 'UNCONFIGURED';
  abstract authenticate(request: Request): Promise<TrustedActor | null>;
}
export function assertIdentityConfiguration(
  environment: string | undefined,
  kind: string,
) {
  if (environment === 'production' && kind !== 'TRUSTED') {
    throw new Error(
      'Production requires a configured trusted AuthenticationPort; no header/stub fallback.',
    );
  }
  if (
    kind === 'DEVELOPMENT_STUB' &&
    !['development', 'test'].includes(environment ?? '')
  ) {
    throw new Error(
      'DEVELOPMENT_STUB requires explicit NODE_ENV=development or test.',
    );
  }
}
export function validateActor(
  value: unknown,
  environment: string | undefined,
): TrustedActor {
  const actor = value as TrustedActor | null;
  const nonempty = (v: unknown): v is string =>
    typeof v === 'string' && v.trim().length > 0;
  const goodList = (v: unknown): v is string[] =>
    Array.isArray(v) && v.length > 0 && v.every(nonempty);
  const valid =
    actor &&
    nonempty(actor.subject) &&
    nonempty(actor.displayName) &&
    goodList(actor.roles) &&
    actor.roles.every((r) => r === 'SYSTEM' || ROLES_VALIDOS.includes(r)) &&
    goodList(actor.facilityScopes) &&
    ((actor.authMode === 'TRUSTED' &&
      actor.attributionLevel === 'SERVER_VERIFIED') ||
      (['development', 'test'].includes(environment ?? '') &&
        actor.authMode === 'DEVELOPMENT_STUB' &&
        actor.attributionLevel === 'NON_PRODUCTION'));
  if (!valid)
    throw new UnauthorizedException({
      code: 'TRUSTED_AUTHENTICATION_REQUIRED',
      message: 'Se requiere identidad y scope confiables.',
      details: {},
    });
  return actor;
}
