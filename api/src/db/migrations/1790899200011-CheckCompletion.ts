import { MigrationInterface, QueryRunner } from 'typeorm';

export class CheckCompletion1790899200011 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`ALTER TABLE public.check_inspections
      ADD COLUMN IF NOT EXISTS result varchar(32),
      ADD COLUMN IF NOT EXISTS reviewed_version integer,
      ADD COLUMN IF NOT EXISTS review_hash varchar(64),
      ADD COLUMN IF NOT EXISTS review_snapshot jsonb,
      ADD COLUMN IF NOT EXISTS snapshot_hash varchar(64),
      ADD COLUMN IF NOT EXISTS signed_snapshot jsonb,
      ADD COLUMN IF NOT EXISTS completion_key varchar(128),
      ADD COLUMN IF NOT EXISTS completion_hash varchar(64)`);
    await q.query(`ALTER TABLE public.check_inspections ADD CONSTRAINT check_inspection_result_ck
      CHECK (result IS NULL OR result IN ('FIT','FIT_WITH_OBSERVATION','UNFIT'))`);
    await q.query(`ALTER TABLE public.check_inspections ADD CONSTRAINT check_inspection_signed_ck CHECK (
      (snapshot_hash IS NULL AND signed_snapshot IS NULL AND completion_key IS NULL AND completion_hash IS NULL)
      OR (snapshot_hash IS NOT NULL AND signed_snapshot IS NOT NULL AND completion_key IS NOT NULL AND completion_hash IS NOT NULL AND result IS NOT NULL)
    )`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS check_inspection_completion_key_uidx
      ON public.check_inspections(completion_key) WHERE completion_key IS NOT NULL`);

    await q.query(`CREATE TABLE IF NOT EXISTS public.check_signatures (
      id uuid PRIMARY KEY, visita_id uuid NOT NULL REFERENCES public.visitas(id) ON DELETE RESTRICT,
      object_key varchar(512) NOT NULL, object_version_id varchar(128) NOT NULL,
      mime_type varchar(64) NOT NULL, bytes integer NOT NULL CHECK (bytes>0), sha256 varchar(64) NOT NULL,
      width integer NOT NULL CHECK (width>0), height integer NOT NULL CHECK (height>0),
      method varchar(32) NOT NULL CHECK (method='TOUCH_CANVAS'),
      signer_subject varchar(128) NOT NULL, signer_name varchar(160) NOT NULL,
      attribution_level varchar(32) NOT NULL, signed_content_hash varchar(64) NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT check_signature_visita_uidx UNIQUE (visita_id),
      CONSTRAINT check_signature_object_key_uidx UNIQUE (object_key)
    )`);
    await q.query(`CREATE TABLE IF NOT EXISTS public.check_invalidations (
      id uuid PRIMARY KEY, check_id uuid NOT NULL REFERENCES public.visitas(id) ON DELETE RESTRICT,
      unidad_id uuid NOT NULL REFERENCES public.unidades(id) ON DELETE RESTRICT,
      type varchar(64) NOT NULL CHECK (type IN ('INCIDENT_DAMAGE','NEW_SAFETY_ANOMALY','AUTHORIZED_INVALIDATION','MAINTENANCE_REINSPECTION_REQUIRED')),
      reason text NOT NULL CHECK (length(btrim(reason))>0), source_event_id varchar(160) NOT NULL,
      actor_id varchar(128) NOT NULL, actor_name varchar(160) NOT NULL,
      source_work_order_id uuid REFERENCES public.visitas(id) ON DELETE RESTRICT,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT check_invalidation_source_uidx UNIQUE (source_event_id)
    )`);
    await q.query(`CREATE INDEX IF NOT EXISTS check_invalidation_check_created_idx
      ON public.check_invalidations(check_id,created_at)`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS corrective_from_check_finding_uidx
      ON public.visitas(source_check_id,finding_id)
      WHERE work_order_type='CORRECTIVE' AND source_check_id IS NOT NULL AND finding_id IS NOT NULL`);

    await q.query(`CREATE OR REPLACE FUNCTION public.protect_completed_check_content() RETURNS trigger LANGUAGE plpgsql AS $$
      DECLARE target uuid; completed boolean;
      BEGIN
        IF TG_TABLE_NAME='visitas' THEN
          target:=CASE WHEN TG_OP='DELETE' THEN OLD.id ELSE NEW.id END;
        ELSE
          target:=CASE WHEN TG_OP='DELETE' THEN OLD.visita_id ELSE NEW.visita_id END;
        END IF;
        SELECT work_order_type='CHECK' AND work_order_status='COMPLETED' INTO completed
          FROM public.visitas WHERE id=target;
        IF completed THEN
          RAISE EXCEPTION 'CHECK_IMMUTABLE: %',target USING ERRCODE='55000';
        END IF;
        IF TG_OP='DELETE' THEN RETURN OLD; END IF;
        RETURN NEW;
      END $$`);
    for (const [table, name] of [
      ['visitas', 'protect_completed_check_visita'],
      ['check_inspections', 'protect_completed_check_inspection'],
      ['check_conditions', 'protect_completed_check_condition'],
      ['check_findings', 'protect_completed_check_finding'],
      ['check_evidence', 'protect_completed_check_evidence'],
      ['check_signatures', 'protect_completed_check_signature'],
    ]) {
      await q.query(`DROP TRIGGER IF EXISTS ${name} ON public.${table}`);
      const operations = table === 'visitas' ? 'UPDATE OR DELETE' : 'INSERT OR UPDATE OR DELETE';
      await q.query(`CREATE TRIGGER ${name} BEFORE ${operations} ON public.${table}
        FOR EACH ROW EXECUTE FUNCTION public.protect_completed_check_content()`);
    }
    await q.query(`CREATE OR REPLACE FUNCTION public.protect_check_invalidation_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'CHECK_INVALIDATION_APPEND_ONLY: %',OLD.id USING ERRCODE='55000'; END $$`);
    await q.query(`CREATE TRIGGER protect_check_invalidation BEFORE UPDATE OR DELETE ON public.check_invalidations
      FOR EACH ROW EXECUTE FUNCTION public.protect_check_invalidation_append_only()`);
  }

  async down(q: QueryRunner) {
    const [{ count }] = await q.query(`SELECT count(*)::int AS count FROM public.check_inspections WHERE snapshot_hash IS NOT NULL`);
    if (Number(count) > 0) throw new Error('CHECK_COMPLETION_ROLLBACK_REQUIRES_FORWARD_RECOVERY');
    for (const [table, name] of [
      ['visitas', 'protect_completed_check_visita'],
      ['check_inspections', 'protect_completed_check_inspection'],
      ['check_conditions', 'protect_completed_check_condition'],
      ['check_findings', 'protect_completed_check_finding'],
      ['check_evidence', 'protect_completed_check_evidence'],
      ['check_signatures', 'protect_completed_check_signature'],
    ]) await q.query(`DROP TRIGGER IF EXISTS ${name} ON public.${table}`);
    await q.query('DROP TRIGGER IF EXISTS protect_check_invalidation ON public.check_invalidations');
    await q.query('DROP FUNCTION IF EXISTS public.protect_check_invalidation_append_only()');
    await q.query('DROP FUNCTION IF EXISTS public.protect_completed_check_content()');
    await q.query('DROP INDEX IF EXISTS public.corrective_from_check_finding_uidx');
    await q.query('DROP TABLE IF EXISTS public.check_invalidations');
    await q.query('DROP TABLE IF EXISTS public.check_signatures');
    await q.query('DROP INDEX IF EXISTS public.check_inspection_completion_key_uidx');
    await q.query(`ALTER TABLE public.check_inspections
      DROP CONSTRAINT IF EXISTS check_inspection_signed_ck,
      DROP CONSTRAINT IF EXISTS check_inspection_result_ck,
      DROP COLUMN IF EXISTS completion_hash, DROP COLUMN IF EXISTS completion_key,
      DROP COLUMN IF EXISTS signed_snapshot, DROP COLUMN IF EXISTS snapshot_hash,
      DROP COLUMN IF EXISTS review_snapshot, DROP COLUMN IF EXISTS review_hash,
      DROP COLUMN IF EXISTS reviewed_version, DROP COLUMN IF EXISTS result`);
  }
}
