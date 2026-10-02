import { TipoVisita } from './enums';

export enum WorkOrderType {
  CHECK = 'CHECK',
  PREVENTIVE = 'PREVENTIVE',
  CORRECTIVE = 'CORRECTIVE',
}
export enum WorkOrderStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}
export enum CheckSource {
  DAILY_AUTOMATIC = 'DAILY_AUTOMATIC',
  LOGISTICS_MANUAL = 'LOGISTICS_MANUAL',
  CHECK_OUT = 'CHECK_OUT',
  CHECK_IN = 'CHECK_IN',
  REINSPECTION = 'REINSPECTION',
}
export const activeStatuses = [
  WorkOrderStatus.PENDING,
  WorkOrderStatus.ASSIGNED,
  WorkOrderStatus.IN_PROGRESS,
];
export const maintenanceTypes = [
  WorkOrderType.PREVENTIVE,
  WorkOrderType.CORRECTIVE,
];
export const ACTIVE_CHECK_INDEX = 'check_un_activo_por_unidad_uidx';
export const LEGACY_SLOT_INDEX = 'visitas_legacy_draft_slot_uidx';
export const MAINTENANCE_REQUEST_INDEX = 'visitas_maintenance_request_uidx';
export const isMaintenance = (type: WorkOrderType) =>
  maintenanceTypes.includes(type);
export const canonicalMaintenanceType = (type: TipoVisita) =>
  type === TipoVisita.PREDICTIVO
    ? WorkOrderType.PREVENTIVE
    : WorkOrderType.CORRECTIVE;
export function uniqueViolation(error: unknown, constraint: string): boolean {
  if (!error || typeof error !== 'object') return false;
  const direct = error as {
    code?: string;
    constraint?: string;
    driverError?: unknown;
  };
  return (
    (direct.code === '23505' && direct.constraint === constraint) ||
    (!!direct.driverError &&
      direct.driverError !== error &&
      uniqueViolation(direct.driverError, constraint))
  );
}
