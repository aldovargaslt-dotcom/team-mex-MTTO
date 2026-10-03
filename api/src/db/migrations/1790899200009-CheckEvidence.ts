import { MigrationInterface, QueryRunner } from 'typeorm';

export class CheckEvidence1790899200009 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`CREATE TABLE IF NOT EXISTS public.check_evidence (
      id uuid PRIMARY KEY, visita_id uuid NOT NULL REFERENCES public.visitas(id) ON DELETE RESTRICT,
      object_key varchar(512) NOT NULL, object_version_id varchar(128),
      status varchar(16) NOT NULL CHECK (status IN ('TEMPORARY','READY')),
      tags jsonb NOT NULL DEFAULT '[]'::jsonb, mime_type varchar(64), bytes integer, sha256 varchar(64),
      actor_id varchar(128) NOT NULL, ready_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT check_evidence_key_uidx UNIQUE (object_key),
      CONSTRAINT check_evidence_metadata_ck CHECK ((status='TEMPORARY') OR (object_version_id IS NOT NULL AND mime_type IS NOT NULL AND bytes > 0 AND sha256 IS NOT NULL AND ready_at IS NOT NULL))
    )`);
    await q.query(
      'CREATE INDEX IF NOT EXISTS check_evidence_visita_status_idx ON public.check_evidence(visita_id, status)',
    );
  }
  async down(q: QueryRunner) {
    const [{ count }] = await q.query(
      'SELECT count(*)::int AS count FROM public.check_evidence',
    );
    if (Number(count) > 0)
      throw new Error('CHECK_EVIDENCE_ROLLBACK_REQUIRES_FORWARD_RECOVERY');
    await q.query('DROP TABLE IF EXISTS public.check_evidence');
  }
}
