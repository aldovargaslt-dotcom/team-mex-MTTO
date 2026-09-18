import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { MotivoInactivacion } from '../src/common/motivo-inactivacion.enum';
import {
  UNIDAD_ANDON_DEMO,
  UNIDAD_SEGUNDA_DEMO,
} from '../src/seed/catalogo-demo';

const SUPERVISOR = { 'X-Role': 'SUPERVISOR', 'X-User-Id': 'sup-1' };
const ADMIN = { 'X-Role': 'ADMIN_DIRECTIVO', 'X-User-Id': 'adm-1' };
const LOGISTICA = { 'X-Role': 'LOGISTICA', 'X-User-Id': 'log-1' };
const FIRMA =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('Flota v0 (e2e)', () => {
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

  async function unidad(numeroInterno: string) {
    const res = await request(server)
      .get('/unidades')
      .query({ numeroInterno })
      .set(LOGISTICA)
      .expect(200);
    const found = (res.body as { id: string; numeroInterno: string }[]).find(
      (u) => u.numeroInterno === numeroInterno,
    );
    if (!found) throw new Error(`No se sembró ${numeroInterno}`);
    return found;
  }

  it('LOGISTICA lee catálogo y flota; no entra a inventario ni Andon', async () => {
    await request(server).get('/unidades').set(LOGISTICA).expect(200);
    await request(server).get('/choferes').set(LOGISTICA).expect(200);
    await request(server).get('/unidades/tipos').set(LOGISTICA).expect(200);
    await request(server).get('/flota/tablero').set(LOGISTICA).expect(200);
    const inv = await request(server)
      .get('/inventario/stock')
      .set(LOGISTICA)
      .expect(403);
    expect(inv.body.message).toMatch(/Logística/i);
    await request(server).get('/andon/avisos').set(LOGISTICA).expect(403);
    await request(server).get('/notifications/badge').set(LOGISTICA).expect(403);
    await request(server).post('/unidades').set(LOGISTICA).send({}).expect(403);
    await request(server).post('/choferes').set(LOGISTICA).send({}).expect(403);
    const u101 = await unidad(UNIDAD_ANDON_DEMO);
    await request(server)
      .post(`/unidades/${u101.id}/visitas`)
      .set(LOGISTICA)
      .expect(403);
  });

  it('supervisor no entra a /flota', async () => {
    const res = await request(server)
      .get('/flota/tablero')
      .set(SUPERVISOR)
      .expect(403);
    expect(res.body.message).toMatch(/supervisor/i);
  });

  it('siembra Patio/Taller; LOGISTICA registra salida/entrada y envío especial', async () => {
    const sitios = await request(server)
      .get('/flota/sitios')
      .set(LOGISTICA)
      .expect(200);
    const patio = (sitios.body as { id: string; nombre: string }[]).find(
      (s) => s.nombre === 'Patio',
    );
    expect(patio).toBeTruthy();

    const choferes = await request(server)
      .get('/choferes')
      .query({ estado: 'ACTIVO' })
      .set(LOGISTICA)
      .expect(200);
    const chofer = (choferes.body as { id: string }[])[0];
    const u102 = await unidad(UNIDAD_SEGUNDA_DEMO);

    const occurredSalida = new Date(Date.now() - 2 * 3600_000).toISOString();
    const salida = await request(server)
      .post('/flota/movimientos')
      .set(LOGISTICA)
      .send({
        tipo: 'SALIDA',
        unidadId: u102.id,
        choferId: chofer.id,
        sitioId: patio!.id,
        occurredAt: occurredSalida,
        km: 500,
        notas: 'Cliente Norte',
        firmas: [
          { tipo: 'CHOFER', dataUrl: FIRMA },
          { tipo: 'AVAL', dataUrl: FIRMA },
        ],
      })
      .expect(201);
    expect(salida.body.movimiento.tipo).toBe('SALIDA');
    expect(salida.body.movimiento.createdBy).toBe('log-1');
    expect(salida.body.movimiento.avalRol).toBe('LOGISTICA');

    const tablero = await request(server)
      .get('/flota/tablero')
      .query({ fuera: '1' })
      .set(ADMIN)
      .expect(200);
    const filaFuera = (
      tablero.body as {
        numeroInterno: string;
        salidaAbiertaId: string | null;
        ultimoMovimientoAt: string | null;
      }[]
    ).find((r) => r.numeroInterno === UNIDAD_SEGUNDA_DEMO);
    expect(filaFuera?.salidaAbiertaId).toBeTruthy();
    expect(filaFuera?.ultimoMovimientoAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    const occurredEntrada = new Date(Date.now() - 30 * 60_000).toISOString();
    await request(server)
      .post('/flota/movimientos')
      .set(ADMIN)
      .send({
        tipo: 'ENTRADA',
        unidadId: u102.id,
        choferId: chofer.id,
        sitioId: patio!.id,
        occurredAt: occurredEntrada,
        km: 560,
        firmas: [
          { tipo: 'CHOFER', dataUrl: FIRMA },
          { tipo: 'AVAL', dataUrl: FIRMA },
        ],
      })
      .expect(201);

    const tableroCerrado = await request(server)
      .get('/flota/tablero')
      .set(LOGISTICA)
      .expect(200);
    const filaCerrada = (
      tableroCerrado.body as {
        numeroInterno: string;
        salidaAbiertaId: string | null;
        ultimoMovimientoAt: string | null;
        sitioNombre: string | null;
      }[]
    ).find((r) => r.numeroInterno === UNIDAD_SEGUNDA_DEMO);
    expect(filaCerrada?.salidaAbiertaId).toBeFalsy();
    expect(filaCerrada?.ultimoMovimientoAt).toBe(occurredEntrada);
    expect(filaCerrada?.sitioNombre).toBe('Patio');

    const u103 = await unidad('RAM CODISA');
    const especial = await request(server)
      .post(`/flota/unidades/${u103.id}/envio-especial`)
      .set(LOGISTICA)
      .expect(201);
    expect(especial.body.estado).toBe('INACTIVA');
    expect(especial.body.motivoInactivacion).toBe(
      MotivoInactivacion.ENVIO_ESPECIAL,
    );

    const hub = await request(server)
      .get(`/unidades/${u103.id}/hub`)
      .set(SUPERVISOR)
      .expect(200);
    expect(hub.body.fichaCorta.motivoInactivacion).toBe(
      MotivoInactivacion.ENVIO_ESPECIAL,
    );
    expect(hub.body.mensajes[0]).toMatch(/envío especial/i);

    const reactivada = await request(server)
      .post(`/flota/unidades/${u103.id}/reactivar`)
      .set(LOGISTICA)
      .expect(201);
    expect(reactivada.body.estado).toBe('ACTIVA');
    expect(reactivada.body.motivoInactivacion).toBeNull();

    await request(server)
      .post(`/flota/unidades/${u103.id}/envio-especial`)
      .set(LOGISTICA)
      .expect(201);
  });

  it('firma que no es PNG/JPEG no persiste; aviso Andon en SALIDA no bloquea', async () => {
    const sitios = await request(server)
      .get('/flota/sitios')
      .set(LOGISTICA)
      .expect(200);
    const taller = (sitios.body as { id: string; nombre: string }[]).find(
      (s) => s.nombre === 'Taller',
    );
    const choferes = await request(server)
      .get('/choferes')
      .query({ estado: 'ACTIVO' })
      .set(LOGISTICA)
      .expect(200);
    const chofer = (choferes.body as { id: string }[])[1] ?? (choferes.body as { id: string }[])[0];
    const u101 = await unidad(UNIDAD_ANDON_DEMO);
    const gif =
      'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

    const bad = await request(server)
      .post('/flota/movimientos')
      .set(LOGISTICA)
      .send({
        tipo: 'SALIDA',
        unidadId: u101.id,
        choferId: chofer.id,
        sitioId: taller!.id,
        occurredAt: new Date(Date.now() - 3600_000).toISOString(),
        km: 120,
        firmas: [
          { tipo: 'CHOFER', dataUrl: gif },
          { tipo: 'AVAL', dataUrl: FIRMA },
        ],
      })
      .expect(400);
    expect(bad.body.message).toMatch(/PNG o JPEG/i);

    const salida = await request(server)
      .post('/flota/movimientos')
      .set(LOGISTICA)
      .send({
        tipo: 'SALIDA',
        unidadId: u101.id,
        choferId: chofer.id,
        sitioId: taller!.id,
        occurredAt: new Date(Date.now() - 3600_000).toISOString(),
        km: 120,
        firmas: [
          { tipo: 'CHOFER', dataUrl: FIRMA },
          { tipo: 'AVAL', dataUrl: FIRMA },
        ],
      })
      .expect(201);
    expect(salida.body.avisos.some((a: string) => /alerta abierta/i.test(a))).toBe(
      true,
    );

    await request(server)
      .post('/flota/movimientos')
      .set(LOGISTICA)
      .send({
        tipo: 'ENTRADA',
        unidadId: u101.id,
        choferId: chofer.id,
        sitioId: taller!.id,
        occurredAt: new Date(Date.now() - 60_000).toISOString(),
        km: 130,
        firmas: [
          { tipo: 'CHOFER', dataUrl: FIRMA },
          { tipo: 'AVAL', dataUrl: FIRMA },
        ],
      })
      .expect(201);
  });
});
