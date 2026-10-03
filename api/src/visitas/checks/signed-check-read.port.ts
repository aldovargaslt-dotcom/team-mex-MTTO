import type { EntityManager } from 'typeorm';

export type SignedCheckSnapshot = {
  activeCheck: {
    checkId: string;
    status: string;
    version: number;
    startedAt: Date | null;
  } | null;
  lastCompleted: {
    checkId: string;
    snapshotHash: string;
    result: 'FIT' | 'FIT_WITH_OBSERVATION' | 'UNFIT';
    valid: boolean;
    reason: 'EXPIRED' | 'INVALIDATED' | 'UNSIGNED' | null;
    version: number;
    dayEndInstant: Date;
  } | null;
};

export abstract class SignedCheckReadPort {
  abstract readBatch(
    requests: { unidadId: string; operationalDate: string }[],
    now: Date,
    transactionContext: EntityManager,
  ): Promise<Map<string, SignedCheckSnapshot>>;
}

export abstract class MaintenanceBlockReadPort {
  abstract blockingUnitIds(
    unidadIds: string[],
    transactionContext: EntityManager,
  ): Promise<Set<string>>;
}
