import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { EntityManager, In } from 'typeorm';
import { TrustedActor } from '../auth/trusted-actor';
import { MaintenanceAnalysisScope } from '../kernel/analysis-scope.service';
import { LogisticaJourney } from './journey.entity';
import { LogisticaJourneyCapture } from './journey-capture.entity';
@Injectable()
export class LogisticsAnalysisJourneyReadPort {
  constructor(private readonly scope: MaintenanceAnalysisScope) {}
  async read(
    m: EntityManager,
    actor: TrustedActor,
    ids: string[],
    from: Date,
    to: Date,
  ) {
    await this.scope.assertUnits(m, actor, ids);
    if (!ids.length) return { journeys: [], captures: [] };
    const rows = await m.find(LogisticaJourney, {
      where: { unidadId: In(ids) },
      take: 100001,
    });
    if (rows.length > 100000)
      throw new UnprocessableEntityException({
        code: 'QUERY_TOO_LARGE',
        message: 'Reduzca el alcance de viajes.',
        details: {},
      });
    const captures = await m.find(LogisticaJourneyCapture, {
      order: { boundaryAt: 'ASC' },
    });
    return {
      journeys: rows.filter(
        (x) =>
          (!x.departedEffectiveAt || x.departedEffectiveAt < to) &&
          (!x.returnedEffectiveAt || x.returnedEffectiveAt >= from),
      ),
      captures,
    };
  }
}
