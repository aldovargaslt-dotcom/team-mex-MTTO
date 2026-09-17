import {
  AlertOrigin,
  AlertPenaltySeverity,
  DimensionAvailability,
  EstadoHealthAlert,
  HealthAlertType,
  HealthCapReason,
  HealthDimensionId,
  HealthDriverType,
  HealthStatus,
  InboxAlertSeverity,
} from './enums';

export type DimensionWeight = {
  id: HealthDimensionId;
  weight: number;
};

export type HealthConfig = {
  id: string;
  version: number;
  dimensions: DimensionWeight[];
  alertEnabled: boolean;
  alertThreshold: number;
  recoveryThreshold: number;
  alertSeverity: InboxAlertSeverity;
  isActive: boolean;
  createdAt: string;
  createdBy: string | null;
};

export type LastClosedForHealth = {
  unidadId: string;
  visitaId: string;
  tipoVehiculoId: string;
  km: number;
  cerradoAt: string;
};

export type SourceAlertInput = {
  origin: AlertOrigin;
  severity: AlertPenaltySeverity;
  category?: 'SAFETY' | 'MAINTENANCE' | 'HEALTH';
};

export type MaintenanceAxis = {
  remaining: number;
  interval: number;
  score: number;
};

export type DimensionBreakdown = {
  id: HealthDimensionId;
  availability: DimensionAvailability;
  score: number | null;
  weight: number;
  contribution: number | null;
  governing?: string | null;
};

export type HealthCap = {
  maxScore: number;
  reason: HealthCapReason;
};

export type HealthDriver = {
  type: HealthDriverType;
  message: string;
};

export type HealthComputation = {
  available: boolean;
  rawScore: number | null;
  finalScore: number | null;
  score: number | null;
  status: HealthStatus | null;
  label: string;
  breakdown: DimensionBreakdown[];
  cap: HealthCap | null;
  drivers: HealthDriver[];
  message: string | null;
};

export type HealthSnapshot = {
  unidadId: string;
  score: number | null;
  rawScore: number | null;
  status: HealthStatus | null;
  computedAt: string;
  configVersion: number;
};

export type HealthAlert = {
  id: string;
  unidadId: string;
  type: HealthAlertType;
  estado: EstadoHealthAlert;
  scoreAtOpen: number;
  thresholdAtOpen: number;
  openedAt: string;
  resolvedAt: string | null;
  resolvedReason: string | null;
};

export type UnidadHealthRef = {
  unidadId: string;
  tipoVehiculoId: string;
  numeroInterno: string;
  activa: boolean;
};

export type ComputeHealthInput = {
  config: HealthConfig;
  lastClosed: LastClosedForHealth | null;
  currentKm: number | null;
  nowIso: string;
  tKm: number;
  tDias: number;
  sourceAlerts: SourceAlertInput[];
  inspection?: {
    availability: DimensionAvailability;
    score: number | null;
  };
};
