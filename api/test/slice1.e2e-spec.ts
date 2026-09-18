import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { EstadoUnidad } from '../src/common/estado-unidad.enum';
import {
  PLACAS_ANDON_DEMO,
  TIPO_STOCK,
  UNIDAD_ANDON_DEMO,
  UNIDAD_SEGUNDA_DEMO,
  UNIDADES_DEMO,
} from '../src/seed/catalogo-demo';

const SUPERVISOR = { 'X-Role': 'SUPERVISOR', 'X-User-Id': 'sup-1' };
const ADMIN = { 'X-Role': 'ADMIN_DIRECTIVO', 'X-User-Id': 'adm-1' };

describe('Slice 1 (e2e)', () => {
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
    const found = (res.body as { numeroInterno: string; id: string }[]).find(
      (u) => u.numeroInterno === numeroInterno,
    );
    if (!found) {
      throw new Error(`No se sembró ${numeroInterno}`);
    }
    return found;
  }

  it('GET /health no exige rol', async () => {
    await request(server)
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok');
      });
  });

  it('Swagger está en /docs', async () => {
    await request(server).get('/docs').expect(200);
  });

  it('sin X-Role responde 401 en español', async () => {
    const res = await request(server).get('/unidades').expect(401);
    expect(res.body.message).toMatch(/X-Role/i);
  });

  it('rol inválido responde 401', async () => {
    const res = await request(server)
      .get('/unidades')
      .set({ 'X-Role': 'CHOFER' })
      .expect(401);
    expect(res.body.message).toMatch(/no es válido/i);
  });

  it('siembra 13 unidades ACTIVA del catálogo Aldo', async () => {
    const res = await request(server).get('/unidades').set(SUPERVISOR).expect(200);
    const unidades = res.body as {
      numeroInterno: string;
      estado: string;
    }[];
    const mapa = Object.fromEntries(
      unidades.map((u) => [u.numeroInterno, u.estado]),
    );
    expect(unidades).toHaveLength(UNIDADES_DEMO.length);
    expect(mapa[UNIDAD_ANDON_DEMO]).toBe(EstadoUnidad.ACTIVA);
    expect(mapa[UNIDAD_SEGUNDA_DEMO]).toBe(EstadoUnidad.ACTIVA);
    expect(mapa['CHATO NUEVO']).toBe(EstadoUnidad.ACTIVA);
  });

  it('filtra unidades por numeroInterno, placas y tipo', async () => {
    const porNumero = await request(server)
      .get('/unidades')
      .query({ numeroInterno: UNIDAD_ANDON_DEMO })
      .set(SUPERVISOR)
      .expect(200);
    expect(porNumero.body).toHaveLength(1);
    expect(porNumero.body[0].numeroInterno).toBe(UNIDAD_ANDON_DEMO);

    const porPlacas = await request(server)
      .get('/unidades')
      .query({ placas: '2632' })
      .set(SUPERVISOR)
      .expect(200);
    expect(porPlacas.body).toHaveLength(1);
    expect(porPlacas.body[0].placas).toContain('2632');

    const porTipo = await request(server)
      .get('/unidades')
      .query({ tipo: TIPO_STOCK })
      .set(ADMIN)
      .expect(200);
    expect(
      porTipo.body.some(
        (u: { numeroInterno: string }) => u.numeroInterno === 'URVAN',
      ),
    ).toBe(true);
  });

  it('filtra unidades por q (nombre) y estado INACTIVA', async () => {
    const porNombre = await request(server)
      .get('/unidades')
      .query({ q: 'REDILAS' })
      .set(SUPERVISOR)
      .expect(200);
    expect(porNombre.body).toHaveLength(1);
    expect(porNombre.body[0].numeroInterno).toBe(UNIDAD_SEGUNDA_DEMO);

    const porInterno = await request(server)
      .get('/unidades')
      .query({ q: UNIDAD_ANDON_DEMO })
      .set(SUPERVISOR)
      .expect(200);
    expect(porInterno.body).toHaveLength(1);
    expect(porInterno.body[0].numeroInterno).toBe(UNIDAD_ANDON_DEMO);

    const tipos = await request(server).get('/unidades/tipos').set(ADMIN);
    await request(server)
      .post('/unidades')
      .set(ADMIN)
      .send({
        numeroInterno: 'U-INACT-Q',
        placas: 'TEST-INACT-Q',
        tipoId: tipos.body[0].id,
        estado: EstadoUnidad.INACTIVA,
      })
      .expect(201);

    const inactivas = await request(server)
      .get('/unidades')
      .query({ estado: 'INACTIVA' })
      .set(SUPERVISOR)
      .expect(200);
    expect(
      (inactivas.body as { numeroInterno: string; estado: string }[]).every(
        (u) => u.estado === EstadoUnidad.INACTIVA,
      ),
    ).toBe(true);
    expect(
      (inactivas.body as { numeroInterno: string }[]).some(
        (u) => u.numeroInterno === UNIDAD_ANDON_DEMO,
      ),
    ).toBe(false);
    expect(
      (inactivas.body as { numeroInterno: string }[]).some(
        (u) => u.numeroInterno === 'U-INACT-Q',
      ),
    ).toBe(true);
  });

  it('supervisor no puede crear ni actualizar unidades (403)', async () => {
    const tipos = await request(server).get('/unidades/tipos').set(SUPERVISOR);
    const tipoId = tipos.body[0].id as string;
    const u101 = await unidadPorNumero(UNIDAD_ANDON_DEMO);

    const crear = await request(server)
      .post('/unidades')
      .set(SUPERVISOR)
      .send({
        numeroInterno: 'U-199',
        placas: 'TMX-199-Z',
        tipoId,
      })
      .expect(403);
    expect(crear.body.message).toMatch(/supervisor/i);

    const editar = await request(server)
      .patch(`/unidades/${u101.id}`)
      .set(SUPERVISOR)
      .send({ placas: 'XXX-000-X' })
      .expect(403);
    expect(editar.body.message).toMatch(/supervisor/i);
  });

  it('supervisor no puede escribir tipos de vehículo (403)', async () => {
    const res = await request(server)
      .post('/unidades/tipos')
      .set(SUPERVISOR)
      .send({ nombre: 'Motocicleta' })
      .expect(403);
    expect(res.body.message).toMatch(/supervisor/i);
  });

  it('admin CRUD de tipos de vehículo', async () => {
    const created = await request(server)
      .post('/unidades/tipos')
      .set(ADMIN)
      .send({ nombre: 'Plataforma', descripcion: 'Cama baja' })
      .expect(201);
    expect(created.body.nombre).toBe('Plataforma');

    const updated = await request(server)
      .patch(`/unidades/tipos/${created.body.id}`)
      .set(ADMIN)
      .send({ descripcion: 'Cama baja reforzada' })
      .expect(200);
    expect(updated.body.descripcion).toContain('reforzada');

    await request(server)
      .delete(`/unidades/tipos/${created.body.id}`)
      .set(ADMIN)
      .expect(200);
  });

  it('admin guarda icono de tipo (catálogo cerrado)', async () => {
    const created = await request(server)
      .post('/unidades/tipos')
      .set(ADMIN)
      .send({ nombre: 'Plataforma', icono: 'car' })
      .expect(201);
    expect(created.body.icono).toBe('car');

    const updated = await request(server)
      .patch(`/unidades/tipos/${created.body.id}`)
      .set(ADMIN)
      .send({ icono: 'bus' })
      .expect(200);
    expect(updated.body.icono).toBe('bus');

    const invalid = await request(server)
      .post('/unidades/tipos')
      .set(ADMIN)
      .send({ nombre: 'Motocicleta', icono: 'bike' })
      .expect(400);
    expect(String(invalid.body.message)).toMatch(/icono/i);

    await request(server)
      .delete(`/unidades/tipos/${created.body.id}`)
      .set(ADMIN)
      .expect(200);
  });

  it('admin crea y actualiza unidades', async () => {
    const tipos = await request(server).get('/unidades/tipos').set(ADMIN);
    const tipoId = tipos.body[0].id as string;

    const created = await request(server)
      .post('/unidades')
      .set(ADMIN)
      .send({
        numeroInterno: 'U-104',
        placas: 'TMX-104-D',
        tipoId,
        estado: EstadoUnidad.ACTIVA,
        marcaModelo: 'Isuzu NPR',
        anio: 2024,
      })
      .expect(201);
    expect(created.body.numeroInterno).toBe('U-104');
    expect(created.body.vin).toBeNull();
    expect(created.body.marcaModelo).toBe('Isuzu NPR');

    const updated = await request(server)
      .patch(`/unidades/${created.body.id}`)
      .set(ADMIN)
      .send({ estado: EstadoUnidad.INACTIVA, placas: 'tmx-104-e' })
      .expect(200);
    expect(updated.body.estado).toBe(EstadoUnidad.INACTIVA);
    expect(updated.body.placas).toBe('TMX-104-E');
  });

  it('409 en unicidad de número interno, placas y nombre de tipo', async () => {
    const tipos = await request(server).get('/unidades/tipos').set(ADMIN);
    const tipoId = tipos.body[0].id as string;

    const dupNumero = await request(server)
      .post('/unidades')
      .set(ADMIN)
      .send({
        numeroInterno: UNIDAD_ANDON_DEMO,
        placas: 'TMX-NEW-1',
        tipoId,
      })
      .expect(409);
    expect(dupNumero.body.message).toMatch(/número interno/i);

    const dupPlacas = await request(server)
      .post('/unidades')
      .set(ADMIN)
      .send({
        numeroInterno: 'U-198',
        placas: PLACAS_ANDON_DEMO,
        tipoId,
      })
      .expect(409);
    expect(dupPlacas.body.message).toMatch(/placas/i);

    const dupTipo = await request(server)
      .post('/unidades/tipos')
      .set(ADMIN)
      .send({ nombre: TIPO_STOCK })
      .expect(409);
    expect(dupTipo.body.message).toMatch(/tipo de vehículo/i);
  });

  it('hub FOTON supervisor: puedeCrearVisita true', async () => {
    const u101 = await unidadPorNumero(UNIDAD_ANDON_DEMO);
    const res = await request(server)
      .get(`/unidades/${u101.id}/hub`)
      .set(SUPERVISOR)
      .expect(200);
    expect(res.body.puedeCrearVisita).toBe(true);
    expect(res.body.fichaCorta.numeroInterno).toBe(UNIDAD_ANDON_DEMO);
    expect(res.body.fichaCorta.estado).toBe(EstadoUnidad.ACTIVA);
    expect(res.body.fichaCorta.vin).toBeNull();
    expect(res.body.fichaCorta.ultimoKm).toBe(100);
    expect(res.body.borradores).toEqual([]);
    expect(res.body.historialCerrado).toHaveLength(1);
    expect(res.body.historialCerrado[0].km).toBe(100);
    expect(res.body.historialCerrado[0].piezas).toEqual([]);
    expect(res.body.historialCerrado[0].trabajosCount).toBe(1);
    expect(res.body.historialCerrado[0].trabajos).toEqual([
      { categoria: 'A', item: 'Afinación / filtros de aceite' },
    ]);
    expect(res.body.mensajes[0]).toMatch(/visita/i);
    expect(res.body.mantenimiento).toBeUndefined();
  });

  it('hub unidad inactiva supervisor: bloqueado', async () => {
    const tipos = await request(server).get('/unidades/tipos').set(ADMIN);
    const created = await request(server)
      .post('/unidades')
      .set(ADMIN)
      .send({
        numeroInterno: 'U-INACT-H',
        placas: 'TEST-INACT-H',
        tipoId: tipos.body[0].id,
        estado: EstadoUnidad.INACTIVA,
      })
      .expect(201);
    const res = await request(server)
      .get(`/unidades/${created.body.id}/hub`)
      .set(SUPERVISOR)
      .expect(200);
    expect(res.body.puedeCrearVisita).toBe(false);
    expect(res.body.mensajes[0]).toMatch(/inactiva/i);
  });

  it('hub FOTON admin: puedeCrearVisita nunca true', async () => {
    const u101 = await unidadPorNumero(UNIDAD_ANDON_DEMO);
    const res = await request(server)
      .get(`/unidades/${u101.id}/hub`)
      .set(ADMIN)
      .expect(200);
    expect(res.body.puedeCrearVisita).toBe(false);
    expect(res.body.mensajes[0]).toMatch(/administrador directivo/i);
    expect(res.body.borradores).toEqual([]);
  });

  it('GET unidad inexistente 404 en español', async () => {
    const res = await request(server)
      .get('/unidades/11111111-1111-4111-8111-111111111111')
      .set(SUPERVISOR)
      .expect(404);
    expect(res.body.message).toMatch(/no se encontró la unidad/i);
  });

  it('VIN es opcional y único si se informa', async () => {
    const tipos = await request(server).get('/unidades/tipos').set(ADMIN);
    const tipoId = tipos.body[0].id as string;

    const sinVin = await request(server)
      .post('/unidades')
      .set(ADMIN)
      .send({
        numeroInterno: 'U-180',
        placas: 'TMX-180-A',
        tipoId,
      })
      .expect(201);
    expect(sinVin.body.vin).toBeNull();

    const otroSinVin = await request(server)
      .post('/unidades')
      .set(ADMIN)
      .send({
        numeroInterno: 'U-181',
        placas: 'TMX-181-A',
        tipoId,
        vin: '   ',
      })
      .expect(201);
    expect(otroSinVin.body.vin).toBeNull();

    await request(server)
      .post('/unidades')
      .set(ADMIN)
      .send({
        numeroInterno: 'U-182',
        placas: 'TMX-182-A',
        tipoId,
        vin: '3HSDZAPR5NN182182',
      })
      .expect(201);

    const dupVin = await request(server)
      .post('/unidades')
      .set(ADMIN)
      .send({
        numeroInterno: 'U-183',
        placas: 'TMX-183-A',
        tipoId,
        vin: '3HSDZAPR5NN182182',
      })
      .expect(409);
    expect(dupVin.body.message).toMatch(/vin/i);
  });

  it('rechaza número interno, placas y nombre de tipo solo con espacios', async () => {
    const tipos = await request(server).get('/unidades/tipos').set(ADMIN);
    const tipoId = tipos.body[0].id as string;
    const u101 = await unidadPorNumero(UNIDAD_ANDON_DEMO);

    const numeroVacio = await request(server)
      .post('/unidades')
      .set(ADMIN)
      .send({
        numeroInterno: '   ',
        placas: 'TMX-190-A',
        tipoId,
      })
      .expect(400);
    expect(numeroVacio.body.message).toMatch(/número interno|vacío|válidos/i);

    const placasVacias = await request(server)
      .post('/unidades')
      .set(ADMIN)
      .send({
        numeroInterno: 'U-191',
        placas: '\t  ',
        tipoId,
      })
      .expect(400);
    expect(placasVacias.body.message).toMatch(/placas|vacío|válidos/i);

    const patchNumero = await request(server)
      .patch(`/unidades/${u101.id}`)
      .set(ADMIN)
      .send({ numeroInterno: '  ' })
      .expect(400);
    expect(patchNumero.body.message).toMatch(/número interno|vacío|válidos/i);

    const tipoVacio = await request(server)
      .post('/unidades/tipos')
      .set(ADMIN)
      .send({ nombre: '   ' })
      .expect(400);
    expect(tipoVacio.body.message).toMatch(/nombre|vacío|válidos/i);
  });
});
