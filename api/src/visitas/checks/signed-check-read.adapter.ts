import { Injectable } from '@nestjs/common';
import { dailyCheckDeadline } from './readiness-policy';
import { EntityManager, In } from 'typeorm';
import { Visita } from '../visita.entity';
import {
  activeStatuses,
  maintenanceTypes,
  WorkOrderStatus,
  WorkOrderType,
} from '../work-order';
import { CheckInspection } from './check-inspection.entity';
import { CheckInvalidation } from './check-invalidation.entity';
import { ReadinessHold } from './readiness-hold.entity';
import { IsNull, Not } from 'typeorm';
import {
  MaintenanceBlockReadPort,
  SignedCheckReadPort,
  SignedCheckSnapshot,
} from './signed-check-read.port';

@Injectable()
export class TypeOrmSignedCheckReadAdapter extends SignedCheckReadPort {
  async readBatch(
    requests: { unidadId: string; operationalDate: string }[],
    now: Date,
    manager: EntityManager,
  ) {
    const result = new Map<string, SignedCheckSnapshot>();
    const unitIds = [...new Set(requests.map((request) => request.unidadId))];
    for (const unidadId of unitIds) {
      result.set(unidadId, { activeCheck: null, lastCompleted: null });
    }
    if (!unitIds.length) return result;
    const checks = await manager.find(Visita, {
      where: {
        unidad: { id: In(unitIds) },
        workOrderType: WorkOrderType.CHECK,
      },
      relations: { unidad: true },
      order: { createdAt: 'DESC' },
    });
    const checkIds = checks.map((check) => check.id);
    if (!checkIds.length) return result;
    const inspections = await manager.find(CheckInspection, {
      where: { visitaId: In(checkIds) },
    });
    const invalidations = await manager.find(CheckInvalidation, {
      where: { checkId: In(checkIds) },
    });
    const inspectionById = new Map(
      inspections.map((row) => [row.visitaId, row]),
    );
    const invalidatedIds = new Set(invalidations.map((row) => row.checkId));
    checks.sort(
      (a, b) =>
        (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0),
    );
    for (const check of checks) {
      const current = result.get(check.unidad.id)!;
      if (
        activeStatuses.includes(check.workOrderStatus) &&
        !current.activeCheck
      ) {
        current.activeCheck = {
          checkId: check.id,
          status: check.workOrderStatus,
          version: check.version,
          startedAt: check.startedAt,
        };
      }
      if (
        check.workOrderStatus !== WorkOrderStatus.COMPLETED ||
        current.lastCompleted
      )
        continue;
      const inspection = inspectionById.get(check.id);
      if (!inspection?.result || !inspection.dayEndInstant) continue;
      const invalidated = invalidatedIds.has(check.id);
      const reviewedAt = inspection.validityPolicy?.reviewedAt
        ? new Date(inspection.validityPolicy.reviewedAt)
        : check.completedAt ?? new Date(`${inspection.operationalDate}T12:00:00Z`);
      const deadline = dailyCheckDeadline(inspection.dayEndInstant, reviewedAt);
      const expired = now >= deadline;
      const unsigned = !inspection.snapshotHash;
      current.lastCompleted = {
        checkId: check.id,
        snapshotHash: inspection.snapshotHash ?? '',
        result: inspection.result,
        valid: !invalidated && !expired && !unsigned,
        reason: invalidated
          ? 'INVALIDATED'
          : expired
            ? 'EXPIRED'
            : unsigned
              ? 'UNSIGNED'
              : null,
        version: check.version,
        dayEndInstant: deadline,
      };
    }
    return result;
  }
}

@Injectable()
export class TypeOrmMaintenanceBlockReadAdapter extends MaintenanceBlockReadPort {
  async blockingUnitIds(unidadIds: string[], manager: EntityManager) {
    if (!unidadIds.length) return new Set<string>();
    const rows = await manager.find(Visita, {
      select: { id: true, unidad: { id: true } },
      relations: { unidad: true },
      where: [
        {
          unidad: { id: In(unidadIds) },
          workOrderType: In(maintenanceTypes),
          workOrderStatus: In(activeStatuses),
          blocksOperation: true,
        },
        {
          unidad: { id: In(unidadIds) },
          workOrderType: In(maintenanceTypes),
          workOrderStatus: In(activeStatuses),
          openedAt: Not(IsNull()),
        },
      ],
    });
    const holds = await manager.find(ReadinessHold, {
      where: { unidadId: In(unidadIds), verificationId: IsNull() },
    });
    return new Set([
      ...rows.map((row) => row.unidad.id),
      ...holds.map((row) => row.unidadId),
    ]);
  }
}
