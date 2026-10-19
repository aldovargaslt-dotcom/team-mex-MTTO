import { Injectable } from '@nestjs/common';
import { EntityManager, In } from 'typeorm';
import { TrustedActor } from '../auth/trusted-actor';
import {
  MaintenanceAnalysisScope,
  AnalysisUnit,
} from '../kernel/analysis-scope.service';
import { UltimaVisitaEntity } from './entities/ultima-visita.entity';
import { UmbralEntity } from './entities/umbral.entity';
import { AvisoEntity } from './entities/aviso.entity';
@Injectable()
export class AndonAnalysisPlanningReadPort {
  constructor(private readonly scope: MaintenanceAnalysisScope) {}
  async read(m: EntityManager, actor: TrustedActor, units: AnalysisUnit[]) {
    await this.scope.assertUnits(
      m,
      actor,
      units.map((x) => x.id),
    );
    if (!units.length) return { lastClosed: [], thresholds: [], alerts: [] };
    const lastClosed = await m.find(UltimaVisitaEntity, {
      where: { unidadId: In(units.map((x) => x.id)) },
    });
    const thresholds = await m.find(UmbralEntity, {
      where: { tipoVehiculoId: In([...new Set(units.map((x) => x.typeId))]) },
    });
    const alerts = await m.find(AvisoEntity, {
      where: {
        unidadId: In(units.map((x) => x.id)),
        estado: In(['ABIERTO', 'ENTERADO']),
      },
      take: 100001,
    });
    return { lastClosed, thresholds, alerts };
  }
}
