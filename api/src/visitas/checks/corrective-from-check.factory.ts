import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Visita } from '../visita.entity';
import { WorkOrderStatus, WorkOrderType } from '../work-order';

export type PreparedCorrective = {
  status: 'PREPARED';
  unidadId: string;
  sourceCheckId: string;
  findingId: string;
  note: string;
  evidenceRefs: string[];
};

@Injectable()
export class CorrectiveFromCheckFactory {
  /** Reserved for the signed completion transaction in EWO-020. */
  createAtCompletion(
    manager: EntityManager,
    prepared: PreparedCorrective,
    createdBy: string,
  ) {
    return manager.create(Visita, {
      unidad: { id: prepared.unidadId },
      estado: null,
      tipo: null,
      km: null,
      chofer: null,
      workOrderType: WorkOrderType.CORRECTIVE,
      workOrderStatus: WorkOrderStatus.PENDING,
      legacyCompatDraft: false,
      sourceCheckId: prepared.sourceCheckId,
      findingId: prepared.findingId,
      observaciones: prepared.note,
      createdBy,
      blocksOperation: false,
      requiresReinspection: false,
    });
  }
}
