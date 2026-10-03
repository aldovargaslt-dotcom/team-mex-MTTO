import { MigrationInterface, QueryRunner } from 'typeorm';

export class DepartureAuthorization1790899200013 implements MigrationInterface {
  async up(q: QueryRunner) {
    const [{ exists }] = await q.query(
      `SELECT to_regclass('flota.movimientos') IS NOT NULL AS exists`,
    );
    // The legacy rehearsal predates the independently deployed Flota schema.
    // Do not invent that owned table when only CHECK migrations are present.
    if (exists) {
      await q.query(`ALTER TABLE flota.movimientos
        ADD COLUMN IF NOT EXISTS source_check_id uuid,
        ADD COLUMN IF NOT EXISTS snapshot_hash varchar(64),
        ADD COLUMN IF NOT EXISTS departure_validation_refs jsonb`);
      await q.query(`CREATE INDEX IF NOT EXISTS movimiento_source_check_idx
        ON flota.movimientos(source_check_id) WHERE source_check_id IS NOT NULL`);
    }
    await q.query(`CREATE TABLE IF NOT EXISTS logistica_departure_audits (
      id uuid PRIMARY KEY,
      unidad_id uuid NOT NULL,
      actor_id varchar(128) NOT NULL,
      source_check_id uuid NOT NULL,
      snapshot_hash varchar(64) NOT NULL,
      check_version integer NOT NULL CHECK (check_version>0),
      validation_refs jsonb NOT NULL,
      evaluated_at timestamptz NOT NULL,
      operational_date date NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`CREATE INDEX IF NOT EXISTS logistica_departure_unit_created_idx
      ON logistica_departure_audits(unidad_id,created_at DESC)`);
  }

  async down(q: QueryRunner) {
    const [{ count: auditCount }] = await q.query(
      `SELECT count(*)::int AS count FROM logistica_departure_audits`,
    );
    const [{ exists }] = await q.query(
      `SELECT to_regclass('flota.movimientos') IS NOT NULL AS exists`,
    );
    const movementCount = exists
      ? Number(
          (
            await q.query(
              `SELECT count(*)::int AS count FROM flota.movimientos
               WHERE source_check_id IS NOT NULL`,
            )
          )[0].count,
        )
      : 0;
    if (Number(auditCount) + movementCount > 0) {
      throw new Error(
        'DEPARTURE_AUTHORIZATION_ROLLBACK_REQUIRES_FORWARD_RECOVERY',
      );
    }
    await q.query('DROP TABLE IF EXISTS logistica_departure_audits');
    if (exists) {
      await q.query('DROP INDEX IF EXISTS flota.movimiento_source_check_idx');
      await q.query(`ALTER TABLE flota.movimientos
        DROP COLUMN IF EXISTS departure_validation_refs,
        DROP COLUMN IF EXISTS snapshot_hash,
        DROP COLUMN IF EXISTS source_check_id`);
    }
  }
}
