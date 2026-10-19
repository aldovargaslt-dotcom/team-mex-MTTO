import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { EntityManager, In, Between } from 'typeorm';
import { TrustedActor } from '../auth/trusted-actor';
import { MaintenanceAnalysisScope } from '../kernel/analysis-scope.service';
import { MovimientoEntity } from './entities/movimiento.entity';
import { PhysicalStateEventEntity } from './entities/physical-state-event.entity';
@Injectable()
export class FleetAnalysisEvidenceReadPort {
  constructor(private readonly scope: MaintenanceAnalysisScope) {}
  async read(
    m: EntityManager,
    actor: TrustedActor,
    ids: string[],
    from: Date,
    to: Date,
  ) {
    await this.scope.assertUnits(m, actor, ids);
    if (!ids.length) return { samples: [], physicalEvents: [] };
    const samples = await m.find(MovimientoEntity, {
      where: { unidadId: In(ids), occurredAt: Between(from, to) },
      order: { occurredAt: 'ASC', id: 'ASC' },
      take: 100001,
    });
    const physicalEvents = await m.find(PhysicalStateEventEntity, {
      where: { unidadId: In(ids), observedAt: Between(from, to) },
      order: { observedAt: 'ASC' },
      take: 100001,
    });
    if (samples.length > 100000 || physicalEvents.length > 100000)
      throw new UnprocessableEntityException({
        code: 'QUERY_TOO_LARGE',
        message: 'Reduzca el periodo de movimientos.',
        details: {},
      });
    return { samples, physicalEvents };
  }
}
