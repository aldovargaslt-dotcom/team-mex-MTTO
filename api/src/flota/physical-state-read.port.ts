import type { EntityManager } from 'typeorm';

/** ADR-017/R04 owner contract only. The Flota adapter/state machine is Slice 7. */
export type PhysicalStateSnapshot =
  | {
      physicalKnowledge: 'KNOWN';
      physicalState: 'EN_PATIO' | 'EN_RUTA' | 'EN_TALLER' | 'INACTIVA';
      physicalSource: 'FLOTA_MOVEMENT' | 'FLOTA_TRANSITION';
      version: number;
      observedAt: Date;
      operationalInconsistency: boolean;
    }
  | { physicalKnowledge: 'UNAVAILABLE' | 'UNINITIALIZED'; physicalState: null };

export abstract class PhysicalStateReadPort {
  abstract read(
    unidadId: string,
    transactionContext: EntityManager,
  ): Promise<PhysicalStateSnapshot>;
  abstract readBatch(
    unidadIds: string[],
    transactionContext: EntityManager,
  ): Promise<Map<string, PhysicalStateSnapshot>>;
}
