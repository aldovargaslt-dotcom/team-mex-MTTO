import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';

const SUPERVISOR = { 'X-Role': 'SUPERVISOR', 'X-User-Id': 'sup-1' };

describe('Andon v0 (e2e)', () => {
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

  it('A1: aviso ABIERTO de U-101 tiene visita cerrada real (historial + último km)', async () => {
    const unidades = await request(server)
      .get('/unidades')
      .query({ numeroInterno: 'U-101' })
      .set(SUPERVISOR)
      .expect(200);
    const u101 = (
      unidades.body as { id: string; numeroInterno: string }[]
    ).find((u) => u.numeroInterno === 'U-101');
    expect(u101).toBeTruthy();

    const hub = await request(server)
      .get(`/unidades/${u101!.id}/hub`)
      .set(SUPERVISOR)
      .expect(200);
    expect(hub.body.fichaCorta.ultimoKm).toBe(100);
    expect(hub.body.historialCerrado.length).toBeGreaterThanOrEqual(1);

    const defaultList = await request(server)
      .get('/andon/avisos')
      .set(SUPERVISOR)
      .expect(200);
    const enDefault = (
      defaultList.body as { numeroInterno: string; estado: string }[]
    ).find((a) => a.numeroInterno === 'U-101');
    expect(enDefault).toBeTruthy();
    expect(enDefault!.estado).not.toBe('RESUELTO');

    const avisos = await request(server)
      .get('/andon/avisos')
      .query({ estado: 'ABIERTO' })
      .set(SUPERVISOR)
      .expect(200);
    const abierto = (
      avisos.body as {
        numeroInterno: string;
        estado: string;
        lastClosedKm: number | null;
        visitaResolutoriaId: string | null;
      }[]
    ).find((a) => a.numeroInterno === 'U-101');
    expect(abierto).toBeTruthy();
    expect(abierto!.estado).toBe('ABIERTO');
    expect(abierto!.lastClosedKm).toBe(100);
    expect(abierto!.visitaResolutoriaId).toBeNull();
  });
});
