import './setup-e2e';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { AppModule } from '../src/app.module';
import { createCostMigrationDataSource } from '../src/db/cost-migration-data-source';
import { InventoryWorkOrderCosts1791849600001 } from '../src/db/migrations/1791849600001-InventoryWorkOrderCosts';

describe('EWO-038 additive inventory cost migration', () => {
  let app: INestApplication, db: DataSource;
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication(); await app.init(); db = app.get(DataSource);
  }, 60_000);
  afterAll(async () => { if (app) await app.close(); });
  it('preserves integer stock, pending receipts, history and frozen outbox; initializes unknown valuation', async () => {
    const [{ id: item }] = await db.query('SELECT id FROM inventario.items LIMIT 1');
    const ot = randomUUID(), event = randomUUID(), movement = randomUUID(), pending = randomUUID();
    await db.query(`INSERT INTO inventario.movimientos(id,item_id,tipo,qty,delta,visita_id,created_by) VALUES ($1,$2,'SALIDA_OT',1,-1,$3,'legacy')`, [movement, item, ot]);
    await db.query(`INSERT INTO inventario.pendientes_comprobante(id,item_id,visita_id,qty,estado) VALUES ($1,$2,$3,2,'PENDIENTE')`, [pending, item, ot]);
    const envelope = { eventId: event, eventType: 'VisitaCerrada', occurredAt: '2026-10-01T00:00:00Z', visitaId: ot, unidadId: randomUUID(), tipoVehiculoId: randomUUID(), km: 1000, cerradoAt: '2026-10-01T00:00:00Z', consumos: [{ itemId: item, qty: 1, origen: 'DESDE_STOCK' }] };
    await db.query('INSERT INTO outbox_events(id,type,payload,processed_at) VALUES ($1,$2,$3::jsonb,now())', [event, 'VisitaCerrada', JSON.stringify(envelope)]);
    const before = await db.query('SELECT item_id, qty::text, min_qty::text FROM inventario.stock ORDER BY item_id');
    await db.query('DROP TABLE inventario.material_commands, inventario.material_closures, inventario.material_accounts');
    await db.query('ALTER TABLE inventario.stock DROP CONSTRAINT IF EXISTS inventory_nonnegative');
    await db.query('ALTER TABLE inventario.stock DROP COLUMN known_value, DROP COLUMN unknown_qty, DROP COLUMN cost_sources');
    await db.query('ALTER TABLE inventario.items DROP COLUMN quantity_scale');
    await db.query('ALTER TABLE inventario.movimientos DROP COLUMN cost, DROP COLUMN known_cost, DROP COLUMN unknown_qty, DROP COLUMN cost_sources');
    for (const [table, columns] of [
      ['inventario.stock', ['qty', 'min_qty', 'critical_qty']],
      ['inventario.movimientos', ['qty', 'delta']],
      ['inventario.pendientes_comprobante', ['qty']],
      ['public.visita_piezas', ['qty']],
    ] as [string, string[]][]) for (const column of columns) await db.query(`ALTER TABLE ${table} ALTER COLUMN ${column} TYPE integer USING ${column}::integer`);
    const migrationDb = createCostMigrationDataSource();
    await migrationDb.initialize();
    try {
      expect((await migrationDb.runMigrations({ transaction: 'all' })).map(m => m.name)).toEqual(['InventoryWorkOrderCosts1791849600001']);
      expect(await migrationDb.runMigrations({ transaction: 'all' })).toEqual([]);
    } finally { await migrationDb.destroy(); }
    const [{ data_type: quantityType, numeric_scale: quantityScale }] = await db.query("SELECT data_type, numeric_scale FROM information_schema.columns WHERE table_schema='public' AND table_name='visita_piezas' AND column_name='qty'");
    expect(quantityType).toBe('numeric'); expect(quantityScale).toBe(6);
    const after = await db.query('SELECT item_id, qty::text, min_qty::text, known_value::text, unknown_qty::text FROM inventario.stock ORDER BY item_id');
    expect(after.map((row: { item_id: string; qty: string; min_qty: string | null }) => ({ item_id: row.item_id, qty: Number(row.qty), min_qty: row.min_qty === null ? null : Number(row.min_qty) }))).toEqual(before.map((row: { item_id: string; qty: string; min_qty: string | null }) => ({ item_id: row.item_id, qty: Number(row.qty), min_qty: row.min_qty === null ? null : Number(row.min_qty) })));
    expect(after.every((row: { qty: string; unknown_qty: string; known_value: string }) => row.qty === row.unknown_qty && Number(row.known_value) === 0)).toBe(true);
    const [{ state }] = await db.query('SELECT state FROM inventario.material_accounts WHERE visita_id=$1', [ot]);
    expect(state.postings).toHaveLength(2);
    expect(state.postings.every((p: { cost: string | null }) => p.cost === null)).toBe(true);
    const [{ payload }] = await db.query('SELECT payload FROM outbox_events WHERE id=$1', [event]); expect(payload).toEqual(envelope);
    expect((await db.query('SELECT id FROM inventario.pendientes_comprobante WHERE id=$1', [pending]))).toHaveLength(1);
    await expect(db.query('UPDATE inventario.stock SET qty=-1 WHERE item_id=$1', [item])).rejects.toMatchObject({ code: '23514' });
    await expect(new InventoryWorkOrderCosts1791849600001().down()).rejects.toThrow('reviewed restore plan');
  }, 60_000);
});
