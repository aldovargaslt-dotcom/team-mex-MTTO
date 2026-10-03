import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import {
  PhysicalStateReadPort,
  PhysicalStateSnapshot,
} from './physical-state-read.port';
import { MovimientoEntity } from './entities/movimiento.entity';
import { UnidadOperativaEntity } from './entities/unidad-operativa.entity';
import { TipoMovimientoFlota } from './enums';
import { PhysicalStateEventEntity } from './entities/physical-state-event.entity';

@Injectable()
export class TypeOrmPhysicalStateReadAdapter extends PhysicalStateReadPort {
  async read(
    unidadId: string,
    manager: EntityManager,
  ): Promise<PhysicalStateSnapshot> {
    const operativa = await manager.findOne(UnidadOperativaEntity, {
      where: { unidadId },
    });
    const movement = await manager.findOne(MovimientoEntity, {
      where: { unidadId },
      order: { occurredAt: 'DESC' },
    });
    const transition = await manager.findOne(PhysicalStateEventEntity, {
      where: { unidadId },
      order: { observedAt: 'DESC' },
    });
    if (!movement && !transition) {
      return { physicalKnowledge: 'UNINITIALIZED', physicalState: null };
    }
    if (
      transition &&
      (!movement || transition.observedAt >= movement.occurredAt)
    ) {
      return {
        physicalKnowledge: 'KNOWN',
        physicalState: transition.state,
        physicalSource: 'FLOTA_TRANSITION',
        version: transition.version,
        observedAt: transition.observedAt,
        operationalInconsistency: false,
      };
    }
    return {
      physicalKnowledge: 'KNOWN',
      physicalState:
        movement!.tipo === TipoMovimientoFlota.SALIDA ? 'EN_RUTA' : 'EN_PATIO',
      physicalSource: 'FLOTA_MOVEMENT',
      version:
        operativa?.updatedAt?.getTime() ?? movement!.occurredAt.getTime(),
      observedAt: movement!.occurredAt,
      operationalInconsistency: false,
    };
  }

  async readBatch(unidadIds: string[], manager: EntityManager) {
    const result = new Map<string, PhysicalStateSnapshot>();
    if (!unidadIds.length) return result;
    const [movements, transitions, operativas] = await Promise.all([
      manager
        .getRepository(MovimientoEntity)
        .createQueryBuilder('movement')
        .distinctOn(['movement.unidadId'])
        .where('movement.unidadId IN (:...unidadIds)', { unidadIds })
        .orderBy('movement.unidadId', 'ASC')
        .addOrderBy('movement.occurredAt', 'DESC')
        .getMany(),
      manager
        .getRepository(PhysicalStateEventEntity)
        .createQueryBuilder('transition')
        .distinctOn(['transition.unidadId'])
        .where('transition.unidadId IN (:...unidadIds)', { unidadIds })
        .orderBy('transition.unidadId', 'ASC')
        .addOrderBy('transition.observedAt', 'DESC')
        .getMany(),
      manager.find(UnidadOperativaEntity, {
        where: unidadIds.map((unidadId) => ({ unidadId })),
      }),
    ]);
    const movementByUnit = new Map(movements.map((row) => [row.unidadId, row]));
    const transitionByUnit = new Map(
      transitions.map((row) => [row.unidadId, row]),
    );
    const operationByUnit = new Map(
      operativas.map((row) => [row.unidadId, row]),
    );
    for (const unidadId of unidadIds) {
      const movement = movementByUnit.get(unidadId);
      const transition = transitionByUnit.get(unidadId);
      if (!movement && !transition) {
        result.set(unidadId, {
          physicalKnowledge: 'UNINITIALIZED',
          physicalState: null,
        });
        continue;
      }
      if (
        transition &&
        (!movement || transition.observedAt >= movement.occurredAt)
      ) {
        result.set(unidadId, {
          physicalKnowledge: 'KNOWN',
          physicalState: transition.state,
          physicalSource: 'FLOTA_TRANSITION',
          version: transition.version,
          observedAt: transition.observedAt,
          operationalInconsistency: false,
        });
        continue;
      }
      const operativa = operationByUnit.get(unidadId);
      result.set(unidadId, {
        physicalKnowledge: 'KNOWN',
        physicalState:
          movement!.tipo === TipoMovimientoFlota.SALIDA
            ? 'EN_RUTA'
            : 'EN_PATIO',
        physicalSource: 'FLOTA_MOVEMENT',
        version:
          operativa?.updatedAt?.getTime() ?? movement!.occurredAt.getTime(),
        observedAt: movement!.occurredAt,
        operationalInconsistency: false,
      });
    }
    return result;
  }
}
