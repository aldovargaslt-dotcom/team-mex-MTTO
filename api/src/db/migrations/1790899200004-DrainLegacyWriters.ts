import { MigrationInterface, QueryRunner } from 'typeorm';
import { assertRollbackSafe, verifyFoundation } from '../check-foundation';
export class DrainLegacyWriters1790899200004 implements MigrationInterface {
  async up(q: QueryRunner) {
    if (process.env.CHK_LEGACY_WRITERS_DRAINED !== 'true')
      throw new Error(
        'WRITERS_NOT_DRAINED: stop all legacy writers/bootstrap before proceeding.',
      );
    await verifyFoundation(q);
  }
  async down(q: QueryRunner) {
    await assertRollbackSafe(q);
  }
}
