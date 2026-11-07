import { INestApplication, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AuthGuard } from '../src/auth/auth.guard';
import { OidcAuthentication } from '../src/auth/oidc-authentication';
import { PermissionsShadowGuard } from '../src/auth/permissions-shadow.guard';
import { RolesGuard } from '../src/auth/roles.guard';
import { Rol } from '../src/auth/roles.enum';
import { AuthenticationPort } from '../src/auth/trusted-actor';
import { TrustedAuthModule } from '../src/auth/trusted-auth.module';
import { UserAdministrationModule } from '../src/auth/user-administration.module';
import { UserAccess, UserAccessAudit } from '../src/auth/user-access.entity';
import { UserAccessService } from '../src/auth/user-access.service';
import {
  RolePermission,
  RolePermissionAudit,
  RolePermissionVersion,
} from '../src/auth/role-permission.entity';
import { PermissionMatrixService } from '../src/auth/permission-matrix.service';
import { PERMISOS_POR_ROL } from '../src/auth/permissions';
import { configureApp } from '../src/configure-app';
import { createAuthMigrationDataSource } from '../src/db/auth-migration-data-source';
import { createPermissionMigrationDataSource } from '../src/db/permission-migration-data-source';
import { postgresConnectionOptions } from '../src/db/postgres-options';
import { Facility } from '../src/visitas/checks/facility.entity';

