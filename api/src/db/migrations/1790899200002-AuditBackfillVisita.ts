import { MigrationInterface, QueryRunner } from 'typeorm';
import { assertRollbackSafe, auditLegacy } from '../check-foundation';
export class AuditBackfillVisita1790899200002 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query('LOCK TABLE public.visitas IN ACCESS EXCLUSIVE MODE');
    await auditLegacy(q);
    await q.query(`UPDATE public.visitas SET
      work_order_type=CASE tipo::text WHEN 'PREDICTIVO' THEN 'PREVENTIVE' WHEN 'CORRECTIVO' THEN 'CORRECTIVE' END,
      work_order_status=CASE estado::text WHEN 'BORRADOR' THEN 'PENDING' WHEN 'CERRADO' THEN 'COMPLETED' END,
      legacy_compat_draft=(estado::text='BORRADOR'), completed_at=cerrado_at, migration_backfilled=true`);
  }
  async down(q: QueryRunner) {
    await assertRollbackSafe(q); /* Legacy columns/IDs were never rewritten. */
  }
}
