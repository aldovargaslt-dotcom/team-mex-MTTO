import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { EstadoChofer } from '../src/choferes/estado-chofer.enum';
import { EstadoUnidad } from '../src/common/estado-unidad.enum';
import {
  CHOFERES_DEMO,
  TIPOS_DEMO,
  UNIDADES_DEMO,
} from '../src/seed/catalogo-demo';
import { SeedService } from '../src/seed/seed.service';

const ADMIN = { 'X-Role': 'ADMIN_DIRECTIVO', 'X-User-Id': 'adm-seed' };
const LOGISTICA = { 'X-Role': 'LOGISTICA', 'X-User-Id': 'log-seed' };

describe('Catálogo demo Aldo (e2e)', () => {
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

  async function snapshot() {
    const [tipos, choferes, unidades] = await Promise.all([
      request(server).get('/unidades/tipos').set(ADMIN).expect(200),
      request(server).get('/choferes').set(ADMIN).expect(200),
      request(server).get('/unidades').set(ADMIN).expect(200),
    ]);
    return {
      tipos: tipos.body as { nombre: string }[],
      choferes: choferes.body as { nombre: string; estado: string }[],
      unidades: unidades.body as {
        numeroInterno: string;
        placas: string;
        estado: string;
        tipo: { nombre: string };
      }[],
    };
  }

  it('siembra 3 tipos, 7 choferes ACTIVO y 13 unidades exactas', async () => {
    const { tipos, choferes, unidades } = await snapshot();
    expect(tipos.map((t) => t.nombre).sort()).toEqual(
      [...TIPOS_DEMO.map((t) => t.nombre)].sort(),
    );
    expect(choferes).toHaveLength(CHOFERES_DEMO.length);
    expect(choferes.map((c) => c.nombre).sort()).toEqual(
      [...CHOFERES_DEMO].sort(),
    );
    expect(choferes.every((c) => c.estado === EstadoChofer.ACTIVO)).toBe(true);
    expect(unidades).toHaveLength(UNIDADES_DEMO.length);
    expect(unidades.every((u) => u.estado === EstadoUnidad.ACTIVA)).toBe(true);

    const byPlacas = Object.fromEntries(
      unidades.map((u) => [u.placas, u]),
    );
    for (const item of UNIDADES_DEMO) {
      const row = byPlacas[item.placas];
      expect(row).toBeTruthy();
      expect(row.numeroInterno).toBe(item.nombre);
      expect(row.tipo.nombre).toBe(item.tipoNombre);
    }
  });

  it('re-ejecutar seed no duplica tipos, choferes ni unidades', async () => {
    const before = await snapshot();
    const seed = app.get(SeedService);
    await seed.seed();
    await seed.seed();
    const after = await snapshot();

    expect(after.tipos).toHaveLength(before.tipos.length);
    expect(after.choferes).toHaveLength(before.choferes.length);
    expect(after.unidades).toHaveLength(before.unidades.length);

    const ds = app.get(DataSource);
    const [tipoCount, choferCount, unidadCount] = await Promise.all([
      ds.query(`SELECT count(*)::int AS n FROM tipos_vehiculo`),
      ds.query(`SELECT count(*)::int AS n FROM choferes`),
      ds.query(`SELECT count(*)::int AS n FROM unidades`),
    ]);
    expect(tipoCount[0].n).toBe(TIPOS_DEMO.length);
    expect(choferCount[0].n).toBe(CHOFERES_DEMO.length);
    expect(unidadCount[0].n).toBe(UNIDADES_DEMO.length);
  });

  it('proyecta chofer usual en flota sin inventar movimiento', async () => {
    const tablero = await request(server)
      .get('/flota/tablero')
      .set(LOGISTICA)
      .expect(200);
    const filas = tablero.body as {
      numeroInterno: string;
      choferUltimoNombre: string | null;
      choferActualNombre: string | null;
      salidaAbiertaId: string | null;
    }[];
    const mapped = UNIDADES_DEMO.filter((u) => u.choferNombre);
    expect(mapped.length).toBeGreaterThan(0);
    for (const item of mapped) {
      const fila = filas.find((r) => r.numeroInterno === item.nombre);
      expect(fila?.choferUltimoNombre).toBe(item.choferNombre);
      expect(fila?.choferActualNombre).toBeNull();
      expect(fila?.salidaAbiertaId).toBeNull();
    }
    const sinChofer = filas.find((r) => r.numeroInterno === 'FOTON');
    expect(sinChofer?.choferUltimoNombre).toBeNull();
  });
});
