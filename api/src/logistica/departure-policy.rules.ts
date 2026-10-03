import { PhysicalStateSnapshot } from '../flota/physical-state-read.port';
import { InsurancePolicySnapshot } from '../vehicle-documents/vehicle-insurance.port';
import { SignedCheckSnapshot } from '../visitas/checks/signed-check-read.port';

export type DepartureBlockReason =
  | 'UNIT_INACTIVE'
  | 'JOURNEY_ALREADY_IN_ROUTE'
  | 'PHYSICAL_STATE_REQUIRED'
  | 'PHYSICAL_STATE_NOT_READY'
  | 'POLICY_SOURCE_UNAVAILABLE'
  | 'INSURANCE_REQUIRED'
  | 'INSURANCE_EXPIRED'
  | 'CHECK_REQUIRED'
  | 'CHECK_EXPIRED'
  | 'CHECK_INVALIDATED'
  | 'CHECK_UNSIGNED'
  | 'CHECK_UNFIT'
  | 'MAINTENANCE_BLOCKING';

export function departureBlockReasons(input: {
  unitActive: boolean;
  journeyInRoute: boolean;
  physical: PhysicalStateSnapshot;
  insurance: InsurancePolicySnapshot;
  check: SignedCheckSnapshot;
  maintenanceBlocking: boolean;
}): DepartureBlockReason[] {
  const reasons: DepartureBlockReason[] = [];
  if (!input.unitActive) reasons.push('UNIT_INACTIVE');
  if (input.journeyInRoute) reasons.push('JOURNEY_ALREADY_IN_ROUTE');
  if (input.physical.physicalKnowledge !== 'KNOWN') {
    reasons.push('PHYSICAL_STATE_REQUIRED');
  } else if (input.physical.physicalState !== 'EN_PATIO') {
    reasons.push('PHYSICAL_STATE_NOT_READY');
  }

  if (input.insurance.status === 'SOURCE_UNAVAILABLE') {
    reasons.push('POLICY_SOURCE_UNAVAILABLE');
  } else if (input.insurance.status === 'MISSING') {
    reasons.push('INSURANCE_REQUIRED');
  } else if (input.insurance.status === 'EXPIRED_OR_EXPIRES_TODAY') {
    reasons.push('INSURANCE_EXPIRED');
  }

  const completed = input.check.lastCompleted;
  if (!completed) {
    reasons.push('CHECK_REQUIRED');
  } else if (!completed.valid) {
    reasons.push(
      completed.reason === 'EXPIRED'
        ? 'CHECK_EXPIRED'
        : completed.reason === 'INVALIDATED'
          ? 'CHECK_INVALIDATED'
          : 'CHECK_UNSIGNED',
    );
  } else if (completed.result === 'UNFIT') {
    reasons.push('CHECK_UNFIT');
  }
  if (input.maintenanceBlocking) reasons.push('MAINTENANCE_BLOCKING');
  return reasons;
}
