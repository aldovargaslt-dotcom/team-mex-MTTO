import { readFileSync } from 'fs';
import { join } from 'path';
import { execFileSync } from 'child_process';
import { DataSource } from 'typeorm';
import { createMigrationDataSource } from '../src/db/migration-data-source';
import { postgresConnectionOptions } from '../src/db/postgres-options';
import { verifyFoundation } from '../src/db/check-foundation';
import { RetireGlobalDraftIndex1790899200005 } from '../src/db/migrations/1790899200005-RetireGlobalDraftIndex';
import { VisitasInvariantService } from '../src/visitas/visitas-invariant.service';

const vehicle = '11111111-1111-4111-8111-111111111111';
const draft = '22222222-2222-4222-8222-222222222222';
const closed = '33333333-3333-4333-8333-333333333333';
const driver = '44444444-4444-4444-8444-444444444444';
const type = '55555555-5555-4555-8555-555555555555';
const reader = {
  get: <T = string>(k: string, d?: T) => (process.env[k] ?? d) as T | undefined,
};

describe('S1-T05/T06/T07 isolated migration rehearsal (synchronize=false)', () => {
  let db: DataSource;
  const database = 'ewo015_migration_test';
  beforeAll(async () => {
    if (process.env.EWO_DISPOSABLE_DB !== 'true' || process.env.DATABASE_URL)
      throw new Error(
        'Explicit disposable target required; clear DATABASE_URL.',
      );
    const options = postgresConnectionOptions(reader);
    const client = new DataSource({
      ...options,
      synchronize: false,
      dropSchema: false,
    });
    await client.initialize();
    if (
      !(
        await client.query('SELECT current_database() AS name')
      )[0].name.endsWith('_test')
    )
      throw new Error('Not a test database');
    const exists = await client.query(
      'SELECT 1 FROM pg_database WHERE datname=$1',
      [database],
    );
    if (!exists.length) await client.query(`CREATE DATABASE ${database}`);
    await client.destroy();
    db = createMigrationDataSource({ ...options, database });
    await db.initialize();
    expect(db.options.synchronize).toBe(false);
    expect(db.options.dropSchema).toBe(false);
  });
  afterAll(async () => {
    if (db?.isInitialized) await db.destroy();
  });
  beforeEach(async () => {
    await db.query('DROP SCHEMA public CASCADE');
    await db.query(
      readFileSync(join(__dirname, 'fixtures/legacy-public.sql'), 'utf8'),
    );
    await db.query(
      `INSERT INTO tipos_vehiculo (id,nombre) VALUES ($1,'Fixture')`,
      [type],
    );
    await db.query(
      `INSERT INTO choferes(id,nombre) VALUES ($1,'Fixture driver')`,
      [driver],
    );
    await db.query(
      `INSERT INTO unidades (id,numero_interno,placas,tipo_id) VALUES ($1,'FIX-1','FIX-1',$2)`,
      [vehicle, type],
    );
    await db.query(
      `INSERT INTO visitas(id,unidad_id,chofer_id,km,tipo,estado,cerrado_at,created_by) VALUES
      ($1,$3,$4,100,'PREDICTIVO','BORRADOR',NULL,'legacy-subject'),
      ($2,$3,$4,90,'CORRECTIVO','CERRADO','2026-09-01T00:00:00Z','legacy-subject')`,
      [draft, closed, vehicle, driver],
    );
    await db.query(
      `INSERT INTO visita_trabajos(id,visita_id,categoria,item) VALUES ('66666666-6666-4666-8666-666666666666',$1,'A','fixture item')`,
      [closed],
    );
    await db.query(
      `INSERT INTO visita_fotos(id,visita_id,data_url) VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',$1,'fixture-photo')`,
      [closed],
    );
    await db.query(
      `INSERT INTO visita_firmas(id,visita_id,tipo,data_url) VALUES ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',$1,'CHOFER','fixture-signature')`,
      [closed],
    );
    await db.query(
      `INSERT INTO visita_piezas(id,visita_id,item_id,qty,origen) VALUES ('cccccccc-cccc-4ccc-8ccc-cccccccccccc',$1,'dddddddd-dddd-4ddd-8ddd-dddddddddddd',1,'COMPRA_EXTERNA')`,
      [closed],
    );
    process.env.CHK_LEGACY_WRITERS_DRAINED = 'true';
  });
  async function upgrade() {
    return db.runMigrations({ transaction: 'all' });
  }
  it('S1-T05 executes the isolated CLI runner up and idempotent rerun with synchronize=false', async () => {
    const env = {
      ...process.env,
      DB_NAME: database,
      DB_SYNCHRONIZE: 'false',
      DB_DROP_SCHEMA: 'false',
      MIGRATION_DISPOSABLE_DATABASE: database,
    };
    const args = [
      require.resolve('ts-node/dist/bin.js'),
      'src/db/run-migrations.ts',
      'up',
    ];
    const first = execFileSync(process.execPath, args, {
      cwd: join(__dirname, '..'),
      env,
      encoding: 'utf8',
    });
    expect(first).toContain('ExpandVisita1790899200001');
    expect(first).toContain('ValidateCheckFoundation1790899200006');
    expect(
      execFileSync(process.execPath, args, {
        cwd: join(__dirname, '..'),
        env,
        encoding: 'utf8',
      }).trim(),
    ).toBe('[]');
    expect(await db.query('SELECT * FROM chk_schema_migrations')).toHaveLength(
      6,
    );
  }, 30000);
  it('S1-T05 maps known values, preserves IDs/children, records versions and reruns idempotently', async () => {
    const childTables = [
      'visita_trabajos',
      'visita_fotos',
      'visita_firmas',
      'visita_piezas',
    ];
    const before = await Promise.all(
      childTables.map((table) =>
        db.query(`SELECT * FROM ${table} ORDER BY id`),
      ),
    );
    expect(await upgrade()).toHaveLength(6);
    expect(await upgrade()).toHaveLength(0);
    await new VisitasInvariantService(db).onApplicationBootstrap();
    const rows = await db.query(
      'SELECT id,work_order_type,work_order_status,legacy_compat_draft,created_by,version FROM visitas ORDER BY id',
    );
    expect(rows).toEqual([
      {
        id: draft,
        work_order_type: 'PREVENTIVE',
        work_order_status: 'PENDING',
        legacy_compat_draft: true,
        created_by: 'legacy-subject',
        version: 1,
      },
      {
        id: closed,
        work_order_type: 'CORRECTIVE',
        work_order_status: 'COMPLETED',
        legacy_compat_draft: false,
        created_by: 'legacy-subject',
        version: 1,
      },
    ]);
    expect(
      await Promise.all(
        childTables.map((table) =>
          db.query(`SELECT * FROM ${table} ORDER BY id`),
        ),
      ),
    ).toEqual(before);
    const indexes = await db.query(
      "SELECT indexname FROM pg_indexes WHERE schemaname='public' AND tablename='visitas'",
    );
    expect(indexes.map((x: { indexname: string }) => x.indexname)).toEqual(
      expect.arrayContaining([
        'check_un_activo_por_unidad_uidx',
        'visitas_legacy_draft_slot_uidx',
      ]),
    );
    expect(
      indexes.map((x: { indexname: string }) => x.indexname),
    ).not.toContain('visitas_un_borrador_por_unidad_uidx');
  });
  it.each([
    ['null type', `UPDATE visitas SET tipo=NULL WHERE id='${draft}'`],
    [
      'null status',
      `ALTER TABLE visitas ALTER COLUMN estado DROP NOT NULL; UPDATE visitas SET estado=NULL WHERE id='${draft}'`,
    ],
    ['null vehicle', `UPDATE visitas SET unidad_id=NULL WHERE id='${draft}'`],
    [
      'unknown type',
      `ALTER TABLE visitas ALTER COLUMN tipo TYPE text USING tipo::text; UPDATE visitas SET tipo='UNKNOWN' WHERE id='${draft}'`,
    ],
    [
      'unknown status',
      `DROP INDEX visitas_un_borrador_por_unidad_uidx; ALTER TABLE visitas ALTER COLUMN estado DROP DEFAULT; ALTER TABLE visitas ALTER COLUMN estado TYPE text USING estado::text; UPDATE visitas SET estado='UNKNOWN' WHERE id='${draft}'`,
    ],
    [
      'duplicate draft',
      `DROP INDEX visitas_un_borrador_por_unidad_uidx; UPDATE visitas SET estado='BORRADOR' WHERE id='${closed}'`,
    ],
    [
      'missing completion',
      `UPDATE visitas SET cerrado_at=NULL WHERE id='${closed}'`,
    ],
    [
      'orphan child',
      `ALTER TABLE visita_trabajos DISABLE TRIGGER ALL; UPDATE visita_trabajos SET visita_id='99999999-9999-4999-8999-999999999999'; ALTER TABLE visita_trabajos ENABLE TRIGGER ALL`,
    ],
    [
      'orphan vehicle',
      `ALTER TABLE visitas DISABLE TRIGGER ALL; UPDATE visitas SET unidad_id='99999999-9999-4999-8999-999999999999'; ALTER TABLE visitas ENABLE TRIGGER ALL`,
    ],
    [
      'invalid event envelope',
      `INSERT INTO outbox_events(id,type,payload) VALUES ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','VisitaCerrada','{}')`,
    ],
  ])('S1-T06 aborts %s without modifying the fixture', async (_name, sql) => {
    await db.query(sql);
    const before = await db.query('SELECT * FROM visitas ORDER BY id');
    await expect(upgrade()).rejects.toThrow(/LEGACY_AUDIT_FAILED/);
    expect(await db.query('SELECT * FROM visitas ORDER BY id')).toEqual(before);
    expect(
      await db.query(
        "SELECT 1 FROM information_schema.columns WHERE table_name='visitas' AND column_name='work_order_type'",
      ),
    ).toHaveLength(0);
  });
  it('S1-T06 enforces the CHECK subtype at transaction commit', async () => {
    await upgrade();
    await expect(
      db.transaction((m) =>
        m.query(
          `INSERT INTO visitas(id,unidad_id,estado,tipo,work_order_type,work_order_status,version) VALUES ('77777777-7777-4777-8777-777777777777',$1,NULL,NULL,'CHECK','PENDING',1)`,
          [vehicle],
        ),
      ),
    ).rejects.toThrow(/CHECK_SUBTYPE_REQUIRED/);
    await db.query(
      "INSERT INTO facilities(id,name) VALUES ('fixture','Fixture facility')",
    );
    await db.transaction(async (manager) => {
      await manager.query(
        `INSERT INTO visitas(id,unidad_id,estado,tipo,work_order_type,work_order_status,version) VALUES ('77777777-7777-4777-8777-777777777777',$1,NULL,NULL,'CHECK','PENDING',1)`,
        [vehicle],
      );
      await manager.query(`INSERT INTO check_inspections(visita_id,source,facility_id,operational_date,timezone,calendar_version,mapping_version,day_end_instant)
        VALUES ('77777777-7777-4777-8777-777777777777','LOGISTICS_MANUAL','fixture','2026-10-01','America/Mexico_City',1,1,'2026-10-02T06:00:00Z')`);
    });
    await expect(
      db.query(
        "DELETE FROM check_inspections WHERE visita_id='77777777-7777-4777-8777-777777777777'",
      ),
    ).rejects.toThrow(/CHECK_SUBTYPE_REQUIRED/);
    await expect(
      db.query(
        `UPDATE check_inspections SET visita_id=$1 WHERE visita_id='77777777-7777-4777-8777-777777777777'`,
        [draft],
      ),
    ).rejects.toThrow(/CHECK_SUBTYPE_REQUIRED/);
    expect(
      await db.query('SELECT visita_id FROM check_inspections'),
    ).toHaveLength(1);
  });
  it('S1-T07 refuses retirement without explicit writer-drain confirmation', async () => {
    delete process.env.CHK_LEGACY_WRITERS_DRAINED;
    await expect(upgrade()).rejects.toThrow(/WRITERS_NOT_DRAINED/);
    expect(
      await db.query(
        "SELECT 1 FROM pg_indexes WHERE indexname='visitas_un_borrador_por_unidad_uidx'",
      ),
    ).toHaveLength(1);
  });
  it('S1-T07 verifies exact replacement predicates before retiring the old protection', async () => {
    await upgrade();
    await db.query(
      "CREATE UNIQUE INDEX visitas_un_borrador_por_unidad_uidx ON visitas(unidad_id) WHERE estado='BORRADOR'",
    );
    await db.query(
      "DROP INDEX check_un_activo_por_unidad_uidx; CREATE UNIQUE INDEX check_un_activo_por_unidad_uidx ON visitas(unidad_id) WHERE work_order_type='CHECK' AND work_order_status IN ('PENDING','ASSIGNED','IN_PROGRESS') AND false",
    );
    await expect(verifyFoundation(db)).rejects.toThrow(
      /FOUNDATION_INDEX_INVALID/,
    );
    const runner = db.createQueryRunner();
    await runner.connect();
    try {
      await expect(
        new RetireGlobalDraftIndex1790899200005().up(runner),
      ).rejects.toThrow(/FOUNDATION_INDEX_INVALID/);
    } finally {
      await runner.release();
    }
    expect(
      await db.query(
        "SELECT 1 FROM pg_indexes WHERE indexname='visitas_un_borrador_por_unidad_uidx'",
      ),
    ).toHaveLength(1);
  });
  it('S1-T07 rejects rollback with new data; permits a legacy-only roundtrip', async () => {
    await upgrade();
    await db.query(
      `INSERT INTO visitas(id,unidad_id,estado,tipo,work_order_type,work_order_status,version) VALUES ('77777777-7777-4777-8777-777777777777',$1,'BORRADOR','CORRECTIVO','CORRECTIVE','PENDING',1)`,
      [vehicle],
    );
    await expect(db.undoLastMigration()).rejects.toThrow(
      /FORWARD_RECOVERY_REQUIRED/,
    );
    await db.query(
      "DELETE FROM visitas WHERE id='77777777-7777-4777-8777-777777777777'",
    );
    for (let i = 0; i < 6; i++) await db.undoLastMigration();
    expect(await db.query('SELECT id FROM visitas')).toHaveLength(2);
    expect(await db.query('SELECT * FROM visita_trabajos')).toHaveLength(1);
    expect(await upgrade()).toHaveLength(6);
  });
});
