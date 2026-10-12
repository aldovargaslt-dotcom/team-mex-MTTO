import { MigrationInterface, QueryRunner } from 'typeorm';

/** Adición a módulos legacy existentes; independiente de CHECK/Auth. */
export class AlertAttentionPriority1791676800001 implements MigrationInterface {
  name = 'AlertAttentionPriority1791676800001';

  async up(queryRunner: QueryRunner) {
    await queryRunner.query(`ALTER TABLE andon.umbrales
      ADD COLUMN IF NOT EXISTS critical_overdue_km integer NOT NULL DEFAULT 1000,
      ADD COLUMN IF NOT EXISTS critical_overdue_days integer NOT NULL DEFAULT 30`);
    await queryRunner.query(`ALTER TABLE inventario.stock
      ADD COLUMN IF NOT EXISTS critical_qty integer NOT NULL DEFAULT 0`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS alert_catalog.threshold_change (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      code varchar(64) NOT NULL, actor_id varchar NULL, actor_role varchar NOT NULL,
      before jsonb NOT NULL, after jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
    )`);
    await queryRunner.query(`ALTER TABLE andon.umbrales
      ADD CONSTRAINT alert_attention_margins_positive CHECK (critical_overdue_km > 0 AND critical_overdue_days > 0)`);
    await queryRunner.query(`ALTER TABLE inventario.stock
      ADD CONSTRAINT alert_attention_stock_limits CHECK (critical_qty >= 0 AND (min_qty IS NULL OR critical_qty <= min_qty))`);
  }

  async down(queryRunner: QueryRunner) {
    await queryRunner.query(`DROP TABLE alert_catalog.threshold_change`);
    await queryRunner.query(
      `ALTER TABLE inventario.stock DROP CONSTRAINT alert_attention_stock_limits, DROP COLUMN critical_qty`,
    );
    await queryRunner.query(
      `ALTER TABLE andon.umbrales DROP CONSTRAINT alert_attention_margins_positive, DROP COLUMN critical_overdue_km, DROP COLUMN critical_overdue_days`,
    );
  }
}
