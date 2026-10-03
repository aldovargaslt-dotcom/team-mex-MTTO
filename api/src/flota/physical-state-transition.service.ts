import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CurrentUser } from '../auth/current-user';
import { UnidadesService } from '../unidades/unidades.service';
import {
  PhysicalStateEventEntity,
  PhysicalState,
} from './entities/physical-state-event.entity';
import { UnitOperationCoordinator } from '../kernel/unit-operation.module';

@Injectable()
export class PhysicalStateTransitionService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly units: UnidadesService,
    private readonly unitOperations: UnitOperationCoordinator,
  ) {}

  async record(
    unidadId: string,
    input: { state: PhysicalState; reason: string },
    actor: CurrentUser,
  ) {
    await this.units.findOne(unidadId);
    return this.dataSource.transaction(async (manager) => {
      await this.unitOperations.lock(manager, unidadId);
      await manager.query(
        `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
        [`physical-state:${unidadId}`],
      );
      const previous = await manager.findOne(PhysicalStateEventEntity, {
        where: { unidadId },
        order: { version: 'DESC' },
        lock: { mode: 'pessimistic_write' },
      });
      return manager.save(
        manager.create(PhysicalStateEventEntity, {
          unidadId,
          state: input.state,
          source: 'FLOTA_TRANSITION',
          version: (previous?.version ?? 0) + 1,
          reason: input.reason.trim(),
          actorId: actor.userId ?? actor.rol,
          observedAt: new Date(),
        }),
      );
    });
  }
}
