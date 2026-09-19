import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { NotificationsService } from '../src/notifications/notifications.service';

const SUPERVISOR = { 'X-Role': 'SUPERVISOR', 'X-User-Id': 'sup-inbox' };
const ADMIN = { 'X-Role': 'ADMIN_DIRECTIVO', 'X-User-Id': 'adm-inbox' };

describe('Notifications v0 (e2e)', () => {
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

  it('N3: aviso Andon ABIERTO de FOTON aparece en inbox WARNING + hub deeplink', async () => {
    const badge = await request(server)
      .get('/notifications/badge')
      .set(SUPERVISOR)
      .expect(200);
    expect(badge.body.unread).toBeGreaterThanOrEqual(1);

    const inbox = await request(server)
      .get('/notifications')
      .set(SUPERVISOR)
      .expect(200);
    const item = (
      inbox.body as {
        title: string;
        severity: string;
        sourceModule: string;
        subjectType: string;
        deeplinkPath: string;
        readAt: string | null;
      }[]
    ).find((row) => row.sourceModule === 'ANDON' && row.title.includes('FOTON'));
    expect(item).toBeTruthy();
    expect(item!.severity).toBe('WARNING');
    expect(item!.sourceModule).toBe('ANDON');
    expect(item!.subjectType).toBe('UNIDAD');
    expect(item!.deeplinkPath).toMatch(/^\/unidades\//);
    expect(item!.readAt).toBeNull();
  });

  it('N2: mark read, badge, Todas, mark all; Admin ve el mismo inbox', async () => {
    const unread = await request(server)
      .get('/notifications')
      .set(SUPERVISOR)
      .expect(200);
    const first = (unread.body as { id: string }[])[0];
    expect(first).toBeTruthy();

    await request(server)
      .post(`/notifications/${first.id}/read`)
      .set(SUPERVISOR)
      .expect(201);

    const unreadAfter = await request(server)
      .get('/notifications')
      .set(SUPERVISOR)
      .expect(200);
    expect(
      (unreadAfter.body as { id: string }[]).some((r) => r.id === first.id),
    ).toBe(false);

    const all = await request(server)
      .get('/notifications')
      .query({ filter: 'all' })
      .set(SUPERVISOR)
      .expect(200);
    const rows = all.body as { id: string; readAt: string | null }[];
    expect(rows.find((r) => r.id === first.id)?.readAt).toBeTruthy();
    const unreadInAll = rows.filter((r) => r.readAt == null);
    const readInAll = rows.filter((r) => r.readAt != null);
    if (unreadInAll.length && readInAll.length) {
      expect(rows.findIndex((r) => r.readAt == null)).toBeLessThan(
        rows.findIndex((r) => r.readAt != null),
      );
    }

    await request(server)
      .post('/notifications/read-all')
      .set(SUPERVISOR)
      .expect(201);
    const zero = await request(server)
      .get('/notifications/badge')
      .set(SUPERVISOR)
      .expect(200);
    expect(zero.body.unread).toBe(0);

    const adminInbox = await request(server)
      .get('/notifications')
      .set(ADMIN)
      .expect(200);
    expect((adminInbox.body as unknown[]).length).toBeGreaterThanOrEqual(1);
  });

  it('N4: StockBajo stub escribe notifications, cero stock en andon.*', async () => {
    const svc = app.get(NotificationsService);
    const created = await svc.ingestStockBajo({
      itemId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      sku: 'FIL-ACEITE-01',
      nombre: 'Filtro de aceite',
    });
    expect(created.sourceModule).toBe('INVENTARIO');
    expect(created.subjectType).toBe('ITEM');
    expect(created.subjectRef).toBe('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    expect(created.dedupeKey).toBe(
      'INV:stock-bajo:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    );

    const found = await request(server)
      .get('/notifications')
      .query({ filter: 'unread' })
      .set(ADMIN)
      .expect(200);
    expect(
      (found.body as { title: string }[]).some((row) =>
        row.title.includes('FIL-ACEITE-01'),
      ),
    ).toBe(true);

    const ds = app.get(DataSource);
    const tables: { table_name: string }[] = await ds.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'andon'`,
    );
    const names = tables.map((t) => t.table_name);
    expect(names).not.toContain('stock');
    expect(names).not.toContain('items');
    expect(names.some((n) => /stock|sku/i.test(n))).toBe(false);

    const cols: { column_name: string }[] = await ds.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'andon' AND table_name = 'avisos'`,
    );
    expect(cols.map((c) => c.column_name).join(',')).not.toMatch(/stock|sku/i);
  });
});
