import { MigrationInterface, QueryRunner } from 'typeorm';

export class InventoryWorkOrderCosts1791849600001 implements MigrationInterface {
  async up(runner: QueryRunner) {
    for (const [table, columns] of [
      ['inventario.stock', ['qty', 'min_qty', 'critical_qty']],
      ['inventario.movimientos', ['qty', 'delta']],
      ['inventario.pendientes_comprobante', ['qty']],
      ['public.visita_piezas', ['qty']],
    ] as [string, string[]][]) for (const column of columns)
      await runner.query(`ALTER TABLE ${table} ALTER COLUMN ${column} TYPE numeric(20,6) USING ${column}::numeric(20,6)`);
    await runner.query(`ALTER TABLE inventario.items ADD COLUMN quantity_scale integer NOT NULL DEFAULT 0 CHECK (quantity_scale BETWEEN 0 AND 6)`);
    await runner.query(`ALTER TABLE inventario.stock ADD COLUMN known_value numeric(20,6) NOT NULL DEFAULT 0 CHECK (known_value >= 0), ADD COLUMN unknown_qty numeric(20,6) NOT NULL DEFAULT 0 CHECK (unknown_qty >= 0), ADD CONSTRAINT inventory_nonnegative CHECK (qty >= 0 AND unknown_qty <= qty)`);
    // Legacy quantity is preserved; no purchase price or zero cost is invented.
    await runner.query('UPDATE inventario.stock SET unknown_qty = qty');
    await runner.query("ALTER TABLE inventario.stock ADD COLUMN cost_sources jsonb NOT NULL DEFAULT '[]'::jsonb");
    await runner.query("ALTER TABLE inventario.movimientos ADD COLUMN cost_sources jsonb");
    await runner.query(`ALTER TABLE inventario.movimientos ADD COLUMN cost numeric(20,6), ADD COLUMN known_cost numeric(20,6), ADD COLUMN unknown_qty numeric(20,6)`);
    await runner.query(`CREATE TABLE inventario.material_accounts (
      visita_id uuid PRIMARY KEY, revision integer NOT NULL DEFAULT 0,
      state jsonb NOT NULL DEFAULT '{"purchases":[],"postings":[],"audits":[]}'::jsonb)`);
    await runner.query(`CREATE TABLE inventario.material_commands (id uuid PRIMARY KEY, visita_id uuid NOT NULL, hash varchar NOT NULL, result jsonb NOT NULL, actor varchar NOT NULL, revision integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`);
    await runner.query(`CREATE TABLE inventario.material_closures (event_id uuid PRIMARY KEY, visita_id uuid NOT NULL, legacy jsonb NOT NULL)`);
    await runner.query(`INSERT INTO inventario.material_accounts(visita_id, state)
      SELECT visita_id, jsonb_build_object('purchases', '[]'::jsonb, 'audits', '[]'::jsonb,
        'postings', jsonb_agg(jsonb_build_object('id', id::text, 'itemId', item_id::text,
        'kind', kind, 'qty', qty::text, 'stockDelta', delta::text,
        'cost', NULL, 'knownCost', '0', 'unknownQty', qty::text,
        'actor', actor, 'occurredAt', created_at)))
      FROM (
        SELECT id, visita_id, item_id, qty, delta, 'WAREHOUSE_USE'::text AS kind,
          COALESCE(created_by, 'legacy') AS actor, created_at FROM inventario.movimientos
          WHERE visita_id IS NOT NULL AND tipo='SALIDA_OT'
        UNION ALL
        SELECT id, visita_id, item_id, qty, 0::numeric AS delta, 'DIRECT_USE'::text AS kind,
          'legacy' AS actor, created_at FROM inventario.pendientes_comprobante
      ) AS history GROUP BY visita_id ON CONFLICT DO NOTHING`);
    await runner.query('CREATE INDEX material_commands_ot_idx ON inventario.material_commands(visita_id)');
    await runner.query(`CREATE INDEX material_pending_receipts_idx ON inventario.material_accounts USING gin ((state->'purchases'))`);
  }
  async down() {
    throw new Error('Inventory costs rollback requires a reviewed restore plan; posted quantities/history must not be truncated.');
  }
}
