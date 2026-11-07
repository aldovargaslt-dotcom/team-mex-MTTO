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
import { PERMISOS, PERMISOS_POR_ROL } from '../src/auth/permissions';
import { configureApp } from '../src/configure-app';
import { createAuthMigrationDataSource } from '../src/db/auth-migration-data-source';
import { createPermissionMigrationDataSource } from '../src/db/permission-migration-data-source';
import { postgresConnectionOptions } from '../src/db/postgres-options';
import { Facility } from '../src/visitas/checks/facility.entity';

describe('EWO-068 matriz rol→permisos en modo sombra (AC-P04–P08, P12)', () => {
  let app: INestApplication, db: DataSource;
  let config: ConfigService;
  let matrix: PermissionMatrixService;
  let keys: Awaited<ReturnType<typeof generateKeyPair>>;
  let tokens: Record<string, string>;
  const issuer = 'https://identity.perm.test';
  const http = (
    method: 'get' | 'put',
    path: string,
    subject = 'initial-admin',
  ) =>
    request(app.getHttpServer())
      [method](path)
      .set('Authorization', `Bearer ${tokens[subject]}`);
  const versionOf = async (rol: string) =>
    (
      await db
        .getRepository(RolePermissionVersion)
        .findOneByOrFail({ role: rol })
    ).version;
  const grants = async (rol: string) =>
    (await db.getRepository(RolePermission).findBy({ role: rol }))
      .map((g) => g.permission)
      .sort();
  const body = (changes: Record<string, unknown> = {}) => ({
    permissions: [...PERMISOS_POR_ROL[Rol.MECANICO]],
    expectedVersion: 1,
    motivo: 'Prueba e2e',
    ...changes,
  });

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
          facilityScopes: ['perm-mex'],
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
      expect(await auth.runMigrations()).toHaveLength(1);
    } finally {
      await auth.destroy();
    }
    // Migración propia: up, idempotente, down reversible y up de nuevo.
    const perm = createPermissionMigrationDataSource(connection);
    await perm.initialize();
    try {
      expect(await perm.runMigrations()).toHaveLength(1);
      expect(await perm.runMigrations()).toHaveLength(0);
      await perm.undoLastMigration();
      const gone = await perm.query(
        `SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='auth' AND table_name LIKE 'role_permission%'`,
      );
      expect(gone[0].n).toBe(0);
      // El directorio de usuarios no se toca.
      const users = await perm.query(
        `SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='auth' AND table_name='users'`,
      );
      expect(users[0].n).toBe(1);
      expect(await perm.runMigrations()).toHaveLength(1);
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
            kid: 'perm-key',
            alg: 'RS256',
          },
        ],
      }),
      { resolve: (iss, sub) => users.resolve(iss, sub) },
    );
    tokens = {};
    for (const subject of ['initial-admin', 'supervisor', 'stranger'])
      tokens[subject] = await new SignJWT({ roles: [Rol.ADMIN_DIRECTIVO] })
        .setProtectedHeader({ alg: 'RS256', kid: 'perm-key' })
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
      id: 'perm-mex',
      name: 'Patio de prueba',
      timezone: 'America/Mexico_City',
      version: 1,
    });
    configureApp(app);
    await app.init();
    await request(app.getHttpServer())
      .post('/admin/users')
      .set('Authorization', `Bearer ${tokens['initial-admin']}`)
      .send({
        subject: 'supervisor',
        displayName: 'Supervisor de prueba',
        roles: [Rol.SUPERVISOR],
        facilityScopes: ['perm-mex'],
        active: true,
      })
      .expect(201);
  }, 90000);
  afterAll(async () => {
    await app?.close();
  });

  it('la siembra reproduce exactamente PERMISOS_POR_ROL con versión 1 y auditoría SEED', async () => {
    for (const rol of Object.values(Rol)) {
      expect(await grants(rol)).toEqual([...PERMISOS_POR_ROL[rol]].sort());
      expect(await versionOf(rol)).toBe(1);
    }
    expect(
      await db.getRepository(RolePermissionAudit).countBy({ action: 'SEED' }),
    ).toBe(4);
  });

  it('GET: solo ADMIN confiable; sin credenciales 401, otro rol 403, X-Role no otorga nada (AC-P05)', async () => {
    await request(app.getHttpServer()).get('/admin/permissions').expect(401);
    await request(app.getHttpServer())
      .get('/admin/permissions')
      .set('X-Role', 'ADMIN_DIRECTIVO')
      .expect(401);
    await http('get', '/admin/permissions', 'stranger').expect(401);
    await http('get', '/admin/permissions', 'supervisor').expect(403);
    await http('put', '/admin/permissions/roles/MECANICO', 'supervisor')
      .send(body())
      .expect(403);
    const res = await http('get', '/admin/permissions').expect(200);
    expect(res.headers['cache-control']).toContain('no-store');
    expect(res.body.enforced).toBe(false);
    expect(res.body.mode).toBe('DATABASE');
    expect(res.body.editable).toBe(true);
    expect(res.body.catalog).toEqual([...PERMISOS]);
    expect(res.body.roles.MECANICO).toEqual({
      version: 1,
      permissions: ['documentos.vehiculo.ver'],
    });
  });

  it('PUT: edita con versión, audita antes/después con motivo y la siguiente lectura lo ve (AC-P04, P08)', async () => {
    const res = await http('put', '/admin/permissions/roles/MECANICO')
      .send(
        body({
          permissions: ['documentos.vehiculo.ver', 'inventario.ver'],
          motivo: '  Permitir ver existencias  ',
        }),
      )
      .expect(200);
    expect(res.body).toMatchObject({
      rol: 'MECANICO',
      version: 2,
      changed: true,
      enforced: false,
      permissions: ['documentos.vehiculo.ver', 'inventario.ver'],
    });
    const read = await http('get', '/admin/permissions').expect(200);
    expect(read.body.roles.MECANICO).toEqual({
      version: 2,
      permissions: ['documentos.vehiculo.ver', 'inventario.ver'],
    });
    const audit = await db
      .getRepository(RolePermissionAudit)
      .findOneByOrFail({ role: 'MECANICO', action: 'UPDATE' });
    expect(audit).toMatchObject({
      actorSubject: 'initial-admin',
      reason: 'Permitir ver existencias',
      before: ['documentos.vehiculo.ver'],
      after: ['documentos.vehiculo.ver', 'inventario.ver'],
      versionAfter: 2,
    });
  });

  it('PUT: versión obsoleta ⇒ 409 con la versión vigente y sin cambios (AC-P06)', async () => {
    const res = await http('put', '/admin/permissions/roles/MECANICO')
      .send(body({ expectedVersion: 1, permissions: [] }))
      .expect(409);
    expect(res.body.code ?? res.body.message?.code).toBe(
      'PERMISSION_MATRIX_VERSION_CONFLICT',
    );
    expect(await grants('MECANICO')).toEqual([
      'documentos.vehiculo.ver',
      'inventario.ver',
    ]);
    expect(await versionOf('MECANICO')).toBe(2);
  });

  it('PUT idéntico no escribe ni audita (idempotente)', async () => {
    const before = await db.getRepository(RolePermissionAudit).count();
    const res = await http('put', '/admin/permissions/roles/MECANICO')
      .send(
        body({
          expectedVersion: 2,
          permissions: ['inventario.ver', 'documentos.vehiculo.ver'],
        }),
      )
      .expect(200);
    expect(res.body.changed).toBe(false);
    expect(res.body.version).toBe(2);
    expect(await db.getRepository(RolePermissionAudit).count()).toBe(before);
  });

  it('PUT: dos ediciones concurrentes con la misma versión — una gana, la otra 409 (concurrencia)', async () => {
    const results = await Promise.all(
      ['costos.ver', 'andon.ver'].map((p) =>
        http('put', '/admin/permissions/roles/LOGISTICA').send(
          body({
            expectedVersion: 1,
            permissions: [...PERMISOS_POR_ROL[Rol.LOGISTICA], p],
          }),
        ),
      ),
    );
    expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
    expect(await versionOf('LOGISTICA')).toBe(2);
    expect(
      await db
        .getRepository(RolePermissionAudit)
        .countBy({ role: 'LOGISTICA', action: 'UPDATE' }),
    ).toBe(1);
  });

  it('PUT: rechaza permisos desconocidos, duplicados, roles inválidos, motivo vacío y campos extra (AC-P12)', async () => {
    const before = await grants('SUPERVISOR');
    const v = await versionOf('SUPERVISOR');
    for (const changes of [
      { permissions: ['inventado.todo'] },
      { permissions: ['inventario.ver', 'inventario.ver'] },
      { motivo: '   ' },
      { motivo: 'x'.repeat(501) },
      { expectedVersion: 0 },
      { issuer: 'attacker' },
    ])
      await http('put', '/admin/permissions/roles/SUPERVISOR')
        .send(body({ expectedVersion: v, ...changes }))
        .expect(400);
    for (const rol of ['SYSTEM', 'ROOT'])
      await http('put', `/admin/permissions/roles/${rol}`)
        .send(body())
        .expect(400);
    expect(await grants('SUPERVISOR')).toEqual(before);
    expect(await versionOf('SUPERVISOR')).toBe(v);
  });

  it('ADMIN_DIRECTIVO nunca pierde usuarios.administrar (AC-P07)', async () => {
    const v = await versionOf('ADMIN_DIRECTIVO');
    await http('put', '/admin/permissions/roles/ADMIN_DIRECTIVO')
      .send(
        body({
          expectedVersion: v,
          permissions: PERMISOS.filter((p) => p !== 'usuarios.administrar'),
        }),
      )
      .expect(400);
    await http('put', '/admin/permissions/roles/ADMIN_DIRECTIVO')
      .send(body({ expectedVersion: v, permissions: [] }))
      .expect(400);
    expect(await grants('ADMIN_DIRECTIVO')).toContain('usuarios.administrar');
  });

  it('matriz ilegible ⇒ fallo cerrado 503 sin conceder nada (AC-P12)', async () => {
    await db.query(
      `INSERT INTO auth.role_permissions(role, permission) VALUES ('MECANICO', 'inventado.todo')`,
    );
    await http('get', '/admin/permissions').expect(503);
    await http('put', '/admin/permissions/roles/MECANICO')
      .send(body({ expectedVersion: 2 }))
      .expect(503);
    await db.query(
      `DELETE FROM auth.role_permissions WHERE permission = 'inventado.todo'`,
    );
    await db.query(
      `UPDATE auth.role_permission_versions SET version = version WHERE role = 'MECANICO'`,
    );
    await db.query(
      `DELETE FROM auth.role_permissions WHERE role = 'LOGISTICA'`,
    );
    await db
      .query(
        `DELETE FROM auth.role_permission_versions WHERE role = 'LOGISTICA'`,
      )
      .catch(() => undefined);
    await http('get', '/admin/permissions').expect(503);
    // Restaurar el rol eliminado para no contaminar pruebas posteriores.
    await db.query(
      `INSERT INTO auth.role_permission_versions(role, version) VALUES ('LOGISTICA', 2) ON CONFLICT DO NOTHING`,
    );
    for (const p of PERMISOS_POR_ROL[Rol.LOGISTICA])
      await db.query(
        `INSERT INTO auth.role_permissions(role, permission) VALUES ('LOGISTICA', $1) ON CONFLICT DO NOTHING`,
        [p],
      );
    await http('get', '/admin/permissions').expect(200);
  });

  it('sin migrar (tablas ausentes) ⇒ 503 fallo cerrado y el resto de la API sigue operando', async () => {
    await db.query('ALTER TABLE auth.role_permissions RENAME TO rp_tmp');
    try {
      await http('get', '/admin/permissions').expect(503);
      await http('put', '/admin/permissions/roles/MECANICO')
        .send(body({ expectedVersion: 2 }))
        .expect(503);
      await http('get', '/admin/users').expect(200);
    } finally {
      await db.query('ALTER TABLE auth.rp_tmp RENAME TO role_permissions');
    }
    await http('get', '/admin/permissions').expect(200);
  });

  it('modo CONFIG: lectura de los valores por defecto y PUT ⇒ 409 de solo lectura (O-1)', async () => {
    const store = config.get('AUTH_ACTOR_STORE');
    config.set('AUTH_ACTOR_STORE', 'CONFIG');
    try {
      const view = await matrix.read();
      expect(view).toMatchObject({
        mode: 'CONFIG',
        editable: false,
        enforced: false,
      });
      expect(view.roles.SUPERVISOR.permissions).toEqual([
        ...PERMISOS_POR_ROL[Rol.SUPERVISOR],
      ]);
      await expect(
        matrix.update(
          'MECANICO',
          { permissions: [], expectedVersion: 1, motivo: 'x' },
          { subject: 'initial-admin' } as never,
        ),
      ).rejects.toMatchObject({ status: 409 });
    } finally {
      config.set('AUTH_ACTOR_STORE', store);
    }
  });

  it('modo sombra: editar la matriz no cambia el acceso real de ningún endpoint', async () => {
    // MECANICO ahora tiene 'inventario.ver' en la matriz, pero sigue sin poder usar inventario.
    await db.query(
      `UPDATE auth.users SET roles = ARRAY['MECANICO'] WHERE subject = 'supervisor'`,
    );
    const res = await http('get', '/admin/permissions', 'supervisor');
    expect(res.status).toBe(403);
  });
});
