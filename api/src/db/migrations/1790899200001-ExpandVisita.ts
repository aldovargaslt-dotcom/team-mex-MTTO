import { MigrationInterface, QueryRunner } from 'typeorm';
import { assertRollbackSafe } from '../check-foundation';
export class ExpandVisita1790899200001 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`ALTER TABLE public.visitas ALTER COLUMN estado DROP NOT NULL,
      ADD COLUMN work_order_type varchar, ADD COLUMN work_order_status varchar,
      ADD COLUMN version integer NOT NULL DEFAULT 1,
      ADD COLUMN legacy_compat_draft boolean NOT NULL DEFAULT false,
      ADD COLUMN migration_backfilled boolean NOT NULL DEFAULT false,
      ADD COLUMN assigned_user_id varchar, ADD COLUMN assigned_at timestamptz,
      ADD COLUMN started_at timestamptz, ADD COLUMN completed_at timestamptz, ADD COLUMN cancelled_at timestamptz,
      ADD COLUMN blocks_operation boolean NOT NULL DEFAULT false, ADD COLUMN block_reason text, ADD COLUMN block_actor varchar,
      ADD COLUMN requires_reinspection boolean NOT NULL DEFAULT false,
      ADD COLUMN source_check_id uuid, ADD COLUMN finding_id uuid,
      ADD COLUMN created_actor_name varchar, ADD COLUMN attribution_level varchar NOT NULL DEFAULT 'LEGACY_HEADER',
      ADD COLUMN creation_key varchar, ADD COLUMN creation_hash varchar`);
    await q.query(`CREATE TABLE public.facilities(id varchar PRIMARY KEY, name varchar NOT NULL,
      timezone varchar NOT NULL DEFAULT 'America/Mexico_City' CHECK(timezone='America/Mexico_City'), version integer NOT NULL DEFAULT 1 CHECK(version>0));
      CREATE TABLE public.vehicle_facilities(unidad_id uuid PRIMARY KEY REFERENCES public.unidades(id) ON DELETE RESTRICT,
      facility_id varchar NOT NULL REFERENCES public.facilities(id) ON DELETE RESTRICT, version integer NOT NULL DEFAULT 1 CHECK(version>0));
      CREATE TABLE public.check_inspections(visita_id uuid PRIMARY KEY REFERENCES public.visitas(id) ON DELETE CASCADE,
      source varchar NOT NULL CHECK(source IN ('DAILY_AUTOMATIC','LOGISTICS_MANUAL','CHECK_OUT','CHECK_IN','REINSPECTION')),
      facility_id varchar NOT NULL REFERENCES public.facilities(id) ON DELETE RESTRICT,
      operational_date date NOT NULL, timezone varchar NOT NULL CHECK(timezone='America/Mexico_City'),
      calendar_version integer NOT NULL CHECK(calendar_version>0), mapping_version integer NOT NULL CHECK(mapping_version>0), day_end_instant timestamptz NOT NULL)`);
  }
  async down(q: QueryRunner) {
    await assertRollbackSafe(q);
    await q.query(
      'DROP TABLE public.check_inspections; DROP TABLE public.vehicle_facilities; DROP TABLE public.facilities',
    );
    await q.query(
      `ALTER TABLE public.visitas ALTER COLUMN estado SET NOT NULL, ${[
        'work_order_type',
        'work_order_status',
        'version',
        'legacy_compat_draft',
        'migration_backfilled',
        'assigned_user_id',
        'assigned_at',
        'started_at',
        'completed_at',
        'cancelled_at',
        'blocks_operation',
        'block_reason',
        'block_actor',
        'requires_reinspection',
        'source_check_id',
        'finding_id',
        'created_actor_name',
        'attribution_level',
        'creation_key',
        'creation_hash',
      ]
        .map((c) => `DROP COLUMN ${c}`)
        .join(', ')}`,
    );
  }
}
