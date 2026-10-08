import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserAccessDirectory1791504000001 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query('CREATE SCHEMA IF NOT EXISTS auth');
    await runner.query(`CREATE TABLE auth.users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), issuer text NOT NULL,
      subject text NOT NULL, display_name text NOT NULL, roles text[] NOT NULL,
      facility_scopes text[] NOT NULL, active boolean NOT NULL DEFAULT true,
      version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT auth_users_identity_unique UNIQUE (issuer,subject),
      CONSTRAINT auth_users_version_check CHECK (version>0),
      CONSTRAINT auth_users_roles_check CHECK (cardinality(roles)>0 AND roles <@ ARRAY['SUPERVISOR','ADMIN_DIRECTIVO','LOGISTICA','MECANICO']::text[]),
      CONSTRAINT auth_users_scopes_check CHECK (cardinality(facility_scopes)>0)
    )`);
    await runner.query(`CREATE TABLE auth.user_audit (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL,
      issuer text NOT NULL, actor_subject text NOT NULL, action text NOT NULL,
      before_snapshot jsonb, after_snapshot jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )`);
  }
  async down(): Promise<void> {
    throw new Error(
      'Auth directory rollback requires an explicit data-preservation plan.',
    );
  }
}
