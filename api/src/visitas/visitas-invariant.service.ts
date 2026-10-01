import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource } from 'typeorm';

type DuplicateDraftRow = {
  unidad_id: string;
  visita_ids: string[];
};

@Injectable()
export class VisitasInvariantService implements OnApplicationBootstrap {
  private readonly logger = new Logger(VisitasInvariantService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onApplicationBootstrap() {
    await this.ensureSingleDraftPerUnidad();
  }

  async ensureSingleDraftPerUnidad() {
    const duplicates = (await this.dataSource.query(`
      SELECT unidad_id, array_agg(id ORDER BY created_at) AS visita_ids
      FROM public.visitas
      WHERE estado = 'BORRADOR'
      GROUP BY unidad_id
      HAVING COUNT(*) > 1
      ORDER BY unidad_id
    `)) as DuplicateDraftRow[];

    if (duplicates.length > 0) {
      const detail = duplicates
        .map((row) => `${row.unidad_id}: ${row.visita_ids.join(', ')}`)
        .join('; ');
      throw new Error(
        `No se instaló el invariante de borrador único. Resuelva los duplicados sin borrar datos en silencio: ${detail}`,
      );
    }

    await this.dataSource.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS visitas_un_borrador_por_unidad_uidx
      ON public.visitas (unidad_id)
      WHERE estado = 'BORRADOR'
    `);
    this.logger.log('Invariante de un borrador por unidad verificado.');
  }
}
