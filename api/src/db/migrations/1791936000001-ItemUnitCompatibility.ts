import { MigrationInterface, QueryRunner } from 'typeorm';

export class ItemUnitCompatibility1791936000001 implements MigrationInterface {
  async up(runner: QueryRunner) {
    await runner.query("ALTER TABLE inventario.items ADD COLUMN unidad_ids uuid[] NOT NULL DEFAULT '{}'::uuid[]");
  }
  async down() {
    throw new Error('Compatibility rollback requires a reviewed restore plan; unit selections must not be discarded.');
  }
}
