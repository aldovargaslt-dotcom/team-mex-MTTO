import { AlertOrigin, AlertPenaltySeverity, InboxAlertSeverity } from './enums';
import {
  HealthAlert,
  HealthConfig,
  HealthSnapshot,
  LastClosedForHealth,
  UnidadHealthRef,
} from './salud-types';

export type AndonHealthInput = {
  lastClosed: LastClosedForHealth | null;
  tKm: number;
  tDias: number;
  tipoVehiculoId: string | null;
  hasNoResuelto: boolean;
};

export interface AndonHealthInputPort {
  get(unidadId: string): Promise<AndonHealthInput>;
}

export interface OdometerPort {
  getLatestKm(unidadId: string): Promise<number | null>;
}

export interface SaludCatalog {
  get(unidadId: string): Promise<UnidadHealthRef | null>;
  list(): Promise<UnidadHealthRef[]>;
}

export type HealthAlertOpened = {
  alert: HealthAlert;
  unidad: UnidadHealthRef | null;
  score: number;
  threshold: number;
  numeroInterno: string;
  drivers: { type: string; message: string }[];
  severity: InboxAlertSeverity;
};

export type HealthAlertResolved = {
  alert: HealthAlert;
  unidadId: string;
  score: number;
};

export interface HealthAlertPort {
  onOpened(event: HealthAlertOpened): Promise<void>;
  onResolved(event: HealthAlertResolved): Promise<void>;
}

export const HEALTH_ALERT_PORT = Symbol('HealthAlertPort');
export const ANDON_HEALTH_INPUT_PORT = Symbol('AndonHealthInputPort');
export const ODOMETER_PORT = Symbol('OdometerPort');

export interface SaludStore {
  getActiveConfig(): Promise<HealthConfig | null>;
  listConfigs(): Promise<HealthConfig[]>;
  insertConfig(config: HealthConfig): Promise<void>;
  deactivateConfigs(): Promise<void>;
  getSnapshot(unidadId: string): Promise<HealthSnapshot | null>;
  upsertSnapshot(row: HealthSnapshot): Promise<void>;
  getActiveAlert(unidadId: string): Promise<HealthAlert | null>;
  insertAlert(alert: HealthAlert): Promise<void>;
  updateAlert(alert: HealthAlert): Promise<void>;
}

export function andonSourceAlerts(hasNoResuelto: boolean) {
  if (!hasNoResuelto) return [];
  return [
    {
      origin: AlertOrigin.SOURCE,
      severity: AlertPenaltySeverity.HIGH,
      category: 'MAINTENANCE' as const,
    },
  ];
}
