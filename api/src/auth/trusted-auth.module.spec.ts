import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Request } from 'express';
import { AuthenticationPort } from './trusted-actor';
import { TrustedAuthModule } from './trusted-auth.module';

describe('S1-T08 actual authentication adapter boundary', () => {
  const prior = {
    node: process.env.NODE_ENV,
    mode: process.env.AUTH_MODE,
    actors: process.env.AUTH_STUB_ACTORS,
  };
  afterEach(() => {
    for (const [key, value] of Object.entries({
      NODE_ENV: prior.node,
      AUTH_MODE: prior.mode,
      AUTH_STUB_ACTORS: prior.actors,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  async function module() {
    return Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        TrustedAuthModule,
      ],
    }).compile();
  }
  it.each(['DEVELOPMENT_STUB', 'NOT_CONFIGURED'])(
    'production fails closed with %s',
    async (mode) => {
      process.env.NODE_ENV = 'production';
      process.env.AUTH_MODE = mode;
      let context: Awaited<ReturnType<typeof module>> | undefined;
      await expect(
        (async () => {
          context = await module();
          await context.init();
        })(),
      ).rejects.toThrow(/Production requires/);
      if (context)
        await context
          .close()
          .catch((error: Error) =>
            expect(error.message).toMatch(/Production requires/),
          );
    },
  );
  it('development credential maps to server actor, ignores spoofed headers and has no invalid-token fallback', async () => {
    process.env.NODE_ENV = 'test';
    process.env.AUTH_MODE = 'DEVELOPMENT_STUB';
    process.env.AUTH_STUB_ACTORS = JSON.stringify({
      'test-credential': {
        subject: 'server|mechanic',
        displayName: 'Server Name',
        roles: ['MECANICO'],
        facilityScopes: ['mex'],
      },
    });
    const context = await module();
    await context.init();
    try {
      const port = context.get(AuthenticationPort);
      const req = (token: string) =>
        ({
          header: (key: string) =>
            (
              ({
                authorization: `Bearer ${token}`,
                'x-role': 'ADMIN_DIRECTIVO',
                'x-user-id': 'forged',
                'x-facility': 'any',
              }) as Record<string, string>
            )[key],
        }) as Request;
      expect(await port.authenticate(req('test-credential'))).toEqual({
        subject: 'server|mechanic',
        displayName: 'Server Name',
        roles: ['MECANICO'],
        facilityScopes: ['mex'],
        authMode: 'DEVELOPMENT_STUB',
        attributionLevel: 'NON_PRODUCTION',
      });
      expect(await port.authenticate(req('invalid'))).toBeNull();
    } finally {
      await context.close();
    }
  });
});
