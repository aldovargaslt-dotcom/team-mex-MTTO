import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { assertVisitaCerradaOutbox, countVisitaCerradaOutbox } from './assert-visita-cerrada-outbox';

const SUPERVISOR = { 'X-Role': 'SUPERVISOR', 'X-User-Id': 'sup-inv' };
const ADMIN = { 'X-Role': 'ADMIN_DIRECTIVO', 'X-User-Id': 'adm-inv' };
const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('Inventario v0 + piezas en visita (e2e)', () => {
  let app: INestApplication<App>;
  let server: App;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  async function unidadPorNumero(numeroInterno: string) {
    const res = await request(server)
      .get('/unidades')
      .query({ numeroInterno })
      .set(ADMIN)
      .expect(200);
    const found = (res.body as { numeroInterno: string; id: string; tipo: { id: string } }[]).find(
      (u) => u.numeroInterno === numeroInterno,
    );
    if (!found) throw new Error(`No se sembró ${numeroInterno}`);
    return found;
  }

  async function choferPorNombre(nombre: string) {
    const res = await request(server).get('/choferes').set(SUPERVISOR).expect(200);
    const found = (res.body as { id: string; nombre: string }[]).find(
      (c) => c.nombre === nombre,
    );
    if (!found) throw new Error(`No se sembró chofer ${nombre}`);
    return found;
  }

  async function itemPorSku(sku: string) {
    const res = await request(server).get('/inventario/items').set(SUPERVISOR).expect(200);
    const found = (res.body as { id: string; sku: string; stock: number }[]).find(
      (i) => i.sku === sku,
    );
    if (!found) throw new Error(`No se sembró SKU ${sku}`);
    return found;
  }

  async function tipoPorNombre(nombre: string) {
    const res = await request(server).get('/tipos-vehiculo').set(ADMIN).expect(200);
    const found = (res.body as { id: string; nombre: string }[]).find(
      (t) => t.nombre === nombre,
    );
    if (!found) throw new Error(`No se sembró tipo ${nombre}`);
    return found;
  }

  async function prepararCierre(visitaId: string, choferId: string, km: number) {
    await request(server)
      .patch(`/visitas/${visitaId}`)
      .set(SUPERVISOR)
      .send({
        choferId,
        km,
        tipo: 'PREDICTIVO',
        trabajos: [{ categoria: 'A', item: 'Afinación / filtros de aceite' }],
        firmas: [
          { tipo: 'CHOFER', dataUrl: PNG },
          { tipo: 'JEFE', dataUrl: PNG },
        ],
      })
      .expect(200);
  }

  it('supervisor y admin pueden catálogo y entrada; admin no crea visitas', async () => {
    const familia = await request(server)
      .post('/inventario/familias')
      .set(SUPERVISOR)
      .send({ nombre: '  Eléctrico  ' })
      .expect(201);
    expect(familia.body.nombre).toBe('Eléctrico');

    const adminFamilia = await request(server)
      .post('/inventario/familias')
      .set(ADMIN)
      .send({ nombre: 'Lubricantes' })
      .expect(201);
    expect(adminFamilia.body.nombre).toBe('Lubricantes');

    const camion = await tipoPorNombre('Camión');
    const item = await request(server)
      .post('/inventario/items')
      .set(ADMIN)
      .send({
        sku: 'FUS-10A',
        nombre: 'Fusible 10A',
        familiaId: familia.body.id,
        tipoVehiculoIds: [camion.id],
      })
      .expect(201);
    expect(item.body.sku).toBe('FUS-10A');
    expect(item.body.stock).toBe(0);
    expect(item.body.uom).toBe('pieza');

    const entrada = await request(server)
      .post('/inventario/movimientos/entrada')
      .set(SUPERVISOR)
      .send({ itemId: item.body.id, qty: 4, nota: 'Compra local' })
      .expect(201);
    expect(entrada.body.stock).toBe(4);

    const stock = await request(server).get('/inventario/stock').set(ADMIN).expect(200);
    const row = (stock.body as { sku: string; qty: number }[]).find((s) => s.sku === 'FUS-10A');
    expect(row?.qty).toBe(4);

    const u101 = await unidadPorNumero('U-101');
    const crear = await request(server)
      .post(`/unidades/${u101.id}/visitas`)
      .set(ADMIN)
      .expect(403);
    expect(crear.body.message).toMatch(/administrador/i);
  });

  it('entrada aumenta stock y SKUs se filtran por compatibilidad del tipo', async () => {
    const camion = await tipoPorNombre('Camión');
    const van = await tipoPorNombre('Van');
    const skusCamion = await request(server)
      .get('/inventario/skus')
      .query({ tipoVehiculoId: camion.id })
      .set(SUPERVISOR)
      .expect(200);
    const skus = skusCamion.body as { sku: string }[];
    expect(skus.map((s) => s.sku)).toEqual(
      expect.arrayContaining(['FIL-ACEITE-01', 'PAST-FR-01']),
    );
    expect(skus.map((s) => s.sku)).not.toContain('FIL-CAB-01');

    const skusVan = await request(server)
      .get('/inventario/skus')
      .query({ tipoVehiculoId: van.id, q: 'cabina' })
      .set(SUPERVISOR)
      .expect(200);
    expect(skusVan.body).toHaveLength(1);
    expect(skusVan.body[0].sku).toBe('FIL-CAB-01');
  });

  it('I1/I4 cierre DESDE_STOCK descuenta stock; pieza opaca sin sku/stock', async () => {
    const u101 = await unidadPorNumero('U-101');
    const chofer = await choferPorNombre('Juan Pérez');
    const filtro = await itemPorSku('FIL-ACEITE-01');
    const stockAntes = filtro.stock;

    const draft = await request(server)
      .post(`/unidades/${u101.id}/visitas`)
      .set(SUPERVISOR)
      .expect(201);

    await prepararCierre(draft.body.id, chofer.id, 1800);
    await request(server)
      .patch(`/visitas/${draft.body.id}`)
      .set(SUPERVISOR)
      .send({
        piezas: [
          { itemId: filtro.id, qty: 2, origen: 'DESDE_STOCK' },
        ],
      })
      .expect(200);

    const cerrado = await request(server)
      .post(`/visitas/${draft.body.id}/cerrar`)
      .set(SUPERVISOR)
      .expect(200);
    expect(cerrado.body.estado).toBe('CERRADO');
    expect(cerrado.body.piezas).toHaveLength(1);
    expect(cerrado.body.piezas[0].itemId).toBe(filtro.id);
    expect(cerrado.body.piezas[0].qty).toBe(2);
    expect(cerrado.body.piezas[0].origen).toBe('DESDE_STOCK');
    expect(cerrado.body.piezas[0]).not.toHaveProperty('sku');
    expect(cerrado.body.piezas[0]).not.toHaveProperty('stock');

    const despues = await itemPorSku('FIL-ACEITE-01');
    expect(despues.stock).toBe(stockAntes - 2);

    const movs = await request(server)
      .get('/inventario/movimientos')
      .set(SUPERVISOR)
      .expect(200);
    const salida = (movs.body as { tipo: string; sku: string; visitaId: string; delta: number }[])
      .find((m) => m.tipo === 'SALIDA_OT' && m.visitaId === draft.body.id);
    expect(salida?.sku).toBe('FIL-ACEITE-01');
    expect(salida?.delta).toBe(-2);

    await assertVisitaCerradaOutbox(app, {
      visitaId: draft.body.id,
      unidadId: u101.id,
      tipoVehiculoId: u101.tipo.id,
      km: 1800,
      consumos: [{ itemId: filtro.id, qty: 2, origen: 'DESDE_STOCK' }],
    });
  });

  it('I2/I3 stock insuficiente bloquea el cierre salvo COMPRA_EXTERNA (pendiente, sin movimiento)', async () => {
    const u101 = await unidadPorNumero('U-101');
    const chofer = await choferPorNombre('María López');
    const pastillas = await itemPorSku('PAST-FR-01');
    expect(pastillas.stock).toBeLessThan(50);

    const draft = await request(server)
      .post(`/unidades/${u101.id}/visitas`)
      .set(SUPERVISOR)
      .expect(201);
    await prepararCierre(draft.body.id, chofer.id, 1900);
    await request(server)
      .patch(`/visitas/${draft.body.id}`)
      .set(SUPERVISOR)
      .send({
        piezas: [
          { itemId: pastillas.id, qty: pastillas.stock + 5, origen: 'DESDE_STOCK' },
        ],
      })
      .expect(200);

    const bloqueado = await request(server)
      .post(`/visitas/${draft.body.id}/cerrar`)
      .set(SUPERVISOR)
      .expect(400);
    expect(bloqueado.body.message).toMatch(/stock insuficiente|compra externa/i);

    const sigueBorrador = await request(server)
      .get(`/visitas/${draft.body.id}`)
      .set(SUPERVISOR)
      .expect(200);
    expect(sigueBorrador.body.estado).toBe('BORRADOR');
    const stockIgual = await itemPorSku('PAST-FR-01');
    expect(stockIgual.stock).toBe(pastillas.stock);
    expect(await countVisitaCerradaOutbox(app, draft.body.id)).toBe(0);

    await request(server)
      .patch(`/visitas/${draft.body.id}`)
      .set(SUPERVISOR)
      .send({
        piezas: [
          { itemId: pastillas.id, qty: pastillas.stock + 5, origen: 'COMPRA_EXTERNA' },
        ],
      })
      .expect(200);

    const cerrado = await request(server)
      .post(`/visitas/${draft.body.id}/cerrar`)
      .set(SUPERVISOR)
      .expect(200);
    expect(cerrado.body.estado).toBe('CERRADO');

    await assertVisitaCerradaOutbox(app, {
      visitaId: draft.body.id,
      unidadId: u101.id,
      tipoVehiculoId: u101.tipo.id,
      km: 1900,
      consumos: [
        {
          itemId: pastillas.id,
          qty: pastillas.stock + 5,
          origen: 'COMPRA_EXTERNA',
        },
      ],
    });

    const stockTrasCompra = await itemPorSku('PAST-FR-01');
    expect(stockTrasCompra.stock).toBe(pastillas.stock);

    const pendientes = await request(server)
      .get('/inventario/pendientes-comprobante')
      .set(ADMIN)
      .expect(200);
    const pend = (pendientes.body as { id: string; visitaId: string; sku: string; estado: string }[]).find(
      (p) => p.visitaId === draft.body.id,
    );
    expect(pend).toBeTruthy();
    expect(pend?.sku).toBe('PAST-FR-01');
    expect(pend?.estado).toBe('PENDIENTE');

    const conTicket = await request(server)
      .post(`/inventario/pendientes-comprobante/${pend!.id}/ticket`)
      .set(SUPERVISOR)
      .send({ dataUrl: PNG })
      .expect(201);
    expect(conTicket.body.ticketDataUrl).toMatch(/^data:image\//);

    const recibida = await request(server)
      .post(`/inventario/pendientes-comprobante/${pend!.id}/recibir`)
      .set(ADMIN)
      .expect(201);
    expect(recibida.body.estado).toBe('RECIBIDA');

    const movs = await request(server).get('/inventario/movimientos').set(ADMIN).expect(200);
    expect(
      (movs.body as { visitaId: string; tipo: string }[]).some(
        (m) => m.visitaId === draft.body.id && m.tipo === 'SALIDA_OT',
      ),
    ).toBe(false);
  });

  it('ajuste no deja stock negativo y visita no guarda campos de stock', async () => {
    const item = await itemPorSku('FIL-CAB-01');
    const mal = await request(server)
      .post('/inventario/movimientos/ajuste')
      .set(ADMIN)
      .send({ itemId: item.id, qtyDelta: -(item.stock + 1) })
      .expect(400);
    expect(mal.body.message).toMatch(/negativo/i);

    const u101 = await unidadPorNumero('U-101');
    const draft = await request(server)
      .post(`/unidades/${u101.id}/visitas`)
      .set(SUPERVISOR)
      .expect(201);
    expect(draft.body.piezas).toEqual([]);
    expect(draft.body).not.toHaveProperty('stockQty');
    await request(server).delete(`/visitas/${draft.body.id}`).set(SUPERVISOR);
  });

  it('ADR-002: esquema inventario y sin FKs cruzadas con visitas', async () => {
    const ds = app.get(DataSource);
    const schemas = await ds.query(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'inventario'`,
    );
    expect(schemas).toHaveLength(1);

    const fks = (await ds.query(`
      SELECT
        src_ns.nspname AS src_schema,
        src_rel.relname AS src_table,
        dst_ns.nspname AS dst_schema,
        dst_rel.relname AS dst_table
      FROM pg_constraint con
      JOIN pg_class src_rel ON src_rel.oid = con.conrelid
      JOIN pg_namespace src_ns ON src_ns.oid = src_rel.relnamespace
      JOIN pg_class dst_rel ON dst_rel.oid = con.confrelid
      JOIN pg_namespace dst_ns ON dst_ns.oid = dst_rel.relnamespace
      WHERE con.contype = 'f'
    `)) as {
      src_schema: string;
      src_table: string;
      dst_schema: string;
      dst_table: string;
    }[];

    const cruzadas = fks.filter(
      (fk) =>
        (fk.src_schema === 'inventario' && fk.dst_schema !== 'inventario') ||
        (fk.dst_schema === 'inventario' && fk.src_schema !== 'inventario'),
    );
    expect(cruzadas).toEqual([]);

    const piezaItemFk = fks.find(
      (fk) => fk.src_table === 'visita_piezas' && fk.dst_table === 'items',
    );
    expect(piezaItemFk).toBeUndefined();
  });
});
