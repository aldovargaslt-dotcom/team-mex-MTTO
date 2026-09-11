import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { assertVisitaCerradaOutbox } from './assert-visita-cerrada-outbox';

const SUPERVISOR = { 'X-Role': 'SUPERVISOR', 'X-User-Id': 'sup-1' };
const ADMIN = { 'X-Role': 'ADMIN_DIRECTIVO', 'X-User-Id': 'adm-1' };
const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('Slice 2 visitas y choferes (e2e)', () => {
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
    const found = (res.body as {
      numeroInterno: string;
      id: string;
      tipo: { id: string };
    }[]).find((u) => u.numeroInterno === numeroInterno);
    if (!found) {
      throw new Error(`No se sembró ${numeroInterno}`);
    }
    return found;
  }

  async function choferPorNombre(nombre: string) {
    const res = await request(server).get('/choferes').set(SUPERVISOR).expect(200);
    const found = (res.body as { id: string; nombre: string }[]).find(
      (c) => c.nombre === nombre,
    );
    if (!found) {
      throw new Error(`No se sembró chofer ${nombre}`);
    }
    return found;
  }

  it('admin CRUD de choferes: trim, vacío 400 y duplicado 409', async () => {
    const created = await request(server)
      .post('/choferes')
      .set(ADMIN)
      .send({ nombre: '  Ana Soto  ' })
      .expect(201);
    expect(created.body.nombre).toBe('Ana Soto');

    const vacio = await request(server)
      .post('/choferes')
      .set(ADMIN)
      .send({ nombre: '   ' })
      .expect(400);
    expect(vacio.body.message).toMatch(/nombre|vacío/i);

    const dup = await request(server)
      .post('/choferes')
      .set(ADMIN)
      .send({ nombre: 'Ana Soto' })
      .expect(409);
    expect(dup.body.message).toMatch(/chofer/i);

    const updated = await request(server)
      .patch(`/choferes/${created.body.id}`)
      .set(ADMIN)
      .send({ nombre: 'Ana Soto R.' })
      .expect(200);
    expect(updated.body.nombre).toBe('Ana Soto R.');

    await request(server)
      .delete(`/choferes/${created.body.id}`)
      .set(ADMIN)
      .expect(200);
  });

  it('supervisor no puede escribir choferes (403)', async () => {
    const crear = await request(server)
      .post('/choferes')
      .set(SUPERVISOR)
      .send({ nombre: 'Pedro Extra' })
      .expect(403);
    expect(crear.body.message).toMatch(/supervisor/i);
  });

  it('sin choferes el hub avisa y el wizard no tiene catálogo', async () => {
    const list = await request(server).get('/choferes').set(ADMIN).expect(200);
    const ids = (list.body as { id: string }[]).map((c) => c.id);
    for (const id of ids) {
      await request(server).delete(`/choferes/${id}`).set(ADMIN).expect(200);
    }

    const u101 = await unidadPorNumero('U-101');
    const hub = await request(server)
      .get(`/unidades/${u101.id}/hub`)
      .set(SUPERVISOR)
      .expect(200);
    expect(hub.body.puedeCrearVisita).toBe(true);
    expect(hub.body.mensajes).toContain(
      'No hay choferes. Pide alta a administración.',
    );

    await request(server)
      .post('/choferes')
      .set(ADMIN)
      .send({ nombre: 'Juan Pérez' })
      .expect(201);
    await request(server)
      .post('/choferes')
      .set(ADMIN)
      .send({ nombre: 'María López' })
      .expect(201);
    await request(server)
      .post('/choferes')
      .set(ADMIN)
      .send({ nombre: 'Carlos Ruiz' })
      .expect(201);
  });

  it('admin no puede crear ni cerrar visitas', async () => {
    const u101 = await unidadPorNumero('U-101');
    const crear = await request(server)
      .post(`/unidades/${u101.id}/visitas`)
      .set(ADMIN)
      .expect(403);
    expect(crear.body.message).toMatch(/administrador/i);

    const draft = await request(server)
      .post(`/unidades/${u101.id}/visitas`)
      .set(SUPERVISOR)
      .expect(201);

    const cerrar = await request(server)
      .post(`/visitas/${draft.body.id}/cerrar`)
      .set(ADMIN)
      .expect(403);
    expect(cerrar.body.message).toMatch(/administrador/i);

    await request(server).delete(`/visitas/${draft.body.id}`).set(SUPERVISOR);
  });

  it('admin hub oculta borradores y nunca puedeCrearVisita', async () => {
    const u101 = await unidadPorNumero('U-101');
    const draft = await request(server)
      .post(`/unidades/${u101.id}/visitas`)
      .set(SUPERVISOR)
      .expect(201);

    const hubAdmin = await request(server)
      .get(`/unidades/${u101.id}/hub`)
      .set(ADMIN)
      .expect(200);
    expect(hubAdmin.body.puedeCrearVisita).toBe(false);
    expect(hubAdmin.body.borradores).toEqual([]);
    expect(hubAdmin.body.mensajes[0]).toMatch(/administrador/i);

    const hubSup = await request(server)
      .get(`/unidades/${u101.id}/hub`)
      .set(SUPERVISOR)
      .expect(200);
    expect(hubSup.body.borradores.some((v: { id: string }) => v.id === draft.body.id)).toBe(
      true,
    );

    await request(server).delete(`/visitas/${draft.body.id}`).set(SUPERVISOR);
  });

  it('no crea visita en unidad inactiva', async () => {
    const u103 = await unidadPorNumero('U-103');
    const res = await request(server)
      .post(`/unidades/${u103.id}/visitas`)
      .set(SUPERVISOR)
      .expect(400);
    expect(res.body.message).toMatch(/inactiva/i);
  });

  it('rechaza km menor al último cerrado incluso en borrador y chofer inexistente', async () => {
    const u101 = await unidadPorNumero('U-101');
    const chofer = await choferPorNombre('Juan Pérez');
    const draft = await request(server)
      .post(`/unidades/${u101.id}/visitas`)
      .set(SUPERVISOR)
      .expect(201);

    const kmNeg = await request(server)
      .patch(`/visitas/${draft.body.id}`)
      .set(SUPERVISOR)
      .send({ km: -1 })
      .expect(400);
    expect(kmNeg.body.message).toMatch(/kilometraje|mayor o igual/i);

    const fakeChofer = await request(server)
      .patch(`/visitas/${draft.body.id}`)
      .set(SUPERVISOR)
      .send({ choferId: '11111111-1111-4111-8111-111111111111' })
      .expect(404);
    expect(fakeChofer.body.message).toMatch(/chofer/i);

    await request(server)
      .patch(`/visitas/${draft.body.id}`)
      .set(SUPERVISOR)
      .send({
        choferId: chofer.id,
        km: 1000,
        tipo: 'PREDICTIVO',
        trabajos: [{ categoria: 'A', item: 'Kit de tiempo / distribución' }],
        firmas: [
          { tipo: 'CHOFER', dataUrl: PNG },
          { tipo: 'JEFE', dataUrl: PNG },
        ],
      })
      .expect(200);

    await request(server)
      .post(`/visitas/${draft.body.id}/cerrar`)
      .set(SUPERVISOR)
      .expect(200);

    const segundo = await request(server)
      .post(`/unidades/${u101.id}/visitas`)
      .set(SUPERVISOR)
      .expect(201);
    const kmBajo = await request(server)
      .patch(`/visitas/${segundo.body.id}`)
      .set(SUPERVISOR)
      .send({ km: 999 })
      .expect(400);
    expect(kmBajo.body.message).toMatch(/último km cerrado/i);

    await request(server).delete(`/visitas/${segundo.body.id}`).set(SUPERVISOR);
  });

  it('cierra solo con las 6 reglas y actualiza último km; permite varios borradores', async () => {
    const u102 = await unidadPorNumero('U-102');
    const chofer = await choferPorNombre('María López');
    const a = await request(server)
      .post(`/unidades/${u102.id}/visitas`)
      .set(SUPERVISOR)
      .expect(201);
    const b = await request(server)
      .post(`/unidades/${u102.id}/visitas`)
      .set(SUPERVISOR)
      .expect(201);
    expect(a.body.id).not.toBe(b.body.id);

    const cerrarVacio = await request(server)
      .post(`/visitas/${a.body.id}/cerrar`)
      .set(SUPERVISOR)
      .expect(400);
    expect(cerrarVacio.body.message).toMatch(/chofer|kilometraje|tipo|trabajo|firmas/i);

    await request(server)
      .patch(`/visitas/${a.body.id}`)
      .set(SUPERVISOR)
      .send({ choferId: chofer.id, km: 250, tipo: 'CORRECTIVO' })
      .expect(200);

    const sinTrabajo = await request(server)
      .post(`/visitas/${a.body.id}/cerrar`)
      .set(SUPERVISOR)
      .expect(400);
    expect(sinTrabajo.body.message).toMatch(/trabajo/i);

    await request(server)
      .patch(`/visitas/${a.body.id}`)
      .set(SUPERVISOR)
      .send({
        trabajos: [
          { categoria: 'A', item: 'Bomba de agua y refrigerante' },
          { categoria: 'E', item: 'Carrocería e interiores' },
        ],
        observaciones: 'Cambio de kit y revisión de cabina',
        fotos: [{ dataUrl: PNG }],
      })
      .expect(200);

    const sinFirmas = await request(server)
      .post(`/visitas/${a.body.id}/cerrar`)
      .set(SUPERVISOR)
      .expect(400);
    expect(sinFirmas.body.message).toMatch(/firmas/i);

    await request(server)
      .patch(`/visitas/${a.body.id}`)
      .set(SUPERVISOR)
      .send({
        firmas: [
          { tipo: 'CHOFER', dataUrl: PNG },
          { tipo: 'JEFE', dataUrl: PNG },
        ],
      })
      .expect(200);

    const cerrado = await request(server)
      .post(`/visitas/${a.body.id}/cerrar`)
      .set(SUPERVISOR)
      .expect(200);
    expect(cerrado.body.estado).toBe('CERRADO');
    expect(cerrado.body.trabajos).toHaveLength(2);
    expect(cerrado.body.fotos).toHaveLength(1);

    await assertVisitaCerradaOutbox(app, {
      visitaId: a.body.id,
      unidadId: u102.id,
      tipoVehiculoId: u102.tipo.id,
      km: 250,
      consumos: [],
    });

    const hub = await request(server)
      .get(`/unidades/${u102.id}/hub`)
      .set(SUPERVISOR)
      .expect(200);
    expect(hub.body.fichaCorta.ultimoKm).toBe(250);
    expect(hub.body.historialCerrado[0].id).toBe(a.body.id);
    expect(hub.body.borradores.some((v: { id: string }) => v.id === b.body.id)).toBe(
      true,
    );

    const noEditar = await request(server)
      .patch(`/visitas/${a.body.id}`)
      .set(SUPERVISOR)
      .send({ km: 300 })
      .expect(400);
    expect(noEditar.body.message).toMatch(/cerrada/i);

    await request(server).delete(`/visitas/${b.body.id}`).set(SUPERVISOR).expect(200);

    const hubAdmin = await request(server)
      .get(`/unidades/${u102.id}/hub`)
      .set(ADMIN)
      .expect(200);
    expect(hubAdmin.body.historialCerrado[0].km).toBe(250);
    expect(hubAdmin.body.borradores).toEqual([]);
    expect(hubAdmin.body.puedeCrearVisita).toBe(false);

    const detalleAdmin = await request(server)
      .get(`/visitas/${a.body.id}`)
      .set(ADMIN)
      .expect(200);
    expect(detalleAdmin.body.estado).toBe('CERRADO');
  });

  it('rechaza trabajo fuera del catálogo A–E', async () => {
    const u101 = await unidadPorNumero('U-101');
    const draft = await request(server)
      .post(`/unidades/${u101.id}/visitas`)
      .set(SUPERVISOR)
      .expect(201);
    const res = await request(server)
      .patch(`/visitas/${draft.body.id}`)
      .set(SUPERVISOR)
      .send({ trabajos: [{ categoria: 'A', item: 'Cambio de clutch' }] })
      .expect(400);
    expect(res.body.message).toMatch(/categoría/i);
    await request(server).delete(`/visitas/${draft.body.id}`).set(SUPERVISOR);
  });

  it('GET /catalogo/trabajos es el brief: 5 categorías y 11 ítems', async () => {
    const res = await request(server)
      .get('/catalogo/trabajos')
      .set(SUPERVISOR)
      .expect(200);
    const cats = res.body as { categoria: string; nombre: string; items: string[] }[];
    expect(cats).toHaveLength(5);
    expect(cats.flatMap((c) => c.items)).toHaveLength(11);
    expect(cats.map((c) => c.nombre)).toEqual([
      'Motor y sistema de distribución / auxiliares',
      'Sistema de frenos',
      'Suspensión y dirección',
      'Llantas y neumáticos',
      'Carrocería, luces e interiores',
    ]);
    expect(cats.map((c) => c.items)).toEqual([
      [
        'Kit de tiempo / distribución',
        'Bomba de agua y refrigerante',
        'Afinación / filtros de aceite',
        'Bandas de accesorios / poleas',
      ],
      ['Balatas delanteras / traseras', 'Discos y líquido de frenos'],
      ['Amortiguadores y bujes', 'Alineación y balanceo'],
      ['Calibración y rotación'],
      ['Sistema eléctrico y luces', 'Carrocería e interiores'],
    ]);
    expect(JSON.stringify(cats)).not.toMatch(/combustible/i);
  });
});
