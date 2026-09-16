export const SALUD_SCHEMA = 'salud';

export const PREVENTIVE_WINDOW_RATIO = 0.15;

export const DEFAULT_MAINTENANCE_WEIGHT = 45;
export const DEFAULT_ALERTS_WEIGHT = 40;
export const DEFAULT_INSPECTIONS_WEIGHT = 15;

export const DEFAULT_ALERT_THRESHOLD = 60;
export const DEFAULT_RECOVERY_THRESHOLD = 65;

export const SEVERE_MAINTENANCE_SCORE = 14;
export const CAP_CRITICAL_SAFETY = 30;
export const CAP_SEVERELY_OVERDUE = 50;

export enum HealthDimensionId {
  MAINTENANCE = 'maintenance',
  ALERTS = 'alerts',
  INSPECTIONS = 'inspections',
}

export const KNOWN_DIMENSION_IDS: HealthDimensionId[] = [
  HealthDimensionId.MAINTENANCE,
  HealthDimensionId.ALERTS,
  HealthDimensionId.INSPECTIONS,
];

export enum HealthStatus {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  ATTENTION = 'ATTENTION',
  POOR = 'POOR',
  CRITICAL = 'CRITICAL',
}

export const HEALTH_STATUS_LABEL: Record<HealthStatus, string> = {
  [HealthStatus.EXCELLENT]: 'Excelente',
  [HealthStatus.GOOD]: 'Buena',
  [HealthStatus.ATTENTION]: 'Atención',
  [HealthStatus.POOR]: 'Deficiente',
  [HealthStatus.CRITICAL]: 'Crítica',
};

export enum DimensionAvailability {
  APPLICABLE = 'APPLICABLE',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
  NO_DATA = 'NO_DATA',
}

export enum AlertOrigin {
  SOURCE = 'SOURCE',
  DERIVED = 'DERIVED',
}

export enum AlertPenaltySeverity {
  INFO = 'INFO',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export const ALERT_PENALTIES: Record<AlertPenaltySeverity, number> = {
  [AlertPenaltySeverity.INFO]: 2,
  [AlertPenaltySeverity.LOW]: 5,
  [AlertPenaltySeverity.MEDIUM]: 15,
  [AlertPenaltySeverity.HIGH]: 30,
  [AlertPenaltySeverity.CRITICAL]: 60,
};

export enum HealthCapReason {
  CRITICAL_SAFETY_ALERT = 'CRITICAL_SAFETY_ALERT',
  SEVERELY_OVERDUE_MAINTENANCE = 'SEVERELY_OVERDUE_MAINTENANCE',
}

export enum HealthDriverType {
  MAINTENANCE_DUE = 'MAINTENANCE_DUE',
  MAINTENANCE_OVERDUE = 'MAINTENANCE_OVERDUE',
  ANDON_OPEN = 'ANDON_OPEN',
  NO_CRITICAL_FAILURES = 'NO_CRITICAL_FAILURES',
  NO_DATA = 'NO_DATA',
  CAP = 'CAP',
}

export enum HealthAlertType {
  HEALTH_BELOW_THRESHOLD = 'HEALTH_BELOW_THRESHOLD',
}

export enum EstadoHealthAlert {
  ABIERTO = 'ABIERTO',
  RESUELTO = 'RESUELTO',
}

export type InboxAlertSeverity = 'LOW' | 'INFO' | 'WARNING' | 'CRITICAL';

export const DEFAULT_ALERT_SEVERITY: InboxAlertSeverity = 'WARNING';
