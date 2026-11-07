import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { AuthenticationPort, TrustedActor } from '../src/auth/trusted-actor';
import { Rol } from '../src/auth/roles.enum';
import {
  Facility,
  VehicleFacility,
} from '../src/visitas/checks/facility.entity';
import {
  SUCURSALES_SEED,
  UnitSucursales1792368000001,
} from '../src/db/migrations/1792368000001-UnitSucursales';

const base: TrustedActor = {
  subject: 'trusted|supervisor',
  displayName: 'Supervisor',
  roles: [Rol.SUPERVISOR],
  facilityScopes: ['norte'],
  authMode: 'TRUSTED',
  attributionLevel: 'SERVER_VERIFIED',
};
const actors: Record<string, TrustedActor> = {
  norte: base,
  sur: { ...base, subject: 'trusted|sur', facilityScopes: ['sur'] },
};

// EWO-067: a unit is created with its sucursal, so canonical orders work at once.
describe('EWO-067 sucursal de la unidad', () => {
  let app: INestApplication, db: DataSource, tipoId: string, driver: string;
  let n = 0;
  const http = () => request(app.getHttpServer());
  const ADMIN = { 'X-Role': 'ADMIN_DIRECTIVO' };
  const crearUnidad = (extra: Record<string, unknown> = {}) =>
    http()
      .post('/unidades')
      .set(ADMIN)
      .send({
        numeroInterno: `SUC-${++n}`,
        placas: `SUC-${n}`,
        tipoId,
        ...extra,
      });
  const orden = (unidadId: string, actor: 'norte' | 'sur') =>
    http()
      .post(`/unidades/${unidadId}/mantenimiento-ordenes`)
      .set('Authorization', `Bearer ${actor}`)
      .send({
        type: 'PREVENTIVE',
        choferId: driver,
        km: 10,
        blocksOperation: false,
      });

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(AuthenticationPort)
      .useValue({
        kind: 'TRUSTED',
        authenticate: async (req: { headers: Record<string, string> }) =>
          actors[req.headers.authorization?.replace('Bearer ', '')] ?? null,
      })
      .compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    db = app.get(DataSource);
    const facilities = db.getRepository(Facility);
    for (const [id, name] of [
      ['norte', 'Norte'],
      ['sur', 'Sur'],
    ])
      await facilities.save({
        id,
        name,
        timezone: 'America/Mexico_City',
        version: 1,
      });
    tipoId = (await db.query('SELECT id FROM tipos_vehiculo LIMIT 1'))[0].id;
    driver = (await db.query('SELECT id FROM choferes LIMIT 1'))[0].id;
  });
  afterAll(async () => {
    if (app) await app.close();
  });

  it('AC-1/AC-3: crea la unidad con su vínculo y se puede crear una orden (regresión del 422)', async () => {
    const created = await crearUnidad({ sucursalId: 'norte' }).expect(201);
    expect(created.body).toMatchObject({
      sucursalId: 'norte',
      sucursalNombre: 'Norte',
    });
    expect(
      await db
        .getRepository(VehicleFacility)
        .findOneBy({ unidadId: created.body.id }),
    ).toMatchObject({ facilityId: 'norte', version: 1 });
    await orden(created.body.id, 'norte').expect(201);
  });

  it('AC-2: sin sucursal o con sucursal desconocida responde 400 y no escribe la unidad', async () => {
    const before = Number((await db.query('SELECT count(*) c FROM unidades'))[0].c);
    await crearUnidad().expect(400);
    await crearUnidad({ sucursalId: '' }).expect(400);
    const desconocida = await crearUnidad({ sucursalId: 'no-existe' }).expect(400);
    expect(desconocida.body.message).toContain('sucursal');
    expect(
      Number((await db.query('SELECT count(*) c FROM unidades'))[0].c),
    ).toBe(before);
  });

  it('AC-4: personal de otra sucursal no puede operar la unidad', async () => {
    const created = await crearUnidad({ sucursalId: 'norte' }).expect(201);
    const denied = await orden(created.body.id, 'sur').expect(403);
    expect(denied.body.code).toBe('FACILITY_SCOPE_DENIED');
  });

  it('AC-5: solo ADMIN_DIRECTIVO puede cambiar la sucursal', async () => {
    const created = await crearUnidad({ sucursalId: 'norte' }).expect(201);
    await http()
      .patch(`/unidades/${created.body.id}`)
      .set({ 'X-Role': 'SUPERVISOR' })
      .send({ sucursalId: 'sur' })
      .expect(403);
    expect(
      (
        await db
          .getRepository(VehicleFacility)
          .findOneByOrFail({ unidadId: created.body.id })
      ).facilityId,
    ).toBe('norte');
  });

  it('AC-6: el administrador cambia la sucursal, sube la versión y cambia el acceso', async () => {
    const created = await crearUnidad({ sucursalId: 'norte' }).expect(201);
    const id = created.body.id;
    const patched = await http()
      .patch(`/unidades/${id}`)
      .set(ADMIN)
      .send({ sucursalId: 'sur' })
      .expect(200);
    expect(patched.body).toMatchObject({
      sucursalId: 'sur',
      sucursalNombre: 'Sur',
    });
    expect(
      await db.getRepository(VehicleFacility).findOneBy({ unidadId: id }),
    ).toMatchObject({ facilityId: 'sur', version: 2 });
    // Reenviar la misma sucursal no cambia nada.
    await http().patch(`/unidades/${id}`).set(ADMIN).send({ sucursalId: 'sur' }).expect(200);
    expect(
      (await db.getRepository(VehicleFacility).findOneByOrFail({ unidadId: id })).version,
    ).toBe(2);
    await orden(id, 'norte').expect(403);
    await orden(id, 'sur').expect(201);
    await http()
      .patch(`/unidades/${id}`)
      .set(ADMIN)
      .send({ sucursalId: 'no-existe' })
      .expect(400);
  });

  it('una unidad anterior al backfill (sin vínculo) recibe su vínculo al asignar sucursal', async () => {
    const created = await crearUnidad({ sucursalId: 'norte' }).expect(201);
    const id = created.body.id;
    await db.getRepository(VehicleFacility).delete({ unidadId: id });
    const sin = await http().get(`/unidades/${id}`).set(ADMIN).expect(200);
    expect(sin.body).toMatchObject({ sucursalId: null, sucursalNombre: null });
    await orden(id, 'norte').expect(422);
    await http().patch(`/unidades/${id}`).set(ADMIN).send({ sucursalId: 'norte' }).expect(200);
    expect(
      await db.getRepository(VehicleFacility).findOneBy({ unidadId: id }),
    ).toMatchObject({ facilityId: 'norte', version: 1 });
    await orden(id, 'norte').expect(201);
  });

  it('expone la sucursal en GET /unidades/:id y en la ficha del hub', async () => {
    const created = await crearUnidad({ sucursalId: 'sur' }).expect(201);
    const one = await http().get(`/unidades/${created.body.id}`).set(ADMIN).expect(200);
    expect(one.body).toMatchObject({ sucursalId: 'sur', sucursalNombre: 'Sur' });
    const hub = await http().get(`/unidades/${created.body.id}/hub`).set(ADMIN).expect(200);
    expect(hub.body.fichaCorta).toMatchObject({
      sucursalId: 'sur',
      sucursalNombre: 'Sur',
    });
  });

  it('el catálogo de sucursales es solo de administrador y va ordenado por nombre', async () => {
    const list = await http().get('/unidades/sucursales').set(ADMIN).expect(200);
    const names: string[] = list.body.map((s: { name: string }) => s.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    expect(list.body[0]).toEqual({ id: expect.any(String), name: expect.any(String) });
    await http().get('/unidades/sucursales').set({ 'X-Role': 'SUPERVISOR' }).expect(403);
  });

  it('AC-7: la migración siembra las 9 sucursales sin tocar monterrey y es idempotente', async () => {
    const monterrey = 'Monterrey (existente)';
    await db.getRepository(Facility).save({
      id: 'monterrey',
      name: monterrey,
      timezone: 'America/Mexico_City',
      version: 1,
    });
    const runner = db.createQueryRunner();
    try {
      await new UnitSucursales1792368000001().up(runner);
      const snapshot = () =>
        runner.query('SELECT id, name, timezone, version FROM facilities ORDER BY id');
      const first = await snapshot();
      await new UnitSucursales1792368000001().up(runner);
      expect(await snapshot()).toEqual(first);
      const ids = first.map((f: { id: string }) => f.id);
      for (const s of SUCURSALES_SEED) expect(ids).toContain(s.id);
      expect(SUCURSALES_SEED).toHaveLength(9);
      expect(first.find((f: { id: string }) => f.id === 'monterrey').name).toBe(monterrey);
      // down: se niega si alguna sucursal ya está en uso.
      const created = await crearUnidad({ sucursalId: 'saltillo' }).expect(201);
      await expect(new UnitSucursales1792368000001().down(runner)).rejects.toThrow(
        'FORWARD_RECOVERY_REQUIRED',
      );
      await db.getRepository(VehicleFacility).delete({ unidadId: created.body.id });
    } finally {
      await runner.release();
    }
  });
});
