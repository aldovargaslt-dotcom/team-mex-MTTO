import { randomUUID } from 'crypto';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class LogisticaJourneyHistory1792022400001 implements MigrationInterface {
  async up(q: QueryRunner) {
    if (
      process.env.LOGISTICA_WRITERS_DRAINED !== 'true' ||
      !/^[0-9a-f]{40}$/i.test(process.env.LOGISTICA_CAPTURE_COMMIT ?? '')
    )
      throw new Error('LOGISTICA_DRAINED_WRITERS_AND_CAPTURE_COMMIT_REQUIRED');
    await q.query(
      'SELECT id,ops_estado,salida_at,ambito,destino FROM public.unidades LIMIT 0',
    );
    await q.query(
      'SELECT id,unidad_id FROM public.logistica_departure_audits LIMIT 0',
    );
    await q.query(`ALTER TABLE public.unidades
      ADD COLUMN active_logistica_journey_id uuid,
      ADD COLUMN logistica_journey_revision bigint NOT NULL DEFAULT 0 CHECK(logistica_journey_revision>=0)`);
    await q.query(`CREATE TABLE public.logistica_journey_capture (
      id uuid PRIMARY KEY, schema_version integer NOT NULL, boundary_at timestamptz NOT NULL,
      baseline_commit varchar NOT NULL, legacy_open_count integer NOT NULL, coverage_note varchar NOT NULL)`);
    await q.query(`CREATE TABLE public.logistica_journeys (
      id uuid PRIMARY KEY,
      unidad_id uuid NOT NULL,
      capture_id uuid NOT NULL,
      origin varchar NOT NULL,
      revision bigint NOT NULL,
      departure_audit_id uuid,
      driver_id uuid,
      driver_provenance varchar NOT NULL,
      ambito varchar,
      destino varchar,
      context_provenance varchar NOT NULL,
      legacy_observed_context jsonb,
      history_gaps jsonb NOT NULL,
      return_command_id uuid,
      departed_effective_at timestamptz,
      departed_registered_at timestamptz,
      departure_actor_id varchar,
      departure_auth_mode varchar,
      departure_attribution_level varchar,
      departure_facility_id varchar,
      departure_mapping_version int,
      departure_facility_version int,
      returned_effective_at timestamptz,
      returned_registered_at timestamptz,
      return_actor_id varchar,
      return_auth_mode varchar,
      return_attribution_level varchar,
      return_facility_id varchar,
      return_mapping_version int,
      return_facility_version int,
      created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
      CONSTRAINT logistica_journey_audit_fk FOREIGN KEY (departure_audit_id)
        REFERENCES public.logistica_departure_audits(id) ON DELETE RESTRICT,
      CONSTRAINT logistica_journey_revision_check CHECK (revision IN (1,2)),
      CONSTRAINT logistica_journey_origin_check CHECK (origin IN ('CAPTURED','LEGACY_OPEN','LEGACY_RECOVERED')),
      CONSTRAINT logistica_journey_endpoint_check CHECK ((num_nonnulls(return_command_id,returned_effective_at,returned_registered_at,return_actor_id,return_auth_mode,return_attribution_level,return_facility_id,return_mapping_version,return_facility_version)=0 AND revision=1) OR (num_nonnulls(return_command_id,returned_effective_at,returned_registered_at,return_actor_id,return_auth_mode,return_attribution_level,return_facility_id,return_mapping_version,return_facility_version)=9 AND revision=2)),
      CONSTRAINT logistica_journey_order_check CHECK (returned_effective_at IS NULL OR departed_effective_at IS NULL OR returned_effective_at >= departed_effective_at),
      CONSTRAINT logistica_journey_captured_check CHECK (origin <> 'CAPTURED' OR (departed_effective_at IS NOT NULL AND departed_registered_at IS NOT NULL AND departure_actor_id IS NOT NULL AND departure_auth_mode IS NOT NULL AND departure_attribution_level IS NOT NULL AND departure_facility_id IS NOT NULL AND departure_mapping_version IS NOT NULL AND departure_facility_version IS NOT NULL AND departure_audit_id IS NOT NULL AND context_provenance='DEPARTURE_SNAPSHOT'))
    )`);
    await q.query(
      `CREATE UNIQUE INDEX logistica_journey_open_unit_idx ON public.logistica_journeys(unidad_id) WHERE returned_effective_at IS NULL`,
    );
    await q.query(
      `CREATE UNIQUE INDEX logistica_journey_audit_idx ON public.logistica_journeys(departure_audit_id) WHERE departure_audit_id IS NOT NULL`,
    );
    await q.query(
      `CREATE INDEX logistica_journey_unit_start_idx ON public.logistica_journeys(unidad_id,departed_effective_at,id)`,
    );
    await q.query(
      `CREATE INDEX logistica_journey_return_idx ON public.logistica_journeys(unidad_id,returned_effective_at) WHERE returned_effective_at IS NOT NULL`,
    );
    await q.query(`CREATE TABLE public.logistica_journey_commands (
      actor_id varchar(128) NOT NULL, command_id uuid NOT NULL, unidad_id uuid NOT NULL,
      kind varchar NOT NULL CHECK(kind IN ('DEPARTURE','RETURN')), request_hash varchar(64) NOT NULL,
      expected_unit_revision bigint NOT NULL, expected_history_state varchar NOT NULL,
      expected_journey_ref text, expected_journey_revision bigint,
      result_journey_id uuid NOT NULL, result_unit_revision bigint NOT NULL,
      result_journey_revision bigint NOT NULL, response_status integer NOT NULL CHECK(response_status=204),
      registered_at timestamptz NOT NULL DEFAULT clock_timestamp(),
      CONSTRAINT logistica_journey_commands_pkey PRIMARY KEY(actor_id,command_id))`);
    await q.query(
      'CREATE INDEX logistica_command_unit_idx ON public.logistica_journey_commands(unidad_id,registered_at)',
    );
    const captureId = randomUUID();
    await q.query(
      `INSERT INTO public.logistica_journey_capture
      VALUES ($1,1,clock_timestamp(),$2,0,'Drained cutover; legacy starts and closed history remain incomplete')`,
      [captureId, process.env.LOGISTICA_CAPTURE_COMMIT],
    );
    await q.query(
      `INSERT INTO public.logistica_journeys
      (id,unidad_id,capture_id,origin,revision,driver_provenance,context_provenance,legacy_observed_context,history_gaps)
      SELECT gen_random_uuid(),id,$1,'LEGACY_OPEN',1,'UNKNOWN','LEGACY_OBSERVED',
      jsonb_build_object('salidaAt',salida_at,'ambito',ambito,'destino',destino),
      '["UNKNOWN_DEPARTURE","UNKNOWN_DRIVER","UNKNOWN_AUTHORIZATION"]'::jsonb
      FROM public.unidades WHERE ops_estado='EN_RUTA'`,
      [captureId],
    );
    await q.query(`UPDATE public.unidades u SET active_logistica_journey_id=j.id
      FROM public.logistica_journeys j WHERE j.unidad_id=u.id AND j.origin='LEGACY_OPEN'`);
    await q.query(
      `UPDATE public.logistica_journey_capture SET legacy_open_count=
      (SELECT count(*) FROM public.logistica_journeys WHERE origin='LEGACY_OPEN') WHERE id=$1`,
      [captureId],
    );
  }
  async down(q: QueryRunner) {
    const [{ name }] = await q.query('SELECT current_database() AS name');
    if (process.env.EWO_DISPOSABLE_DB !== 'true' || !name.endsWith('_test'))
      throw new Error('LOGISTICA_ROLLBACK_DISPOSABLE_TARGET_REQUIRED');
    const [{ count }] = await q.query(`SELECT
      (SELECT count(*) FROM public.logistica_journeys WHERE origin <> 'LEGACY_OPEN' OR returned_effective_at IS NOT NULL)
      +(SELECT count(*) FROM public.logistica_journey_commands)
      +(SELECT count(*) FROM public.unidades WHERE logistica_journey_revision>0) AS count`);
    if (Number(count))
      throw new Error('LOGISTICA_ROLLBACK_REQUIRES_FORWARD_RECOVERY');
    await q.query('DROP TABLE public.logistica_journey_commands');
    await q.query('DROP TABLE public.logistica_journeys');
    await q.query('DROP TABLE public.logistica_journey_capture');
    await q.query(
      'ALTER TABLE public.unidades DROP COLUMN active_logistica_journey_id, DROP COLUMN logistica_journey_revision',
    );
  }
}
