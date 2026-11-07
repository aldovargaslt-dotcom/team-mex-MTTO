import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { ensureTestSucursal } from './fixtures/sucursal';

const SUPERVISOR = { 'X-Role': 'SUPERVISOR', 'X-User-Id': 'sup-1' };
const ADMIN = { 'X-Role': 'ADMIN_DIRECTIVO', 'X-User-Id': 'adm-1' };
const MECANICO = { 'X-Role': 'MECANICO', 'X-User-Id': 'mec-1' };

type Row = {
  id: string;
  estado: string;
  unidadId: string;
  numeroInterno: string;
};
type Page = { items: Row[]; nextCursor: string | null };

describe('ADR-031 orders queue read (e2e)', () => {
  let app: INestApplication<App>;
  let server: App;
  const drafts: string[] = [];

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    await ensureTestSucursal(app);
    server = app.getHttpServer();
    const units = (
      await request(server).get('/unidades').set(ADMIN).expect(200)
    ).body as { id: string }[];
    const chofer = (
      await request(server).get('/choferes').set(SUPERVISOR).expect(200)
    ).body[0] as { id: string };
    // One draft per unit (single-draft invariant); stop at 3 units.
    for (const unit of units.slice(0, 3)) {
      const res = await request(server)
        .post(`/unidades/${unit.id}/visitas`)
        .set(SUPERVISOR)
        .send({ choferId: chofer.id, km: 5000, tipo: 'PREDICTIVO' });
      if ([200, 201].includes(res.status))
        drafts.push(res.body.id ?? res.body.visita?.id);
    }
    expect(drafts.length).toBeGreaterThanOrEqual(2);
  });

  afterAll(async () => {
    await app.close();
  });

  const queue = (headers: Record<string, string>, query: object = {}) =>
    request(server).get('/ordenes').set(headers).query(query);

  it('supervisor sees drafts across units in one request, with unit data', async () => {
    const res = await queue(SUPERVISOR, { cola: 'borradores' }).expect(200);
    const body = res.body as Page;
    const ids = body.items.map((r) => r.id);
    for (const id of drafts) expect(ids).toContain(id);
    expect(body.items[0]).toEqual(
      expect.objectContaining({
        unidadId: expect.any(String),
        numeroInterno: expect.any(String),
        placas: expect.any(String),
        trabajosCount: expect.any(Number),
        estado: 'BORRADOR',
      }),
    );
  });

  it('admin only sees closed orders (same as per-unit listing)', async () => {
    const res = await queue(ADMIN).expect(200);
    for (const row of (res.body as Page).items)
      expect(row.estado).toBe('CERRADO');
    const none = await queue(ADMIN, { cola: 'borradores' }).expect(200);
    expect((none.body as Page).items).toEqual([]);
  });

  it('mechanic is rejected', async () => {
    await queue(MECANICO).expect(403);
  });

  it('paginates with a keyset cursor without repeats or gaps', async () => {
    const all = (
      (await queue(SUPERVISOR, { limit: 100 }).expect(200)).body as Page
    ).items.map((r) => r.id);
    const seen: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const page = (
        await queue(SUPERVISOR, {
          limit: 1,
          ...(cursor ? { cursor } : {}),
        }).expect(200)
      ).body as Page;
      seen.push(...page.items.map((r) => r.id));
      cursor = page.nextCursor;
      pages += 1;
    } while (cursor && pages < 200);
    expect(seen).toEqual(all);
    expect(new Set(seen).size).toBe(seen.length);
  });

  it('rejects a malformed cursor and filters by search', async () => {
    await queue(SUPERVISOR, { cursor: 'nope' }).expect(400);
    const first = (
      (await queue(SUPERVISOR, { cola: 'borradores' }).expect(200)).body as Page
    ).items[0];
    const found = (
      (await queue(SUPERVISOR, { q: first.numeroInterno }).expect(200))
        .body as Page
    ).items;
    expect(found.length).toBeGreaterThan(0);
    for (const row of found)
      expect(row.numeroInterno).toContain(first.numeroInterno);
    const miss = (
      (await queue(SUPERVISOR, { q: 'no-existe-xyz' }).expect(200)).body as Page
    ).items;
    expect(miss).toEqual([]);
  });

  it('summary counts match the filtered lists', async () => {
    const summary = (
      await request(server).get('/ordenes/resumen').set(SUPERVISOR).expect(200)
    ).body as { abiertas: number; borradores: number; cerradas: number };
    for (const cola of ['abiertas', 'borradores', 'cerradas'] as const) {
      const list = (await queue(SUPERVISOR, { cola, limit: 100 }).expect(200))
        .body as Page;
      expect(summary[cola]).toBe(list.items.length);
    }
    const admin = (
      await request(server).get('/ordenes/resumen').set(ADMIN).expect(200)
    ).body as { abiertas: number; borradores: number };
    expect(admin.abiertas).toBe(0);
    expect(admin.borradores).toBe(0);
  });
});
