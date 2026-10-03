import { MigrationInterface, QueryRunner } from 'typeorm';

export class CheckFindingClassification1790899200010 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`ALTER TABLE public.check_findings
      ADD COLUMN IF NOT EXISTS classification varchar(32),
      ADD COLUMN IF NOT EXISTS classification_note text,
      ADD COLUMN IF NOT EXISTS classification_revision integer,
      ADD COLUMN IF NOT EXISTS prepared_context jsonb`);
    await q.query(`ALTER TABLE public.check_findings ADD CONSTRAINT check_finding_classification_ck
      CHECK (classification IS NULL OR classification IN ('OBSERVATION','FIXED_DURING_CHECK','REQUIRES_WORK'))`);
    await q.query(`ALTER TABLE public.check_findings ADD CONSTRAINT check_finding_prepared_ck
      CHECK ((classification='REQUIRES_WORK' AND prepared_context IS NOT NULL) OR (classification IS DISTINCT FROM 'REQUIRES_WORK' AND prepared_context IS NULL))`);
  }
  async down(q: QueryRunner) {
    const [{ count }] = await q.query(
      'SELECT count(*)::int AS count FROM public.check_findings WHERE classification IS NOT NULL OR prepared_context IS NOT NULL',
    );
    if (Number(count) > 0)
      throw new Error('CHECK_FINDING_ROLLBACK_REQUIRES_FORWARD_RECOVERY');
    await q.query(`ALTER TABLE public.check_findings
      DROP CONSTRAINT IF EXISTS check_finding_prepared_ck,
      DROP CONSTRAINT IF EXISTS check_finding_classification_ck,
      DROP COLUMN IF EXISTS prepared_context,
      DROP COLUMN IF EXISTS classification_revision,
      DROP COLUMN IF EXISTS classification_note,
      DROP COLUMN IF EXISTS classification`);
  }
}
