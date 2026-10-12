import { MigrationInterface, QueryRunner } from 'typeorm';

export class MaintenanceOrderOpening1791763200001 implements MigrationInterface {
  name = 'MaintenanceOrderOpening1791763200001';
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(
      'ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS opened_at timestamptz NULL',
    );
    await runner.query(
      'ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS opened_by varchar(128) NULL',
    );
    await runner.query(
      'ALTER TABLE public.visitas ADD COLUMN IF NOT EXISTS opened_actor_name varchar(160) NULL',
    );
  }
  async down(): Promise<void> {
    throw new Error(
      'Opening history cannot be removed automatically; retain columns on rollback.',
    );
  }
}
