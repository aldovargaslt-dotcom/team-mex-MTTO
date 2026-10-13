import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { randomUUID } from 'crypto';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';

const SUP = { 'X-Role': 'SUPERVISOR', 'X-User-Id': 'compatibility-proof' };
const ADMIN = { 'X-Role': 'ADMIN_DIRECTIVO' };
describe('EWO039 catalog compatibility by type or specific unit', () => {
  let app: INestApplication<App>, server: App, family: string, typeA: string, typeB: string, unitA: string, unitA2: string, unitB: string;
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication(); configureApp(app); await app.init(); server = app.getHttpServer();
    const types = (await request(server).get('/unidades/tipos').set(SUP).expect(200)).body;
    typeA = types[0].id; typeB = types[1].id;
    for (const [number, type] of [['COMP-A', typeA], ['COMP-A2', typeA], ['COMP-B', typeB]]) {
      const result = await request(server).post('/unidades').set(ADMIN).send({ numeroInterno: number, placas: number, tipoId: type }).expect(201);
      if (number === 'COMP-A') unitA = result.body.id;
      if (number === 'COMP-A2') unitA2 = result.body.id;
      if (number === 'COMP-B') unitB = result.body.id;
    }
    family = (await request(server).get('/inventario/familias').set(SUP).expect(200)).body[0].id;
  }, 60000);
  afterAll(async () => { if (app) await app.close(); });
  const create = (sku: string, choices: object) => request(server).post('/inventario/items').set(SUP).send({ sku, nombre: sku, familiaId: family, ...choices });
  const matches = async (unidadId: string) => (await request(server).get('/inventario/skus').query({ unidadId }).set(SUP).expect(200)).body.map((i: { sku: string }) => i.sku);
  it('UNIT01/03 union matches only selected units plus all units of selected types, deduplicated', async () => {
    await create('COMP-TYPE', { tipoVehiculoIds: [typeA] }).expect(201);
    const unit = await create('COMP-UNIT', { unidadIds: [unitA, unitA] }).expect(201);
    expect(unit.body.unidadIds).toEqual([unitA]); expect(unit.body.tipoVehiculoIds).toEqual([]);
    await create('COMP-BOTH', { tipoVehiculoIds: [typeB], unidadIds: [unitA, unitB] }).expect(201);
    expect(await matches(unitA)).toEqual(expect.arrayContaining(['COMP-TYPE', 'COMP-UNIT', 'COMP-BOTH']));
    expect(await matches(unitA2)).toContain('COMP-TYPE'); expect(await matches(unitA2)).not.toContain('COMP-UNIT'); expect(await matches(unitA2)).not.toContain('COMP-BOTH');
    expect((await matches(unitB)).filter((sku: string) => sku === 'COMP-BOTH')).toHaveLength(1);
  });
  it('UNIT02 invalid references leave no item or partial update', async () => {
    await create('COMP-INVALID', { unidadIds: [randomUUID()] }).expect(404);
    await create('COMP-MALFORMED', { unidadIds: ['invalid'] }).expect(400);
    const created = await create('COMP-EDIT', { tipoVehiculoIds: [typeA], unidadIds: [unitA] }).expect(201);
    await request(server).patch(`/inventario/items/${created.body.id}`).set(SUP).send({ nombre: 'Must not persist', tipoVehiculoIds: [typeB], unidadIds: [randomUUID()] }).expect(404);
    const read = (await request(server).get(`/inventario/items/${created.body.id}`).set(SUP).expect(200)).body;
    expect(read.nombre).toBe('COMP-EDIT'); expect(read.tipoVehiculoIds).toEqual([typeA]); expect(read.unidadIds).toEqual([unitA]);
    const items = (await request(server).get('/inventario/items').set(SUP).expect(200)).body;
    expect(items.some((i: { sku: string }) => i.sku === 'COMP-INVALID')).toBe(false);
  });
  it('UNIT01/04 read/update/clear unit selections preserve legacy type matching and reject a wrong type', async () => {
    const created = await create('COMP-UPDATE', { tipoVehiculoIds: [typeA], unidadIds: [unitA] }).expect(201);
    await request(server).patch(`/inventario/items/${created.body.id}`).set(SUP).send({ unidadIds: [unitB] }).expect(200);
    expect(await matches(unitB)).toContain('COMP-UPDATE');
    const renamed = await request(server).patch(`/inventario/items/${created.body.id}`).set(SUP).send({ nombre: 'Edited label' }).expect(200);
    expect(renamed.body.unidadIds).toEqual([unitB]);
    await request(server).patch(`/inventario/items/${created.body.id}`).set(SUP).send({ unidadIds: [] }).expect(200);
    expect(await matches(unitB)).not.toContain('COMP-UPDATE'); expect(await matches(unitA)).toContain('COMP-UPDATE');
    const legacy = await request(server).get('/inventario/skus').query({ tipoVehiculoId: typeA }).set(SUP).expect(200);
    expect(legacy.body.some((i: { sku: string }) => i.sku === 'COMP-UPDATE')).toBe(true);
    await request(server).get('/inventario/skus').query({ unidadId: unitA, tipoVehiculoId: typeB }).set(SUP).expect(400);
    await request(server).get('/inventario/skus').set(SUP).expect(400);
  });
  it('UNIT03 explicit unit selection follows identity after a type change', async () => {
    await create('COMP-IDENTITY', { unidadIds: [unitA] }).expect(201);
    await request(server).patch(`/unidades/${unitA}`).set(ADMIN).send({ tipoId: typeB }).expect(200);
    expect(await matches(unitA)).toContain('COMP-IDENTITY');
    expect(await matches(unitA)).not.toContain('COMP-TYPE');
    expect(await matches(unitA2)).not.toContain('COMP-IDENTITY');
  });

});
