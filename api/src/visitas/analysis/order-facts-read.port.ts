import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { TrustedActor } from '../../auth/trusted-actor';
import { MaintenanceAnalysisScope } from '../../kernel/analysis-scope.service';
export type OrderFact = {
  id: string;
  unitId: string;
  version: number;
  maintenanceType: string;
  status: string;
  openedAt: Date | null;
  completedAt: Date | null;
  cancelledAt?: Date | null;
  createdAt: Date;
  km: number | null;
  works: { id: string; categoria: string; item: string }[];
};
@Injectable()
export class MaintenanceOrderFactsReadPort {
  constructor(private readonly scope: MaintenanceAnalysisScope) {}
  async read(
    m: EntityManager,
    actor: TrustedActor,
    ids: string[],
  ): Promise<OrderFact[]> {
    await this.scope.assertUnits(m, actor, ids);
    if (!ids.length) return [];
    const rows: Omit<OrderFact, 'works'>[] = await m.query(
      'SELECT id,unidad_id AS "unitId",version,work_order_type AS "maintenanceType",work_order_status AS status,opened_at AS "openedAt",COALESCE(completed_at,cerrado_at) AS "completedAt",created_at AS "createdAt",cancelled_at AS "cancelledAt",km FROM public.visitas WHERE unidad_id=ANY($1::uuid[]) ORDER BY id LIMIT 100001',
      [ids],
    );
    if (rows.length > 100000)
      throw new UnprocessableEntityException({
        code: 'QUERY_TOO_LARGE',
        message: 'Reduzca el alcance de órdenes.',
        details: {},
      });
    const works: {
      id: string;
      visita_id: string;
      categoria: string;
      item: string;
    }[] = rows.length
      ? await m.query(
          'SELECT id,visita_id,categoria,item FROM public.visita_trabajos WHERE visita_id=ANY($1::uuid[]) LIMIT 100001',
          [rows.map((x) => x.id)],
        )
      : [];
    if (works.length > 100000)
      throw new UnprocessableEntityException(
        'Demasiados trabajos para esta consulta.',
      );
    const byOrder = new Map<string, OrderFact['works']>();
    for (const w of works) {
      const list = byOrder.get(w.visita_id) ?? [];
      list.push({ id: w.id, categoria: w.categoria, item: w.item });
      byOrder.set(w.visita_id, list);
    }
    return rows.map((x) => ({ ...x, works: byOrder.get(x.id) ?? [] }));
  }
}
