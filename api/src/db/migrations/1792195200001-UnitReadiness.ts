import { MigrationInterface, QueryRunner } from 'typeorm';

export class UnitReadiness1792195200001 implements MigrationInterface {
  name = 'UnitReadiness1792195200001';
  async up(q: QueryRunner) {
    await q.query(`CREATE TABLE IF NOT EXISTS public.check_readiness_generations (
      unidad_id uuid NOT NULL REFERENCES public.unidades(id), period_key varchar NOT NULL,
      check_id uuid NOT NULL REFERENCES public.visitas(id), command_id varchar NOT NULL,
      created_at timestamptz NOT NULL, PRIMARY KEY(unidad_id,period_key))`);
    await q.query(
      'ALTER TABLE public.check_inspections ADD COLUMN IF NOT EXISTS validity_policy jsonb NULL',
    );
    await q.query(`CREATE TABLE IF NOT EXISTS public.check_readiness_settings (
      facility_id varchar NOT NULL REFERENCES public.facilities(id), scope varchar NOT NULL CHECK(scope IN ('FLEET','CATEGORY','UNIT')),
      target_id varchar NOT NULL, interval jsonb NULL, usage varchar NULL CHECK(usage IN ('DAILY','STOCK')),
      version int NOT NULL CHECK(version>0), updated_by varchar NOT NULL, updated_at timestamptz NOT NULL,
      PRIMARY KEY(facility_id,scope,target_id),
      CHECK(interval IS NULL OR (jsonb_typeof(interval)='object' AND interval->>'mode' IN ('DAILY','WEEKLY','MONTHLY','CUSTOM'))),
      CHECK(scope<>'FLEET' OR target_id='*'))`);
    await q.query(`CREATE TABLE IF NOT EXISTS public.check_readiness_audit (
      id uuid PRIMARY KEY, facility_id varchar NOT NULL, actor_id varchar NOT NULL, event varchar NOT NULL,
      details jsonb NOT NULL, created_at timestamptz NOT NULL)`);
    await q.query(`CREATE TABLE IF NOT EXISTS public.unit_repair_verifications (
      id uuid PRIMARY KEY, unidad_id uuid NOT NULL REFERENCES public.unidades(id), order_id uuid NOT NULL REFERENCES public.visitas(id),
      actor_id varchar NOT NULL, actor_name varchar NOT NULL, command_id uuid NOT NULL, request_hash varchar NOT NULL,
      snapshot jsonb NOT NULL, signature_data_url text NOT NULL, signature_hash varchar NOT NULL, created_at timestamptz NOT NULL)`);
    await q.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS unit_verification_command_uidx ON public.unit_repair_verifications(actor_id,command_id)',
    );
    await q.query(`CREATE TABLE IF NOT EXISTS public.unit_safety_holds (
      id uuid PRIMARY KEY, unidad_id uuid NOT NULL REFERENCES public.unidades(id), order_id uuid NOT NULL REFERENCES public.visitas(id),
      reason text NOT NULL CHECK(length(trim(reason))>0), actor_id varchar NOT NULL, actor_name varchar NOT NULL,
      command_id uuid NOT NULL, created_at timestamptz NOT NULL,
      verification_id uuid NULL REFERENCES public.unit_repair_verifications(id))`);
    await q.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS unit_safety_hold_command_uidx ON public.unit_safety_holds(actor_id,command_id)',
    );
    await q.query(
      'CREATE INDEX IF NOT EXISTS unit_safety_hold_active_idx ON public.unit_safety_holds(unidad_id) WHERE verification_id IS NULL',
    );
  }
  async down(q: QueryRunner) {
    const populated = await q.query(
      `SELECT 1 FROM public.check_readiness_audit UNION ALL SELECT 1 FROM public.check_readiness_settings UNION ALL SELECT 1 FROM public.check_readiness_generations UNION ALL SELECT 1 FROM public.unit_safety_holds UNION ALL SELECT 1 FROM public.unit_repair_verifications UNION ALL SELECT 1 FROM public.check_inspections WHERE validity_policy IS NOT NULL LIMIT 1`,
    );
    if (populated.length)
      throw new Error(
        'FORWARD_RECOVERY_REQUIRED: readiness evidence/configuration exists.',
      );
    await q.query(
      'DROP TABLE public.unit_safety_holds, public.unit_repair_verifications, public.check_readiness_audit, public.check_readiness_settings, public.check_readiness_generations',
    );
    await q.query(
      'ALTER TABLE public.check_inspections DROP COLUMN validity_policy',
    );
  }
}
