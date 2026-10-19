import {
  Injectable,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EntityManager, In, Between } from 'typeorm';
import { TrustedActor } from '../auth/trusted-actor';
import { MaintenanceAnalysisScope } from '../kernel/analysis-scope.service';
import { inventoryCostsEnabled } from './cost-feature';
import { CostOperation } from './entities/cost.entity';

/** Owner-side read port. Never delegates authorization to the legacy unit-cost endpoint. */
@Injectable()
export class InventoryMaintenanceCostReadPort {
  constructor(private readonly scope: MaintenanceAnalysisScope) {}
  async read(
    m: EntityManager,
    actor: TrustedActor,
    unitIds: string[],
    from: Date,
    to: Date,
  ) {
    if (!inventoryCostsEnabled())
      throw new ServiceUnavailableException(
        'La fuente de costos de inventario está deshabilitada.',
      );
    await this.scope.assertUnits(m, actor, unitIds);
    if (!unitIds.length) return [];
    const rows = await m.find(CostOperation, {
      where: {
        unidadId: In(unitIds),
        kind: In(['CONSUMPTION', 'EXTERNAL', 'RETURN']),
        effectiveAt: Between(from, to),
      },
      order: { effectiveAt: 'ASC', id: 'ASC' },
      take: 100001,
    });
    if (rows.length > 100000)
      throw new UnprocessableEntityException({
        code: 'QUERY_TOO_LARGE',
        message: 'Reduzca el periodo de costos.',
        details: {},
      });
    return rows.filter((x) => x.effectiveAt < to);
  }
  async references(m: EntityManager, actor: TrustedActor, ids: string[]) {
    this.scope.authorize(actor);
    if (!inventoryCostsEnabled())
      throw new ServiceUnavailableException(
        'La fuente de costos de inventario está deshabilitada.',
      );
    if (!ids.length) return [];
    if (ids.length > 1000)
      throw new UnprocessableEntityException('Demasiadas referencias.');
    const rows = await m.find(CostOperation, { where: { id: In(ids) } });
    await this.scope.assertUnits(
      m,
      actor,
      rows.map((x) => x.unidadId).filter((x): x is string => Boolean(x)),
    );
    return rows.filter((x) => x.unidadId);
  }
}
