import { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AuthGuard } from '../src/auth/auth.guard';
import { OidcAuthentication } from '../src/auth/oidc-authentication';
import { RolesGuard } from '../src/auth/roles.guard';
import { Rol } from '../src/auth/roles.enum';
import { AuthenticationPort, TrustedActor } from '../src/auth/trusted-actor';
import { TrustedAuthModule } from '../src/auth/trusted-auth.module';
import { UserAdministrationModule } from '../src/auth/user-administration.module';
import { UserAccess, UserAccessAudit } from '../src/auth/user-access.entity';
import { UserAccessService } from '../src/auth/user-access.service';
import { configureApp } from '../src/configure-app';
import { createAuthMigrationDataSource } from '../src/db/auth-migration-data-source';
import { postgresConnectionOptions } from '../src/db/postgres-options';
import { Facility } from '../src/visitas/checks/facility.entity';

describe('USR-01–08 persisted user administration', () => {
  let app: INestApplication, db: DataSource, service: UserAccessService;
  let config: ConfigService;
  let keys: Awaited<ReturnType<typeof generateKeyPair>>;
  let tokens: Record<string, string>;
  let admin: UserAccess;
  const issuer = 'https://identity.users.test';
  const fields = (name = 'Mecánico de prueba') => ({
    displayName: name,
    roles: [Rol.MECANICO],
    facilityScopes: ['users-mex'],
    active: true,
  });
  const patch = (user: UserAccess, changes: Record<string, unknown>) => ({
    displayName: user.displayName,
    roles: user.roles,
    facilityScopes: user.facilityScopes,
    active: user.active,
    version: user.version,
    ...changes,
  });
  const http = (
    method: 'get' | 'post' | 'patch',
    path: string,
    subject = 'initial-admin',
  ) =>
    request(app.getHttpServer())
      [method](path)
      .set('Authorization', `Bearer ${tokens[subject]}`);
  beforeAll(async () => {
    config = new ConfigService({
      ...process.env,
      NODE_ENV: 'test',
      AUTH_MODE: 'OIDC',
      AUTH_ACTOR_STORE: 'DATABASE',
      AUTH_OIDC_ISSUER: issuer,
      AUTH_OIDC_AUDIENCE: 'api',
      AUTH_OIDC_JWKS_URL: `${issuer}/jwks`,
      AUTH_OIDC_ACTORS: JSON.stringify({
        'initial-admin': {
          displayName: 'Administrador inicial',
          roles: [Rol.ADMIN_DIRECTIVO],
          facilityScopes: ['users-mex'],
        },
      }),
    });
    const connection = postgresConnectionOptions(config);
    const migration = createAuthMigrationDataSource(connection);
    await migration.initialize();
    try {
      await migration.query('DROP SCHEMA IF EXISTS auth CASCADE');
      await migration.query('DROP TABLE IF EXISTS auth_schema_migrations');
      expect(await migration.runMigrations()).toHaveLength(1);
      expect(await migration.runMigrations()).toHaveLength(0);
      await expect(migration.undoLastMigration()).rejects.toThrow(
        'data-preservation',
      );
    } finally {
      await migration.destroy();
    }
    keys = await generateKeyPair('RS256');
    const adapter = new OidcAuthentication(
      config,
      createLocalJWKSet({
        keys: [
          {
            ...(await exportJWK(keys.publicKey)),
            kid: 'users-key',
            alg: 'RS256',
          },
        ],
      }),
      { resolve: (iss, sub) => service.resolve(iss, sub) },
    );
    tokens = {};
    for (const subject of [
      'initial-admin',
      'mechanic',
      'admin-two',
      'new-admin',
    ])
      tokens[subject] = await new SignJWT({ roles: [Rol.ADMIN_DIRECTIVO] })
        .setProtectedHeader({ alg: 'RS256', kid: 'users-key' })
        .setIssuer(issuer)
        .setAudience('api')
        .setSubject(subject)
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(keys.privateKey);
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot({
          ...connection,
          entities: [Facility, UserAccess, UserAccessAudit],
          synchronize: false,
          dropSchema: false,
        }),
        TrustedAuthModule,
        UserAdministrationModule,
      ],
      providers: [
        { provide: APP_GUARD, useClass: AuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    })
      .overrideProvider(ConfigService)
      .useValue(config)
      .overrideProvider(AuthenticationPort)
      .useValue(adapter)
      .compile();
    app = module.createNestApplication();
    db = module.get(DataSource);
    service = module.get(UserAccessService);
    // Facilities are an existing catalogue, not created by Auth. Ensure only the fixture row.
    await db.query(
      'CREATE TABLE IF NOT EXISTS public.facilities (id varchar PRIMARY KEY, name varchar NOT NULL, timezone varchar NOT NULL, version integer NOT NULL)',
    );
    await db.getRepository(Facility).save({
      id: 'users-mex',
      name: 'Patio de prueba',
      timezone: 'America/Mexico_City',
      version: 1,
    });
    configureApp(app);
    await app.init();
    admin = (await db
      .getRepository(UserAccess)
      .findOneBy({ subject: 'initial-admin' }))!;
  }, 60000);
  afterAll(async () => {
    await app?.close();
  });
  it('boots exactly one configured administrator, records audit and never reimports on restart', async () => {
    expect(admin.roles).toEqual([Rol.ADMIN_DIRECTIVO]);
    expect(await db.getRepository(UserAccessAudit).count()).toBe(1);
    const saved = config.get('AUTH_OIDC_ACTORS');
    config.set('AUTH_OIDC_ACTORS', '{}');
    await service.onModuleInit();
    config.set('AUTH_OIDC_ACTORS', saved);
    expect(await db.getRepository(UserAccess).count()).toBe(1);
    expect(await db.getRepository(UserAccessAudit).count()).toBe(1);
    expect(
      await service.resolve('https://wrong-issuer.test', admin.subject),
    ).toBeNull();
  });
  it('requires real credentials and administrator; token claims and browser headers cannot grant access', async () => {
    await request(app.getHttpServer())
      .get('/admin/users')
      .set('X-Role', 'ADMIN_DIRECTIVO')
      .expect(401);
    await http('get', '/admin/users', 'mechanic').expect(401);
    const created = await http('post', '/admin/users')
      .send({ subject: 'mechanic', ...fields() })
      .expect(201);
    expect(created.body.id).toBeTruthy();
    await http('get', '/admin/users', 'mechanic')
      .set('X-Role', 'ADMIN_DIRECTIVO')
      .expect(403);
    const me = await http('get', '/auth/me', 'mechanic').expect(200);
    expect(me.body.roles).toEqual([Rol.MECANICO]);
    const list = await http('get', '/admin/users').expect(200);
    expect(list.headers['cache-control']).toContain('no-store');
    expect(list.body).toHaveLength(2);
  });
  it('rejects duplicates, SYSTEM, unknown patios, empty roles and unknown body fields', async () => {
    await http('post', '/admin/users')
      .send({ subject: 'mechanic', ...fields() })
      .expect(409);
    for (const changes of [
      { roles: ['SYSTEM'] },
      { facilityScopes: ['invented'] },
      { roles: [] },
      { facilityScopes: [] },
      { issuer: 'attacker' },
      { active: 'false' },
      { active: null },
    ])
      await http('post', '/admin/users')
        .send({ subject: 'invalid', ...fields(), ...changes })
        .expect(400);
    expect(await db.getRepository(UserAccess).count()).toBe(2);
  });
  it('updates current roles and scopes, rejects stale version and preserves before/after audit', async () => {
    const user = (await db
      .getRepository(UserAccess)
      .findOneBy({ subject: 'mechanic' }))!;
    const change = patch(user, {
      displayName: 'Supervisor de prueba',
      roles: [Rol.SUPERVISOR],
    });
    const result = await http('patch', `/admin/users/${user.id}`)
      .send(change)
      .expect(200);
    expect(result.body.version).toBe(user.version + 1);
    await http('patch', `/admin/users/${user.id}`)
      .send({
        displayName: user.displayName,
        roles: user.roles,
        facilityScopes: user.facilityScopes,
        version: result.body.version,
      })
      .expect(400);
    const me = await http('get', '/auth/me', 'mechanic').expect(200);
    expect(me.body.roles).toEqual([Rol.SUPERVISOR]);
    await http('patch', `/admin/users/${user.id}`).send(change).expect(409);
    await http('patch', `/admin/users/${user.id}`)
      .send({ ...change, version: 2, subject: 'forged' })
      .expect(400);
    const audit = await http('get', `/admin/users/${user.id}/audit`).expect(
      200,
    );
    expect(audit.body).toHaveLength(2);
    const update = audit.body.find(
      (event: { action: string }) => event.action === 'UPDATE',
    );
    expect(update.before.roles).toEqual([Rol.MECANICO]);
    expect(update.after.roles).toEqual([Rol.SUPERVISOR]);
    expect(update.actorSubject).toBe('initial-admin');
    await http('get', `/admin/users/${user.id}/audit`, 'mechanic').expect(403);
  });
  it('deactivates and reactivates a user; the same signed token immediately loses/regains access', async () => {
    let user = (await db
      .getRepository(UserAccess)
      .findOneBy({ subject: 'mechanic' }))!;
    await http('patch', `/admin/users/${user.id}`)
      .send(patch(user, { active: false }))
      .expect(200);
    await http('get', '/auth/me', 'mechanic').expect(401);
    await service.onModuleInit();
    await http('get', '/auth/me', 'mechanic').expect(401);
    user = (await db.getRepository(UserAccess).findOneBy({ id: user.id }))!;
    await http('patch', `/admin/users/${user.id}`)
      .send(patch(user, { active: true }))
      .expect(200);
    await http('get', '/auth/me', 'mechanic').expect(200);
  });
  it('blocks disabling or demoting the last active administrator without writing audit', async () => {
    const count = await db.getRepository(UserAccessAudit).count();
    for (const changes of [{ active: false }, { roles: [Rol.MECANICO] }]) {
      const result = await http('patch', `/admin/users/${admin.id}`)
        .send(patch(admin, changes))
        .expect(409);
      expect(result.body.code).toBe('LAST_ACTIVE_ADMIN');
    }
    expect(await db.getRepository(UserAccessAudit).count()).toBe(count);
  });
  it('serializes competing administrator deactivations and revalidates the executor under lock', async () => {
    const result = await http('post', '/admin/users')
      .send({
        subject: 'admin-two',
        ...fields('Segundo administrador'),
        roles: [Rol.ADMIN_DIRECTIVO],
      })
      .expect(201);
    const second = result.body as UserAccess;
    const responses = await Promise.all([
      http('patch', `/admin/users/${second.id}`).send(
        patch(second, { active: false }),
      ),
      http('patch', `/admin/users/${admin.id}`, 'admin-two').send(
        patch(admin, { active: false }),
      ),
    ]);
    expect(
      responses.filter((response) => response.status === 200),
    ).toHaveLength(1);
    expect(
      responses.filter((response) => [401, 403, 409].includes(response.status)),
    ).toHaveLength(1);
    const activeAdmins = (
      await db.getRepository(UserAccess).findBy({ active: true })
    ).filter((u) => u.roles.includes(Rol.ADMIN_DIRECTIVO));
    expect(activeAdmins).toHaveLength(1);
    const disabled = (
      await db.getRepository(UserAccess).findBy({ active: false })
    )[0];
    const fakeActor: TrustedActor = {
      subject: disabled.subject,
      displayName: disabled.displayName,
      roles: [Rol.ADMIN_DIRECTIVO],
      facilityScopes: disabled.facilityScopes,
      authMode: 'TRUSTED',
      attributionLevel: 'SERVER_VERIFIED',
    };
    await expect(
      service.create({ subject: 'new-admin', ...fields() }, fakeActor),
    ).rejects.toThrow('No tienes permiso');
    await http('get', '/admin/users', disabled.subject).expect(401);
  });
  it('fails closed on DB outage without restoring configuration permissions', async () => {
    const store = config.get('AUTH_ACTOR_STORE');
    config.set('AUTH_ACTOR_STORE', 'CONFIG');
    const adapter = new OidcAuthentication(
      new ConfigService({
        AUTH_ACTOR_STORE: 'DATABASE',
        AUTH_OIDC_ISSUER: issuer,
        AUTH_OIDC_AUDIENCE: 'api',
        AUTH_OIDC_JWKS_URL: `${issuer}/jwks`,
        AUTH_OIDC_ACTORS: config.get('AUTH_OIDC_ACTORS'),
      }),
      createLocalJWKSet({
        keys: [
          {
            ...(await exportJWK(keys.publicKey)),
            kid: 'users-key',
            alg: 'RS256',
          },
        ],
      }),
      {
        resolve: async () => {
          throw new Error('database unavailable');
        },
      },
    );
    expect(
      await adapter.authenticate({
        header: () => `Bearer ${tokens['initial-admin']}`,
      } as never),
    ).toBeNull();
    await expect(service.list()).rejects.toThrow('requiere habilitar');
    config.set('AUTH_ACTOR_STORE', store);
  });
  it('rejects bootstrap without administrator or with unknown patio, rolling back every imported user', async () => {
    const isolatedIssuer = 'https://bootstrap.invalid.test';
    const values = {
      AUTH_MODE: 'OIDC',
      AUTH_ACTOR_STORE: 'DATABASE',
      AUTH_OIDC_ISSUER: isolatedIssuer,
    };
    const directory = {
      list: async () => [{ id: 'users-mex', name: 'Patio de prueba' }],
    };
    for (const entries of [
      { ordinary: fields() },
      {
        administrator: { ...fields(), roles: [Rol.ADMIN_DIRECTIVO] },
        invalid: { ...fields(), facilityScopes: ['unknown'] },
      },
    ]) {
      const candidate = new UserAccessService(
        db,
        new ConfigService({
          ...values,
          AUTH_OIDC_ACTORS: JSON.stringify(entries),
        }),
        directory,
      );
      await expect(candidate.onModuleInit()).rejects.toThrow();
      expect(
        await db.getRepository(UserAccess).countBy({ issuer: isolatedIssuer }),
      ).toBe(0);
      expect(
        await db
          .getRepository(UserAccessAudit)
          .countBy({ issuer: isolatedIssuer }),
      ).toBe(0);
    }
  });
  it('serializes simultaneous bootstraps into a single import and audit', async () => {
    const isolatedIssuer = 'https://bootstrap.concurrent.test';
    const candidate = new UserAccessService(
      db,
      new ConfigService({
        AUTH_MODE: 'OIDC',
        AUTH_ACTOR_STORE: 'DATABASE',
        AUTH_OIDC_ISSUER: isolatedIssuer,
        AUTH_OIDC_ACTORS: JSON.stringify({
          administrator: { ...fields(), roles: [Rol.ADMIN_DIRECTIVO] },
        }),
      }),
      { list: async () => [{ id: 'users-mex', name: 'Patio de prueba' }] },
    );
    await Promise.all([candidate.onModuleInit(), candidate.onModuleInit()]);
    expect(
      await db.getRepository(UserAccess).countBy({ issuer: isolatedIssuer }),
    ).toBe(1);
    expect(
      await db
        .getRepository(UserAccessAudit)
        .countBy({ issuer: isolatedIssuer }),
    ).toBe(1);
  });
});
