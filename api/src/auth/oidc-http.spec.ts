import { Controller, Get, INestApplication, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import request from 'supertest';
import { AuthGuard } from './auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { Rol } from './roles.enum';
import { AuthenticationPort } from './trusted-actor';
import { OidcAuthentication } from './oidc-authentication';
import { IdentityController } from './identity.controller';

@Controller('protected')
class ProtectedController {
  @Get('mechanic')
  @Roles(Rol.MECANICO)
  mechanic(@Req() req: { user: unknown }) {
    return req.user;
  }
  @Get('admin')
  @Roles(Rol.ADMIN_DIRECTIVO)
  admin() {
    return {};
  }
}

describe('AUTH-02/07 real HTTP guard boundary', () => {
  let app: INestApplication;
  let token: string;
  beforeAll(async () => {
    const keys = await generateKeyPair('RS256');
    const config = new ConfigService({
      AUTH_MODE: 'OIDC',
      AUTH_OIDC_ISSUER: 'https://identity.test',
      AUTH_OIDC_AUDIENCE: 'api',
      AUTH_OIDC_JWKS_URL: 'https://identity.test/jwks',
      AUTH_OIDC_ACTORS: JSON.stringify({
        mechanic: {
          displayName: 'Mecánico',
          roles: [Rol.MECANICO],
          facilityScopes: ['mex'],
        },
      }),
    });
    const adapter = new OidcAuthentication(
      config,
      createLocalJWKSet({
        keys: [
          { ...(await exportJWK(keys.publicKey)), kid: 'test', alg: 'RS256' },
        ],
      }),
    );
    token = await new SignJWT({})
      .setProtectedHeader({ alg: 'RS256', kid: 'test' })
      .setSubject('mechanic')
      .setIssuer('https://identity.test')
      .setAudience('api')
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(keys.privateKey);
    const module = await Test.createTestingModule({
      controllers: [IdentityController, ProtectedController],
      providers: [
        { provide: ConfigService, useValue: config },
        { provide: AuthenticationPort, useValue: adapter },
        { provide: APP_GUARD, useClass: AuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
  });
  it('returns verified actor with no-store and rejects browser-only identity', async () => {
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('X-Role', 'MECANICO')
      .set('X-User-Id', 'forged')
      .expect(401);
    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(response.body.subject).toBe('mechanic');
    expect(response.body.attributionLevel).toBe('SERVER_VERIFIED');
    expect(response.headers['cache-control']).toContain('no-store');
  });
  it('protects legacy endpoints in OIDC mode, respects assigned roles and never trusts spoofed headers', async () => {
    await request(app.getHttpServer())
      .get('/protected/mechanic')
      .set('X-Role', 'MECANICO')
      .expect(401);
    const response = await request(app.getHttpServer())
      .get('/protected/mechanic')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Role', 'ADMIN_DIRECTIVO')
      .set('X-User-Id', 'forged')
      .expect(200);
    expect(response.body).toEqual({ rol: 'MECANICO', userId: 'mechanic' });
    await request(app.getHttpServer())
      .get('/protected/admin')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Role', 'ADMIN_DIRECTIVO')
      .expect(403);
  });
});
