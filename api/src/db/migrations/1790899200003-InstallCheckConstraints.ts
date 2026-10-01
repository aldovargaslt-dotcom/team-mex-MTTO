import { MigrationInterface, QueryRunner } from 'typeorm';
import {
  assertRollbackSafe,
  FOUNDATION_CONSTRAINTS,
  installFoundationConstraints,
} from '../check-foundation';
export class InstallCheckConstraints1790899200003 implements MigrationInterface {
  async up(q: QueryRunner) {
    await installFoundationConstraints(q);
  }
  async down(q: QueryRunner) {
    await assertRollbackSafe(q);
    await q.query(`DROP TRIGGER visitas_check_subtype_ct ON public.visitas;
      DROP TRIGGER inspection_check_subtype_ct ON public.check_inspections;
      DROP FUNCTION public.enforce_check_subtype();
      DROP INDEX public.check_un_activo_por_unidad_uidx;
      DROP INDEX public.visitas_legacy_draft_slot_uidx;
      DROP INDEX public.visitas_maintenance_request_uidx`);
    for (const name of Object.keys(FOUNDATION_CONSTRAINTS))
      await q.query(`ALTER TABLE public.visitas DROP CONSTRAINT ${name}`);
  }
}
