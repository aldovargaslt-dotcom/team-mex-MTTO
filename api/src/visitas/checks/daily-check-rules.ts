import { PhysicalStateSnapshot } from '../../flota/physical-state-read.port';
import { FACILITY_TIMEZONE, operationalDay } from './facility-calendar';
export function dailyEligibility(
  administrativeState: string,
  physical: PhysicalStateSnapshot,
): string | null {
  if (administrativeState !== 'ACTIVA') return 'UNIT_INACTIVE';
  if (physical.physicalKnowledge !== 'KNOWN')
    return 'PHYSICAL_SOURCE_UNAVAILABLE';
  if (physical.operationalInconsistency) return 'PHYSICAL_SOURCE_INCONSISTENT';
  return physical.physicalState === 'EN_PATIO'
    ? null
    : 'PHYSICAL_STATE_INELIGIBLE';
}
export function scheduleDue(now: Date, localTime: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(localTime))
    throw new Error('Invalid daily schedule: expected HH:mm');
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: FACILITY_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(now);
  return {
    operationalDate: operationalDay(now).operationalDate,
    due: time >= localTime,
  };
}
