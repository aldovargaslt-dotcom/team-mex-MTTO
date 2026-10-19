import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { AuthenticationPort } from '../src/auth/trusted-actor';
import { Rol } from '../src/auth/roles.enum';
import { Unidad } from '../src/unidades/unidad.entity';
import {
  Facility,
  VehicleFacility,
} from '../src/visitas/checks/facility.entity';
import { MaintenanceAnalysis1792281600000 } from '../src/db/migrations/1792281600000-MaintenanceAnalysis';
import { CostOperation } from '../src/inventario/entities/cost.entity';
import {
  AnalysisExternalService,
  AnalysisReceipt,
  AnalysisSnapshot,
} from '../src/visitas/analysis/analysis.entity';
import { operationalDay } from '../src/visitas/checks/facility-calendar';
import { shiftDate } from '../src/visitas/analysis/analysis-rules';

const headers = (subject = 'SUPERVISOR') => ({
  'X-Role': subject === 'ADMIN_B' ? 'ADMIN_DIRECTIVO' : subject,
  Authorization: `Bearer ${subject}`,
});
const base = '/analisis-mantenimiento';
const money = (inputTotalCents = '100000') => ({
  state: 'RECORDED',
  inputTotalCents,
  currency: 'MXN',
  taxMode: 'EXCLUDED',
  taxTreatment: 'TAXED',
  rateBps: 1600,
});
describe('Maintenance analysis scoped transactions and reporting', () => {
  let app: INestApplication, db: DataSource, unitA: string, unitB: string;
  const day = operationalDay(new Date()).operationalDate;
  beforeAll(async () => {
    process.env.MAINTENANCE_ANALYSIS_READ_ENABLED = 'true';
    process.env.MAINTENANCE_ANALYSIS_WRITE_ENABLED = 'true';
    process.env.MAINTENANCE_ANALYSIS_SCHEDULE_ENABLED = 'true';
    process.env.CHECK_STORAGE_PROVIDER = 'filesystem';
    process.env.CHECK_STORAGE_ROOT = '/tmp/maintenance-analysis-e2e-files';
    const testing = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AuthenticationPort)
      .useValue({
        kind: 'TRUSTED',
        authenticate: async (req: { header: (name: string) => string }) => {
          const token = req.header('authorization')?.replace('Bearer ', '');
          if (
            !['SUPERVISOR', 'ADMIN_DIRECTIVO', 'ADMIN_B', 'LOGISTICA'].includes(
              token,
            )
          )
            return null;
          return {
            subject: token,
            displayName: token,
            roles: [token === 'ADMIN_B' ? Rol.ADMIN_DIRECTIVO : (token as Rol)],
            facilityScopes: [token === 'ADMIN_B' ? 'AN-B' : 'AN-A'],
            authMode: 'TRUSTED',
            attributionLevel: 'SERVER_VERIFIED',
          };
        },
      })
      .compile();
    app = testing.createNestApplication();
    configureApp(app);
    await app.init();
    db = app.get(DataSource);
    const q = db.createQueryRunner();
    await q.connect();
    await q.startTransaction();
    try {
      await new MaintenanceAnalysis1792281600000().up(q);
      await q.commitTransaction();
    } catch (e) {
      await q.rollbackTransaction();
      throw e;
    } finally {
      await q.release();
    }
    const units = await db.getRepository(Unidad).find({ take: 2 });
    unitA = units[0].id;
    unitB = units[1].id;
    await db.manager.save(Facility, [
      {
        id: 'AN-A',
        name: 'Analysis A',
        timezone: 'America/Mexico_City',
        version: 1,
      },
      {
        id: 'AN-B',
        name: 'Analysis B',
        timezone: 'America/Mexico_City',
        version: 1,
      },
    ]);
    await db.manager.save(VehicleFacility, [
      { unidadId: unitA, facilityId: 'AN-A', version: 1 },
      { unidadId: unitB, facilityId: 'AN-B', version: 1 },
    ]);
  }, 60000);
  afterAll(async () => {
    await app?.close();
    delete process.env.CHECK_STORAGE_PROVIDER;
    delete process.env.CHECK_STORAGE_ROOT;
    delete process.env.MAINTENANCE_ANALYSIS_READ_ENABLED;
    delete process.env.MAINTENANCE_ANALYSIS_WRITE_ENABLED;
    delete process.env.MAINTENANCE_ANALYSIS_SCHEDULE_ENABLED;
  });
  function draft(pending = false) {
    return {
      unitId: unitA,
      providerName: 'Taller prueba',
      performedOn: day,
      maintenanceType: 'CORRECTIVE',
      workLines: [{ system: 'D', workCode: 'D_REPAIR', workKind: 'REPAIR' }],
      costLines: [
        {
          system: 'D',
          mode: 'SERVICE_ONLY',
          money: pending ? { state: 'PENDING' } : money(),
        },
      ],
    };
  }
  const create = (body = draft(), key = randomUUID(), actor = 'SUPERVISOR') =>
    request(app.getHttpServer())
      .post(`${base}/servicios-externos`)
      .set(headers(actor))
      .set('Idempotency-Key', key)
      .send(body);
  it('roundtrips an empty isolated migration without touching source tables', async () => {
    const q = db.createQueryRunner();
    await q.connect();
    await q.startTransaction();
    try {
      const before = await q.query(
        'SELECT count(*)::int AS n FROM public.unidades',
      );
      await new MaintenanceAnalysis1792281600000().down(q);
      await new MaintenanceAnalysis1792281600000().up(q);
      expect(
        await q.query('SELECT count(*)::int AS n FROM public.unidades'),
      ).toEqual(before);
      await q.commitTransaction();
    } catch (e) {
      await q.rollbackTransaction();
      throw e;
    } finally {
      await q.release();
    }
  });
  it('requires a stable signing secret before enabling analysis in production', async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const result = await request(app.getHttpServer())
        .get(`${base}/opciones`)
        .set(headers())
        .expect(503);
      expect(result.body.code).toBe('ANALYSIS_SIGNING_UNAVAILABLE');
    } finally {
      if (previous === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previous;
    }
  });
  it('keeps a disabled inventory source partial instead of manufacturing zero cost', async () => {
    const previous = process.env.INVENTORY_COSTS_ENABLED;
    process.env.INVENTORY_COSTS_ENABLED = 'false';
    try {
      const snapshot = await request(app.getHttpServer())
        .post(`${base}/consultas`)
        .set(headers('ADMIN_B'))
        .send({ from: shiftDate(day, -1), to: shiftDate(day, 1) })
        .expect(201);
      const view = await request(app.getHttpServer())
        .get(`${base}/consultas/${snapshot.body.snapshotId}/costos`)
        .set(headers('ADMIN_B'))
        .expect(200);
      expect(view.body.summary.netCents).toBeNull();
      expect(view.body.coverage.errors).toContain('PARTS_SOURCE_UNAVAILABLE');
    } finally {
      if (previous === undefined) delete process.env.INVENTORY_COSTS_ENABLED;
      else process.env.INVENTORY_COSTS_ENABLED = previous;
    }
  });
  it('denies untrusted/other roles and out-of-facility references', async () => {
    await request(app.getHttpServer()).get(`${base}/opciones`).expect(401);
    await create(draft(), randomUUID(), 'LOGISTICA').expect(403);
    await create({ ...draft(), unitId: unitB }).expect(404);
    expect(await db.manager.count(AnalysisExternalService)).toBe(0);
  });
  it('commits service, revision and receipt once, rejects incompatible retry and forged fields', async () => {
    const key = randomUUID(),
      body = draft();
    const first = await create(body, key).expect(201),
      again = await create(body, key).expect(201);
    expect(first.body.service.id).toBe(again.body.service.id);
    expect(
      await db.manager.count(AnalysisReceipt, {
        where: { subject: 'SUPERVISOR', commandId: key },
      }),
    ).toBe(1);
    await create({ ...body, providerName: 'Otro' }, key).expect(409);
    await request(app.getHttpServer())
      .post(`${base}/servicios-externos`)
      .set(headers())
      .set('Idempotency-Key', randomUUID())
      .send({ ...body, actor: 'forged' })
      .expect(400);
    await request(app.getHttpServer())
      .get(`${base}/servicios-externos/${first.body.service.id}`)
      .set(headers('ADMIN_B'))
      .expect(404);
  });
  it('completes pending cost with version binding without releasing or changing the unit', async () => {
    const first = await create(draft(true)).expect(201),
      row = first.body.service;
    const before = await db.manager.findOneByOrFail(Unidad, { id: unitA });
    const lines = row.data.costLines.map((line: Record<string, unknown>) => ({
      ...line,
      money: money('50000'),
    }));
    const key = randomUUID();
    const next = await request(app.getHttpServer())
      .post(`${base}/servicios-externos/${row.id}/completar-costo`)
      .set(headers())
      .set('Idempotency-Key', key)
      .send({ expectedVersion: 1, costLines: lines })
      .expect(200);
    expect(next.body.service.version).toBe(2);
    await request(app.getHttpServer())
      .post(`${base}/servicios-externos/${row.id}/completar-costo`)
      .set(headers())
      .set('Idempotency-Key', randomUUID())
      .send({ expectedVersion: 1, costLines: lines })
      .expect(409);
    const after = await db.manager.findOneByOrFail(Unidad, { id: unitA });
    expect(after.opsEstado).toBe(before.opsEstado);
    expect(after.estado).toBe(before.estado);
    expect(after.logisticaJourneyRevision).toBe(
      before.logisticaJourneyRevision,
    );
  });
  it('cannot reuse another service line or work identity', async () => {
    const first = await create().expect(201);
    const body = draft();
    Object.assign(body.costLines[0], {
      id: first.body.service.data.costLines[0].id,
    });
    await create(body).expect(400);
    expect(
      (
        await request(app.getHttpServer())
          .get(`${base}/servicios-externos/${first.body.service.id}`)
          .set(headers())
      ).body.service.version,
    ).toBe(1);
  });
  it('stores private evidence once and rechecks scope on signed downloads', async () => {
    const first = await create().expect(201),
      id = first.body.service.id,
      key = randomUUID(),
      content = Buffer.from('%PDF-1.7\nprivate invoice');
    const upload = () =>
      request(app.getHttpServer())
        .post(`${base}/servicios-externos/${id}/adjuntos`)
        .set(headers())
        .set('Idempotency-Key', key)
        .attach('file', content, {
          filename: 'invoice.pdf',
          contentType: 'application/pdf',
        });
    const file = await upload().expect(201);
    expect((await upload()).body.attachment.id).toBe(file.body.attachment.id);
    const fileId = file.body.attachment.id,
      link = await request(app.getHttpServer())
        .get(`${base}/servicios-externos/${id}/adjuntos/${fileId}/enlace`)
        .set(headers())
        .expect(200);
    await request(app.getHttpServer())
      .get(
        `${base}/servicios-externos/${id}/adjuntos/${fileId}?token=${encodeURIComponent(link.body.token)}`,
      )
      .set(headers())
      .expect(200)
      .expect('Content-Type', /application\/pdf/);
    await request(app.getHttpServer())
      .get(`${base}/servicios-externos/${id}/adjuntos/${fileId}/enlace`)
      .set(headers('ADMIN_B'))
      .expect(404);
    await request(app.getHttpServer())
      .post(`${base}/servicios-externos/${id}/adjuntos`)
      .set(headers())
      .set('Idempotency-Key', randomUUID())
      .attach('file', Buffer.from('not a PDF'), {
        filename: 'false.pdf',
        contentType: 'application/pdf',
      })
      .expect(400);
  });
  it('reconciles documentary totals, retains prior assignment and repairs it after a correction', async () => {
    const first = await create().expect(201),
      row = first.body.service,
      line = row.data.costLines[0];
    const body = {
      expectedVersion: 0,
      lineIds: [line.id],
      documentRef: 'FACT-TEST',
      netCents: line.money.netCents,
      taxCents: line.money.taxCents,
      totalCents: line.money.totalCents,
      reason: 'Factura conocida',
    };
    await request(app.getHttpServer())
      .post(`${base}/grupos-documentales`)
      .set(headers())
      .set('Idempotency-Key', randomUUID())
      .send({ ...body, totalCents: '1' })
      .expect(400);
    const group = await request(app.getHttpServer())
      .post(`${base}/grupos-documentales`)
      .set(headers())
      .set('Idempotency-Key', randomUUID())
      .send(body)
      .expect(201);
    const editable = {
      ...row.data,
      costLines: row.data.costLines.map((x: Record<string, unknown>) => ({
        ...x,
        money: money('58000'),
      })),
    };
    const correction = {
      expectedVersion: 1,
      service: editable,
      reason: 'Factura corregida',
    };
    const preview = await request(app.getHttpServer())
      .post(`${base}/servicios-externos/${row.id}/previsualizar-correccion`)
      .set(headers('ADMIN_DIRECTIVO'))
      .send(correction)
      .expect(200);
    await request(app.getHttpServer())
      .post(`${base}/servicios-externos/${row.id}/corregir`)
      .set(headers('ADMIN_DIRECTIVO'))
      .set('Idempotency-Key', randomUUID())
      .send({ ...correction, previewToken: preview.body.previewToken })
      .expect(200);
    const snapshot = await request(app.getHttpServer())
      .post(`${base}/consultas`)
      .set(headers())
      .send({
        from: shiftDate(day, -1),
        to: shiftDate(day, 1),
        unitIds: [unitA],
      })
      .expect(201);
    const report = await request(app.getHttpServer())
      .get(`${base}/consultas/${snapshot.body.snapshotId}/costos`)
      .set(headers())
      .expect(200);
    expect(report.body.summary.reconciliationCount).toBeGreaterThan(0);
    await request(app.getHttpServer())
      .post(`${base}/grupos-documentales/${group.body.group.id}/revisiones`)
      .set(headers('ADMIN_DIRECTIVO'))
      .set('Idempotency-Key', randomUUID())
      .send({
        ...body,
        expectedVersion: 1,
        netCents: '58000',
        taxCents: '9280',
        totalCents: '67280',
        reason: 'Conciliar factura corregida',
      })
      .expect(200);
  });
  it('allows only Admin to configure a non-retroactive schedule and preserves revisions', async () => {
    const body = {
      facilityId: 'AN-A',
      scope: 'GENERAL',
      expectedVersion: 0,
      schedule: {
        weeklyDays: { '1': [{ start: '08:00', end: '17:00' }] },
        dateOverrides: {},
      },
      reason: 'Horario inicial',
    };
    await request(app.getHttpServer())
      .post(`${base}/horarios`)
      .set(headers())
      .set('Idempotency-Key', randomUUID())
      .send(body)
      .expect(403);
    await request(app.getHttpServer())
      .post(`${base}/horarios`)
      .set(headers('ADMIN_DIRECTIVO'))
      .set('Idempotency-Key', randomUUID())
      .send({ ...body, validFrom: '2020-01-01T00:00:00Z' })
      .expect(400);
    const first = await request(app.getHttpServer())
      .post(`${base}/horarios`)
      .set(headers('ADMIN_DIRECTIVO'))
      .set('Idempotency-Key', randomUUID())
      .send(body)
      .expect(201);
    expect(first.body.rule.version).toBe(1);
    const next = await request(app.getHttpServer())
      .post(`${base}/horarios`)
      .set(headers('ADMIN_DIRECTIVO'))
      .set('Idempotency-Key', randomUUID())
      .send({
        ...body,
        expectedVersion: 1,
        validFrom: new Date(Date.now() + 86400000).toISOString(),
      })
      .expect(201);
    expect(next.body.rule.version).toBe(2);
    const rules = await request(app.getHttpServer())
      .get(`${base}/horarios`)
      .set(headers())
      .expect(200);
    expect(rules.body).toHaveLength(2);
    expect(
      rules.body.find((x: { version: number }) => x.version === 1).validTo,
    ).toBe(next.body.rule.validFrom);
  });
  it('serializes supplier-piece claims and counts the financial component once', async () => {
    const opId = randomUUID();
    await db.manager.save(CostOperation, {
      id: opId,
      itemId: randomUUID(),
      kind: 'EXTERNAL',
      qty: 2,
      visitaId: null,
      unidadId: unitA,
      supplierId: null,
      supplierName: null,
      reference: null,
      money: null,
      netCents: '30000',
      revisions: [],
      version: 1,
      actor: 'TEST',
      reason: null,
      sourceId: null,
      effectiveAt: new Date(),
    });
    const body = draft();
    Object.assign(body.costLines[0], {
      mode: 'SUPPLIER_PARTS_INCLUDED',
      claims: [{ sourceOpId: opId, sourceVersion: 1, from: 0, to: 2 }],
    });
    const responses = await Promise.all([create(body), create(body)]);
    expect(responses.map((x) => x.status).sort()).toEqual([201, 409]);
  });
  it('creates a consistent scoped snapshot, keeps unknown history unavailable and binds cursors', async () => {
    const snapshot = await request(app.getHttpServer())
      .post(`${base}/consultas`)
      .set(headers())
      .send({
        from: shiftDate(day, -1),
        to: shiftDate(day, 1),
        unitIds: [unitA],
      })
      .expect(201);
    const id = snapshot.body.snapshotId;
    const view = await request(app.getHttpServer())
      .get(`${base}/consultas/${id}/resumen`)
      .set(headers())
      .expect(200);
    expect(view.body.summary.utilization).toBeNull();
    expect(view.body.coverage.missingSources).toContain('DOWNTIME_LEDGER');
    expect(view.body.units.every((x: { id: string }) => x.id === unitA)).toBe(
      true,
    );
    expect(view.body.summary.fiscalUnknown).toBe(0); // included supplier piece contributes only through service
    await request(app.getHttpServer())
      .get(`${base}/consultas/${id}/resumen`)
      .set(headers('ADMIN_B'))
      .expect(404);
    const page = await request(app.getHttpServer())
      .get(`${base}/consultas/${id}/registros?metricId=COSTS&limit=1`)
      .set(headers())
      .expect(200);
    expect(page.body.rows).toHaveLength(1);
    expect(page.body.nextCursor).toBeTruthy();
    await request(app.getHttpServer())
      .get(
        `${base}/consultas/${id}/registros?metricId=UNITS&cursor=${encodeURIComponent(page.body.nextCursor)}`,
      )
      .set(headers())
      .expect(400);
    await db.manager.update(
      AnalysisSnapshot,
      { id },
      { expiresAt: new Date(Date.now() - 1) },
    );
    await request(app.getHttpServer())
      .get(`${base}/consultas/${id}/resumen`)
      .set(headers())
      .expect(409);
  });
  it('requires Admin preview to correct a known amount and persists original evidence', async () => {
    const original = await create().expect(201),
      row = original.body.service;
    const service = {
      ...row.data,
      costLines: row.data.costLines.map((line: Record<string, unknown>) => ({
        ...line,
        money: money('200000'),
      })),
    };
    const payload = {
      expectedVersion: 1,
      service,
      reason: 'Importe corregido contra comprobante',
    };
    await request(app.getHttpServer())
      .post(`${base}/servicios-externos/${row.id}/previsualizar-correccion`)
      .set(headers())
      .send(payload)
      .expect(403);
    const preview = await request(app.getHttpServer())
      .post(`${base}/servicios-externos/${row.id}/previsualizar-correccion`)
      .set(headers('ADMIN_DIRECTIVO'))
      .send(payload)
      .expect(200);
    await request(app.getHttpServer())
      .post(`${base}/servicios-externos/${row.id}/corregir`)
      .set(headers('ADMIN_DIRECTIVO'))
      .set('Idempotency-Key', randomUUID())
      .send({ ...payload, previewToken: preview.body.previewToken })
      .expect(200);
    const result = await request(app.getHttpServer())
      .get(`${base}/servicios-externos/${row.id}`)
      .set(headers())
      .expect(200);
    expect(result.body.revisions).toHaveLength(2);
    expect(result.body.revisions[1].data.data.costLines[0].money.netCents).toBe(
      '100000',
    );
  });
  it('refuses destructive down with populated financial history', async () => {
    const q = db.createQueryRunner();
    await q.connect();
    try {
      await expect(
        new MaintenanceAnalysis1792281600000().down(q),
      ).rejects.toThrow('Refusing destructive rollback');
    } finally {
      await q.release();
    }
  });
});
