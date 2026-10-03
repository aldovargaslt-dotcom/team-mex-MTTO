import {
  ConflictException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { TrustedActor } from '../auth/trusted-actor';
import { PhysicalStateReadPort } from '../flota/physical-state-read.port';
import { VehicleInsurancePolicyPort } from '../vehicle-documents/vehicle-insurance.port';
import { FacilityCalendarPort } from '../visitas/checks/facility-calendar.port';
import {
  MaintenanceBlockReadPort,
  SignedCheckReadPort,
} from '../visitas/checks/signed-check-read.port';
import {
  DepartureAuthorization,
  DeparturePolicyPort,
} from './departure-policy.port';
import { departureBlockReasons } from './departure-policy.rules';
import { Unidad } from '../unidades/unidad.entity';
import { EstadoUnidad } from '../common/estado-unidad.enum';
import { OpsEstadoUnidad } from '../unidades/ops-estado-unidad.enum';

@Injectable()
export class DeparturePolicyService extends DeparturePolicyPort {
  constructor(
    private readonly calendars: FacilityCalendarPort,
    private readonly physicalStates: PhysicalStateReadPort,
    private readonly insurance: VehicleInsurancePolicyPort,
    private readonly signedChecks: SignedCheckReadPort,
    private readonly maintenanceBlocks: MaintenanceBlockReadPort,
  ) {
    super();
  }

  async authorize(
    unidadId: string,
    actor: TrustedActor,
    manager: EntityManager,
    now = new Date(),
  ): Promise<DepartureAuthorization> {
    const calendar = await this.calendars.resolve(unidadId, manager, now);
    if (!actor.facilityScopes.includes(calendar.mapping.facilityId)) {
      throw new ForbiddenException({
        code: 'FACILITY_SCOPE_FORBIDDEN',
        message: 'La unidad está fuera del facility autorizado.',
        details: { unidadId },
      });
    }
    const request = {
      unidadId,
      operationalDate: calendar.day.operationalDate,
    };
    const unit = await manager.findOneByOrFail(Unidad, { id: unidadId });
    let physical;
    try {
      physical = await this.physicalStates.read(unidadId, manager);
    } catch {
      throw new ServiceUnavailableException({
        code: 'DEPARTURE_POLICY_UNAVAILABLE',
        message: 'No fue posible verificar el estado físico de la unidad.',
        details: { source: 'PHYSICAL_STATE' },
      });
    }
    // One transaction owns one query runner; keep reads sequential so the
    // snapshot remains coherent and pg never multiplexes the same client.
    const insurance = await this.insurance.evaluateBatch([request], manager);
    const checks = await this.signedChecks.readBatch([request], now, manager);
    const blockingIds = await this.maintenanceBlocks.blockingUnitIds(
      [unidadId],
      manager,
    );
    const insuranceSnapshot = insurance.get(unidadId)!;
    const checkSnapshot = checks.get(unidadId) ?? {
      activeCheck: null,
      lastCompleted: null,
    };
    const reasons = departureBlockReasons({
      unitActive: unit.estado === EstadoUnidad.ACTIVA,
      journeyInRoute: unit.opsEstado === OpsEstadoUnidad.EN_RUTA,
      physical,
      insurance: insuranceSnapshot,
      check: checkSnapshot,
      maintenanceBlocking: blockingIds.has(unidadId),
    });
    if (reasons.includes('POLICY_SOURCE_UNAVAILABLE')) {
      throw new ServiceUnavailableException({
        code: 'DEPARTURE_POLICY_UNAVAILABLE',
        message: 'No fue posible verificar la póliza de la unidad.',
        details: { reasons },
      });
    }
    if (reasons.length) {
      throw new ConflictException({
        code: 'DEPARTURE_BLOCKED',
        message: 'La salida está bloqueada. Corrige los requisitos indicados.',
        details: { reasons, operationalDate: request.operationalDate },
      });
    }
    const completed = checkSnapshot.lastCompleted!;
    return {
      allowed: true,
      reasons: [],
      signedCheckRef: {
        checkId: completed.checkId,
        snapshotHash: completed.snapshotHash,
        version: completed.version,
        result: completed.result as 'FIT' | 'FIT_WITH_OBSERVATION',
      },
      insuranceRef: {
        documentId: insuranceSnapshot.documentId!,
        version: insuranceSnapshot.version!,
        expirationDate: insuranceSnapshot.expirationDate!,
      },
      blockVersions: {
        physicalVersion:
          physical.physicalKnowledge === 'KNOWN' ? physical.version : 0,
        physicalSource:
          physical.physicalKnowledge === 'KNOWN'
            ? physical.physicalSource
            : 'FLOTA_TRANSITION',
        maintenanceBlocking: false,
        facilityId: calendar.mapping.facilityId,
        facilityVersion: calendar.mapping.facility.version,
        mappingVersion: calendar.mapping.version,
        journeyUpdatedAt: unit.updatedAt.toISOString(),
      },
      evaluatedAt: now.toISOString(),
      operationalDate: request.operationalDate,
    };
  }
}
