import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  assertRollbackSafe,
  FOUNDATION_CONSTRAINTS,
  verifyFoundation,
} from '../check-foundation';
export class ValidateCheckFoundation1790899200006 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(
      'ALTER TABLE public.visitas ALTER COLUMN work_order_type SET NOT NULL, ALTER COLUMN work_order_status SET NOT NULL, ALTER COLUMN unidad_id SET NOT NULL',
    );
    for (const name of Object.keys(FOUNDATION_CONSTRAINTS))
      await q.query(`ALTER TABLE public.visitas VALIDATE CONSTRAINT ${name}`);
    await verifyFoundation(q);
  }
  async down(q: QueryRunner) {
    await assertRollbackSafe(q);
    await q.query(
      'ALTER TABLE public.visitas ALTER COLUMN work_order_type DROP NOT NULL, ALTER COLUMN work_order_status DROP NOT NULL, ALTER COLUMN unidad_id DROP NOT NULL',
    );
  }
}
