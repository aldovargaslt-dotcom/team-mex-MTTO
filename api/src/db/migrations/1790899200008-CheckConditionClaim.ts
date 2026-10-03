import { MigrationInterface, QueryRunner } from 'typeorm';

export class CheckConditionClaim1790899200008 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`CREATE TABLE IF NOT EXISTS public.check_conditions (
      visita_id uuid PRIMARY KEY REFERENCES public.visitas(id) ON DELETE RESTRICT,
      revision integer NOT NULL DEFAULT 0, payload jsonb NOT NULL,
      progress varchar(32) NOT NULL CHECK (progress IN ('INCOMPLETE','COMPLETE')),
      derived_result varchar(32) NULL CHECK (derived_result IN ('FIT','FIT_WITH_OBSERVATION','UNFIT'))
    )`);
    await q.query(`CREATE TABLE IF NOT EXISTS public.check_findings (
      id uuid PRIMARY KEY, visita_id uuid NOT NULL REFERENCES public.visitas(id) ON DELETE RESTRICT,
      source_key varchar(128) NOT NULL, condition_revision integer NOT NULL,
      severity varchar(32) NOT NULL CHECK (severity IN ('OBSERVATION','HARD_BLOCKER')),
      details jsonb NOT NULL, CONSTRAINT check_finding_source_uidx UNIQUE (visita_id, source_key)
    )`);
    await q.query(`CREATE TABLE IF NOT EXISTS public.check_psi_policies (
      id uuid PRIMARY KEY, unidad_id uuid NOT NULL REFERENCES public.unidades(id) ON DELETE RESTRICT,
      tipo_vehiculo_id uuid NOT NULL REFERENCES public.tipos_vehiculo(id) ON DELETE RESTRICT,
      version integer NOT NULL CHECK (version > 0), positions jsonb NOT NULL,
      normal_min numeric NOT NULL, normal_max numeric NOT NULL,
      critical_min numeric NOT NULL, critical_max numeric NOT NULL,
      CONSTRAINT check_psi_policy_unit_type_version_uidx UNIQUE (unidad_id, tipo_vehiculo_id, version),
      CONSTRAINT check_psi_policy_ranges_ck CHECK (critical_min <= normal_min AND normal_min <= normal_max AND normal_max <= critical_max)
    )`);
  }
  async down(q: QueryRunner) {
    const [{ count }] = await q.query(
      'SELECT count(*)::int AS count FROM public.check_conditions',
    );
    if (Number(count) > 0)
      throw new Error('CHECK_CONDITION_ROLLBACK_REQUIRES_FORWARD_RECOVERY');
    await q.query('DROP TABLE IF EXISTS public.check_psi_policies');
    await q.query('DROP TABLE IF EXISTS public.check_findings');
    await q.query('DROP TABLE IF EXISTS public.check_conditions');
  }
}
