import { MigrationInterface, QueryRunner } from 'typeorm';
export class InventoryCosts1792108800001 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE inventario.cost_operations (
      id uuid PRIMARY KEY, "itemId" uuid NOT NULL, kind varchar NOT NULL, qty integer NOT NULL,
      "visitaId" uuid, "unidadId" uuid, "supplierId" uuid, "supplierName" varchar, reference varchar,
      money jsonb, "netCents" bigint CHECK ("netCents">=0), revisions jsonb NOT NULL DEFAULT '[]',
      version integer NOT NULL DEFAULT 1, actor varchar NOT NULL, reason text, "sourceId" uuid,
      "effectiveAt" timestamptz NOT NULL, "createdAt" timestamptz NOT NULL DEFAULT now())`);
    await q.query(
      'CREATE INDEX cost_unit_effective_idx ON inventario.cost_operations ("unidadId","effectiveAt")',
    );
    await q.query(
      'CREATE INDEX cost_item_idx ON inventario.cost_operations ("itemId","createdAt")',
    );
    await q.query(
      'CREATE INDEX cost_source_idx ON inventario.cost_operations ("sourceId")',
    );
    await q.query(
      `CREATE TABLE inventario.valuation_state ("itemId" uuid PRIMARY KEY,"valueCents" bigint CHECK ("valueCents">=0),version integer NOT NULL DEFAULT 0,"quantityAtCost" integer NOT NULL DEFAULT 0,"cutAt" timestamptz)`,
    );
    await q.query(
      `CREATE TABLE inventario.operation_receipts (identity varchar PRIMARY KEY, hash varchar NOT NULL, result jsonb NOT NULL,"createdAt" timestamptz NOT NULL DEFAULT now())`,
    );
    await q.query(
      `CREATE TABLE inventario.document_attachments (id uuid PRIMARY KEY,"pendingId" uuid NOT NULL,"dataUrl" text NOT NULL,actor varchar,"createdAt" timestamptz NOT NULL DEFAULT now())`,
    );
  }
  async down(): Promise<void> {
    throw new Error(
      'Financial history must not be dropped. Disable new commands and use a reviewed forward migration.',
    );
  }
}
