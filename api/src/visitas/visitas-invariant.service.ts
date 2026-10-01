import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  FOUNDATION_CONSTRAINTS,
  installFoundationConstraints,
  verifyFoundation,
} from '../db/check-foundation';

@Injectable()
export class VisitasInvariantService implements OnApplicationBootstrap {
  constructor(private readonly dataSource: DataSource) {}
  async onApplicationBootstrap() {
    // synchronize is only supported for explicitly disposable development/tests.
    // Controlled environments verify migrations; bootstrap never restores the
    // superseded global draft index or performs a production backfill.
    if (this.dataSource.options.synchronize) {
      if (!['test', 'development'].includes(process.env.NODE_ENV ?? ''))
        throw new Error(
          'Explicit non-production environment required for synchronize',
        );
      await installFoundationConstraints(this.dataSource);
      for (const name of Object.keys(FOUNDATION_CONSTRAINTS))
        await this.dataSource.query(
          `ALTER TABLE public.visitas VALIDATE CONSTRAINT ${name}`,
        );
    }
    await verifyFoundation(this.dataSource);
    const old = await this.dataSource.query(
      "SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='visitas_un_borrador_por_unidad_uidx'",
    );
    if (old.length)
      throw new Error(
        'LEGACY_GLOBAL_INDEX_PRESENT: complete the writer-drain/migration gate before startup.',
      );
  }
}
