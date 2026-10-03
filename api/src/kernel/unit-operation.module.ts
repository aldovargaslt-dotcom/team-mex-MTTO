import { Global, Injectable, Module } from '@nestjs/common';
import { EntityManager } from 'typeorm';

/**
 * Serializes every writer that can change departure eligibility for a unit.
 * The key is deliberately shared across bounded contexts; it is not a FK.
 */
@Injectable()
export class UnitOperationCoordinator {
  async lock(manager: EntityManager, unidadId: string): Promise<void> {
    await manager.query(
      `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
      [`unit-operation:${unidadId}`],
    );
  }
}

@Global()
@Module({
  providers: [UnitOperationCoordinator],
  exports: [UnitOperationCoordinator],
})
export class UnitOperationModule {}
