import { assertIdentityConfiguration, validateActor } from './trusted-actor';
import { Rol } from './roles.enum';

describe('S1-T08 trusted identity foundation', () => {
  const actor = {
    subject: 'issuer|mechanic-1',
    displayName: 'Mechanic',
    roles: [Rol.MECANICO],
    facilityScopes: ['mex'],
    authMode: 'TRUSTED' as const,
    attributionLevel: 'SERVER_VERIFIED' as const,
  };
  it('preserves stable opaque subject and server scope', () => {
    expect(validateActor(actor, 'test')).toEqual(actor);
  });
  it.each(['DEVELOPMENT_STUB', 'UNCONFIGURED'])(
    'fails production startup with %s',
    (kind) => {
      expect(() => assertIdentityConfiguration('production', kind)).toThrow();
    },
  );
  it('requires an explicit non-production environment for the stub', () => {
    expect(() =>
      assertIdentityConfiguration(undefined, 'DEVELOPMENT_STUB'),
    ).toThrow();
    expect(() =>
      assertIdentityConfiguration('development', 'DEVELOPMENT_STUB'),
    ).not.toThrow();
  });
  it('rejects missing actor/roles/scopes, and stub attribution in production', () => {
    for (const value of [
      null,
      { ...actor, roles: [] },
      { ...actor, subject: '' },
      { ...actor, facilityScopes: [] },
    ]) {
      expect(() => validateActor(value, 'test')).toThrow();
    }
    expect(() =>
      validateActor(
        {
          ...actor,
          authMode: 'DEVELOPMENT_STUB',
          attributionLevel: 'NON_PRODUCTION',
        },
        'production',
      ),
    ).toThrow();
  });
});
