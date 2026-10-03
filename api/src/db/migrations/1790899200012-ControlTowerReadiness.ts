import { MigrationInterface, QueryRunner } from 'typeorm';

export class ControlTowerReadiness1790899200012 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query('CREATE SCHEMA IF NOT EXISTS vehicle_documents');
    await q.query('CREATE SCHEMA IF NOT EXISTS flota');
    await q.query('CREATE SCHEMA IF NOT EXISTS alertas');
    await q.query(`CREATE TABLE IF NOT EXISTS vehicle_documents.document_versions (
      id uuid PRIMARY KEY,
      unidad_id uuid NOT NULL,
      document_type varchar(32) NOT NULL CHECK (document_type='POLIZA_SEGURO'),
      expiration_date date NOT NULL,
      version integer NOT NULL CHECK (version>0),
      "current" boolean NOT NULL DEFAULT true,
      issuer varchar(160), reference varchar(160), object_key varchar(512),
      supersedes_id uuid, created_by varchar(128) NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS vehicle_document_current_uidx
      ON vehicle_documents.document_versions(unidad_id,document_type) WHERE "current"=true`);
    await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS vehicle_document_version_uidx
      ON vehicle_documents.document_versions(unidad_id,document_type,version)`);

    await q.query(`CREATE TABLE IF NOT EXISTS flota.physical_state_events (
      id uuid PRIMARY KEY, unidad_id uuid NOT NULL,
      state varchar(24) NOT NULL CHECK (state IN ('EN_PATIO','EN_RUTA','EN_TALLER','INACTIVA')),
      source varchar(32) NOT NULL CHECK (source='FLOTA_TRANSITION'),
      version integer NOT NULL CHECK (version>0), reason text NOT NULL CHECK (length(btrim(reason))>0),
      actor_id varchar(128) NOT NULL, observed_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT physical_state_event_unit_version_uidx UNIQUE (unidad_id,version)
    )`);
    await q.query(`CREATE INDEX IF NOT EXISTS physical_state_event_unit_observed_idx
      ON flota.physical_state_events(unidad_id,observed_at DESC)`);

    await q.query(`CREATE TABLE IF NOT EXISTS alertas.torre_urgency_config (
      id uuid PRIMARY KEY, attention_window_seconds integer NOT NULL CHECK (attention_window_seconds>0),
      version integer NOT NULL CHECK (version>0), updated_at timestamptz NOT NULL DEFAULT now()
    )`);
  }

  async down(q: QueryRunner) {
    const [{ count }] = await q.query(`SELECT (
      (SELECT count(*) FROM vehicle_documents.document_versions) +
      (SELECT count(*) FROM flota.physical_state_events)
    )::int AS count`);
    if (Number(count) > 0) {
      throw new Error('CONTROL_TOWER_ROLLBACK_REQUIRES_FORWARD_RECOVERY');
    }
    await q.query('DROP TABLE IF EXISTS alertas.torre_urgency_config');
    await q.query('DROP TABLE IF EXISTS flota.physical_state_events');
    await q.query('DROP TABLE IF EXISTS vehicle_documents.document_versions');
    await q.query('DROP SCHEMA IF EXISTS vehicle_documents');
  }
}
