import {
  DEFAULT_ALERTS_WEIGHT,
  DEFAULT_ALERT_SEVERITY,
  DEFAULT_ALERT_THRESHOLD,
  DEFAULT_INSPECTIONS_WEIGHT,
  DEFAULT_MAINTENANCE_WEIGHT,
  DEFAULT_RECOVERY_THRESHOLD,
  HealthDimensionId,
  InboxAlertSeverity,
  KNOWN_DIMENSION_IDS,
} from './enums';
import { DimensionWeight } from './salud-types';

const INBOX_SEVERITIES: InboxAlertSeverity[] = [
  'LOW',
  'INFO',
  'WARNING',
  'CRITICAL',
];

export function defaultDimensions(): DimensionWeight[] {
  return [
    { id: HealthDimensionId.MAINTENANCE, weight: DEFAULT_MAINTENANCE_WEIGHT },
    { id: HealthDimensionId.ALERTS, weight: DEFAULT_ALERTS_WEIGHT },
    { id: HealthDimensionId.INSPECTIONS, weight: DEFAULT_INSPECTIONS_WEIGHT },
  ];
}

export function weightOf(
  dimensions: DimensionWeight[],
  id: HealthDimensionId,
): number {
  return dimensions.find((d) => d.id === id)?.weight ?? 0;
}

/** H2: enteros 0–100, suma exactamente 100, ids conocidos y únicos. */
export function validateWeights(dimensions: DimensionWeight[]): string | null {
  if (!Array.isArray(dimensions) || dimensions.length === 0) {
    return 'Indique un peso por cada dimensión.';
  }
  const seen = new Set<string>();
  let sum = 0;
  for (const dim of dimensions) {
    if (!KNOWN_DIMENSION_IDS.includes(dim.id)) {
      return `Dimensión desconocida: ${String(dim.id)}.`;
    }
    if (seen.has(dim.id)) {
      return 'Cada dimensión puede aparecer una sola vez.';
    }
    seen.add(dim.id);
    if (
      !Number.isInteger(dim.weight) ||
      dim.weight < 0 ||
      dim.weight > 100
    ) {
      return 'Cada peso debe ser un entero entre 0 y 100.';
    }
    sum += dim.weight;
  }
  for (const id of KNOWN_DIMENSION_IDS) {
    if (!seen.has(id)) {
      return 'Faltan pesos de mantenimiento, alertas o inspecciones.';
    }
  }
  if (sum !== 100) {
    return `Los pesos deben sumar 100%. Actualmente suman ${sum}%.`;
  }
  return null;
}

export function validateAlertThresholds(
  alertThreshold: number,
  recoveryThreshold: number,
): string | null {
  if (
    !Number.isInteger(alertThreshold) ||
    alertThreshold < 0 ||
    alertThreshold > 100
  ) {
    return 'El porcentaje de alerta debe ser un entero entre 0 y 100.';
  }
  if (
    !Number.isInteger(recoveryThreshold) ||
    recoveryThreshold < 0 ||
    recoveryThreshold > 100
  ) {
    return 'El porcentaje de recuperación debe ser un entero entre 0 y 100.';
  }
  if (!(recoveryThreshold > alertThreshold)) {
    return 'El porcentaje de recuperación debe ser mayor al porcentaje de alerta.';
  }
  return null;
}

export function validateAlertSeverity(
  severity: string,
): severity is InboxAlertSeverity {
  return INBOX_SEVERITIES.includes(severity as InboxAlertSeverity);
}

export function defaultHealthConfigValues() {
  return {
    dimensions: defaultDimensions(),
    alertEnabled: true,
    alertThreshold: DEFAULT_ALERT_THRESHOLD,
    recoveryThreshold: DEFAULT_RECOVERY_THRESHOLD,
    alertSeverity: DEFAULT_ALERT_SEVERITY,
  };
}