describe('EWO-069 guard de permisos en modo sombra (S-01…S-06)', () => {
  let app: INestApplication, db: DataSource;
  let config: ConfigService;
  let matrix: PermissionMatrixService;
  let keys: Awaited<ReturnType<typeof generateKeyPair>>;
  let tokens: Record<string, string>;
  let warn: jest.SpyInstance;
  const issuer = 'https://identity.shadow.test';
  const call = async (
    method: 'get' | 'put' | 'post',
    path: string,
    subject?: string,
    extra: { role?: string; body?: object } = {},
  ) => {
    let req = request(app.getHttpServer())[method](path);
    if (subject) req = req.set('Authorization', `Bearer ${tokens[subject]}`);
    if (extra.role) req = req.set('X-Role', extra.role);
    if (extra.body) req = req.send(extra.body);
    const res = await req;
    return { status: res.status, body: res.body as unknown };
  };
  const shadowLines = () =>
    warn.mock.calls
      .map((c) => String(c[0]))
      .filter((l) => l.includes('permissions-shadow'));

  beforeAll(async () => {
    config = new ConfigService({
      ...process.env,
      NODE_ENV: 'test',
      AUTH_MODE: 'OIDC',
      AUTH_ACTOR_STORE: 'DATABASE',
      PERMISSIONS_SHADOW: 'off',
      AUTH_OIDC_ISSUER: issuer,
      AUTH_OIDC_AUDIENCE: 'api',
      AUTH_OIDC_JWKS_URL: `${issuer}/jwks`,
      AUTH_OIDC_ACTORS: JSON.stringify({
        'initial-admin': {
          displayName: 'Administrador inicial',
          roles: [Rol.ADMIN_DIRECTIVO],
          facilityScopes: ['shadow-mex'],
        },
      }),
    });
    const connection = postgresConnectionOptions(config);
    const auth = createAuthMigrationDataSource(connection);
    await auth.initialize();
    try {
      await auth.query('DROP SCHEMA IF EXISTS auth CASCADE');
      await auth.query('DROP TABLE IF EXISTS auth_schema_migrations');
      await auth.query(
        'DROP TABLE IF EXISTS auth_permission_schema_migrations',
      );
      await auth.runMigrations();
    } finally {
      await auth.destroy();
    }
    const perm = createPermissionMigrationDataSource(connection);
    await perm.initialize();
    try {
      await perm.runMigrations();
    } finally {
      await perm.destroy();
    }
    keys = await generateKeyPair('RS256');
    let users: UserAccessService;
    const adapter = new OidcAuthentication(
      config,
      createLocalJWKSet({
        keys: [
          {
            ...(await exportJWK(keys.publicKey)),
            kid: 'shadow-key',
            alg: 'RS256',
          },
        ],
      }),
      { resolve: (iss, sub) => users.resolve(iss, sub) },
    );
    tokens = {};
    for (const subject of [
      'initial-admin',
      'supervisor',
      'hybrid-admin',
      'hybrid-supervisor',
    ])
      tokens[subject] = await new SignJWT({ roles: [Rol.ADMIN_DIRECTIVO] })
        .setProtectedHeader({ alg: 'RS256', kid: 'shadow-key' })
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
          entities: [
            Facility,
            UserAccess,
            UserAccessAudit,
            RolePermissionVersion,
            RolePermission,
            RolePermissionAudit,
          ],
          synchronize: false,
          dropSchema: false,
        }),
        TrustedAuthModule,
        UserAdministrationModule,
      ],
      providers: [
        { provide: APP_GUARD, useClass: AuthGuard },
        { provide: APP_GUARD, useClass: PermissionsShadowGuard },
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
    users = module.get(UserAccessService);
    matrix = module.get(PermissionMatrixService);
    await db.query(
      'CREATE TABLE IF NOT EXISTS public.facilities (id varchar PRIMARY KEY, name varchar NOT NULL, timezone varchar NOT NULL, version integer NOT NULL)',
    );
    await db.getRepository(Facility).save({
      id: 'shadow-mex',
      name: 'Patio de prueba',
      timezone: 'America/Mexico_City',
      version: 1,
    });
    configureApp(app);
    await app.init();
    const mk = (subject: string, roles: Rol[]) =>
      request(app.getHttpServer())
        .post('/admin/users')
        .set('Authorization', `Bearer ${tokens['initial-admin']}`)
        .send({
          subject,
          displayName: subject,
          roles,
          facilityScopes: ['shadow-mex'],
          active: true,
        })
        .expect(201);
    await mk('supervisor', [Rol.SUPERVISOR]);
    await mk('hybrid-admin', [Rol.MECANICO, Rol.ADMIN_DIRECTIVO]);
    await mk('hybrid-supervisor', [Rol.MECANICO, Rol.SUPERVISOR]);
  }, 90000);
  beforeEach(() => {
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => {
    await app?.close();
  });

  const scenarios: [
    string,
    'get' | 'put',
    string,
    string | undefined,
    object?,
  ][] = [
    ['admin lee matriz', 'get', '/admin/permissions', 'initial-admin'],
    ['admin lista usuarios', 'get', '/admin/users', 'initial-admin'],
    ['supervisor lee matriz (403)', 'get', '/admin/permissions', 'supervisor'],
    ['supervisor lista usuarios (403)', 'get', '/admin/users', 'supervisor'],
    ['sin credenciales (401)', 'get', '/admin/users', undefined],
    [
      'PUT inválido (400)',
      'put',
      '/admin/permissions/roles/MECANICO',
      'initial-admin',
      { permissions: ['inventado.todo'], expectedVersion: 1, motivo: 'x' },
    ],
  ];

  it('S-01/S-02 · las respuestas con off y con log son idénticas y la matriz sembrada no genera discrepancias', async () => {
    config.set('PERMISSIONS_SHADOW', 'off');
    const readSpy = jest.spyOn(matrix, 'read');
    const off = [];
    for (const [, m, p, s, body] of scenarios)
      off.push(await call(m, p, s, { body }));
    // S-01: con off solo el controlador (GET /admin/permissions) lee la matriz; el guard no agrega lecturas.
    const readsOff = readSpy.mock.calls.length;
    expect(readsOff).toBe(1);
    expect(shadowLines()).toHaveLength(0);

    config.set('PERMISSIONS_SHADOW', 'log');
    const on = [];
    for (const [, m, p, s, body] of scenarios)
      on.push(await call(m, p, s, { body }));
    expect(on).toEqual(off);
    // Con log, el guard agrega una lectura por petición autenticada con @Roles mapeado (5 de 6 escenarios; el 401 no llega).
    expect(readSpy.mock.calls.length - readsOff).toBeGreaterThanOrEqual(5);
    expect(shadowLines()).toHaveLength(0); // S-02
  });

  it('S-05 · actores con varios roles y X-Role: sin discrepancias y mismo resultado real', async () => {
    config.set('PERMISSIONS_SHADOW', 'log');
    // MECANICO+ADMIN: el endpoint de admin se permite por el rol ADMIN, con o sin X-Role.
    expect((await call('get', '/admin/users', 'hybrid-admin')).status).toBe(
      200,
    );
    expect(
      (await call('get', '/admin/users', 'hybrid-admin', { role: 'MECANICO' }))
        .status,
    ).toBe(200);
    expect(
      (
        await call('get', '/admin/users', 'hybrid-admin', {
          role: 'ADMIN_DIRECTIVO',
        })
      ).status,
    ).toBe(200);
    // MECANICO+SUPERVISOR: ninguno es ADMIN ⇒ 403 en ambos modelos.
    expect(
      (await call('get', '/admin/users', 'hybrid-supervisor')).status,
    ).toBe(403);
    expect(
      (
        await call('get', '/admin/users', 'hybrid-supervisor', {
          role: 'SUPERVISOR',
        })
      ).status,
    ).toBe(403);
    expect(shadowLines()).toHaveLength(0);
  });

  it('S-03/S-06 · matriz editada que difiere ⇒ DECISION_DIFFERS deduplicado, sin PII, y el acceso real no cambia', async () => {
    config.set('PERMISSIONS_SHADOW', 'log');
    const current = (
      (await call('get', '/admin/permissions', 'initial-admin')).body as {
        roles: Record<string, { version: number; permissions: string[] }>;
      }
    ).roles.SUPERVISOR;
    const edit = await call(
      'put',
      '/admin/permissions/roles/SUPERVISOR',
      'initial-admin',
      {
        body: {
          permissions: [...current.permissions, 'usuarios.administrar'],
          expectedVersion: current.version,
          motivo: 'Prueba sombra',
        },
      },
    );
    expect(edit.status).toBe(200);
    warn.mockClear();
    for (let i = 0; i < 3; i++) {
      // Real: sigue siendo 403 aunque la matriz ya le concede el permiso.
      expect((await call('get', '/admin/users', 'supervisor')).status).toBe(
        403,
      );
    }
    const lines = shadowLines();
    expect(lines.length).toBeGreaterThanOrEqual(1);
    const parsed = JSON.parse(lines[0]) as Record<string, unknown>;
    expect(parsed).toMatchObject({
      event: 'permissions-shadow',
      kind: 'DECISION_DIFFERS',
      endpoint: 'UsersController.list',
      roles: ['SUPERVISOR'],
    });
    expect(String(parsed.detail)).toContain('role=deny permission=allow');
    expect(String(parsed.detail)).toContain('matrixDiffersFromSeed=true');
    // Deduplicación: 3 repeticiones ⇒ emisiones en 1 y 2 (potencias de dos), no 3.
    expect(lines).toHaveLength(2);
    // Sin PII.
    for (const l of lines) expect(l).not.toMatch(/Bearer|eyJ|"subject"|@/i);
    expect(JSON.stringify(lines)).not.toContain(tokens['supervisor']);
    // Restaurar para no contaminar pruebas posteriores.
    const after = (
      (await call('get', '/admin/permissions', 'initial-admin')).body as {
        roles: Record<string, { version: number }>;
      }
    ).roles.SUPERVISOR;
    await call('put', '/admin/permissions/roles/SUPERVISOR', 'initial-admin', {
      body: {
        permissions: [...PERMISOS_POR_ROL[Rol.SUPERVISOR]],
        expectedVersion: after.version,
        motivo: 'Restaurar siembra',
      },
    });
  });

  it('S-04 · si la matriz no se puede leer: NO_COMPARISON y la respuesta no cambia', async () => {
    config.set('PERMISSIONS_SHADOW', 'log');
    const baseline = await call('get', '/admin/users', 'initial-admin');
    await db.query('ALTER TABLE auth.role_permissions RENAME TO rp_tmp');
    try {
      warn.mockClear();
      const res = await call('get', '/admin/users', 'initial-admin');
      expect(res).toEqual(baseline);
      const lines = shadowLines();
      expect(lines).toHaveLength(1);
      expect(JSON.parse(lines[0])).toMatchObject({
        kind: 'NO_COMPARISON',
        endpoint: 'UsersController.list',
      });
    } finally {
      await db.query('ALTER TABLE auth.rp_tmp RENAME TO role_permissions');
    }
  });

  it('con la siembra restaurada vuelve a no haber discrepancias', async () => {
    config.set('PERMISSIONS_SHADOW', 'log');
    warn.mockClear();
    expect((await call('get', '/admin/users', 'supervisor')).status).toBe(403);
    expect((await call('get', '/admin/users', 'initial-admin')).status).toBe(
      200,
    );
    expect(
      shadowLines().filter((l) => l.includes('DECISION_DIFFERS')),
    ).toHaveLength(0);
  });
});
