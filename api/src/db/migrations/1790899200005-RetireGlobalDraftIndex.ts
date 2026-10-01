import { MigrationInterface, QueryRunner } from 'typeorm';
import { assertRollbackSafe, verifyFoundation } from '../check-foundation';
export class RetireGlobalDraftIndex1790899200005 implements MigrationInterface {
  async up(q: QueryRunner) {
    if (process.env.CHK_LEGACY_WRITERS_DRAINED !== 'true')
      throw new Error('WRITERS_NOT_DRAINED');
    await verifyFoundation(q);
    const indexes = await q.query(
      `SELECT indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND tablename='visitas' AND indexdef LIKE 'CREATE UNIQUE%'`,
    );
    for (const index of indexes) {
      const global =
        index.indexdef.includes('(unidad_id)') &&
        index.indexdef.includes("estado = 'BORRADOR'");
      if (global && index.indexname !== 'visitas_un_borrador_por_unidad_uidx')
        throw new Error(`UNRECOGNIZED_GLOBAL_INDEX: ${index.indexname}`);
      if (index.indexname === 'visitas_un_borrador_por_unidad_uidx' && !global)
        throw new Error('UNEXPECTED_OLD_INDEX_DEFINITION');
    }
    await q.query(
      'DROP INDEX IF EXISTS public.visitas_un_borrador_por_unidad_uidx',
    );
  }
  async down(q: QueryRunner) {
    await assertRollbackSafe(q);
    await q.query(
      "CREATE UNIQUE INDEX visitas_un_borrador_por_unidad_uidx ON public.visitas(unidad_id) WHERE estado='BORRADOR'",
    );
  }
}
