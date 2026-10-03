import { MigrationInterface, QueryRunner } from 'typeorm';

export class CheckGenerationAudit1790899200007 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`CREATE TABLE IF NOT EXISTS public.check_generation_ledger (
      id uuid PRIMARY KEY, unidad_id uuid NOT NULL REFERENCES public.unidades(id) ON DELETE RESTRICT,
      facility_id varchar NOT NULL REFERENCES public.facilities(id) ON DELETE RESTRICT,
      operational_date date NOT NULL, check_id uuid REFERENCES public.visitas(id) ON DELETE RESTRICT,
      command_id varchar(128) NOT NULL, outcome varchar(32) NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT check_generation_outcome_ck CHECK (outcome IN ('CREATED','SKIPPED_ACTIVE','SKIPPED_COMPLETED','CONFLICT')),
      CONSTRAINT check_generation_unit_day_uidx UNIQUE (unidad_id, operational_date)
    )`);
    await q.query(`CREATE TABLE IF NOT EXISTS public.check_audit_events (
      id uuid PRIMARY KEY, check_id uuid NOT NULL REFERENCES public.visitas(id) ON DELETE RESTRICT,
      unidad_id uuid NOT NULL REFERENCES public.unidades(id) ON DELETE RESTRICT,
      event varchar(64) NOT NULL, actor_id varchar(128) NOT NULL, actor_name varchar(160) NOT NULL,
      details jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(
      'CREATE INDEX IF NOT EXISTS check_audit_check_created_idx ON public.check_audit_events(check_id, created_at)',
    );
  }
  async down(q: QueryRunner) {
    const [{ count }] = await q.query(
      'SELECT count(*)::int AS count FROM public.check_audit_events',
    );
    const [{ ledgerCount }] = await q.query(
      'SELECT count(*)::int AS "ledgerCount" FROM public.check_generation_ledger',
    );
    if (Number(count) > 0 || Number(ledgerCount) > 0)
      throw new Error('CHECK_AUDIT_ROLLBACK_REQUIRES_FORWARD_RECOVERY');
    await q.query('DROP INDEX IF EXISTS public.check_audit_check_created_idx');
    await q.query('DROP TABLE IF EXISTS public.check_audit_events');
    await q.query('DROP TABLE IF EXISTS public.check_generation_ledger');
  }
}
