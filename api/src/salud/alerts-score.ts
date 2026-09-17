import {
  ALERT_PENALTIES,
  AlertOrigin,
  AlertPenaltySeverity,
} from './enums';
import { SourceAlertInput } from './salud-types';

export function alertsScoreFrom(alerts: SourceAlertInput[]): number {
  let penalty = 0;
  for (const alert of alerts) {
    if (alert.origin !== AlertOrigin.SOURCE) {
      continue;
    }
    penalty += ALERT_PENALTIES[alert.severity] ?? 0;
  }
  return Math.max(0, 100 - penalty);
}

export function andonOpenAsSourceAlert(): SourceAlertInput {
  return {
    origin: AlertOrigin.SOURCE,
    severity: AlertPenaltySeverity.HIGH,
    category: 'MAINTENANCE',
  };
}

export function derivedHealthAlert(): SourceAlertInput {
  return {
    origin: AlertOrigin.DERIVED,
    severity: AlertPenaltySeverity.HIGH,
    category: 'HEALTH',
  };
}

export function hasCriticalSafety(alerts: SourceAlertInput[]): boolean {
  return alerts.some(
    (a) =>
      a.origin === AlertOrigin.SOURCE &&
      a.severity === AlertPenaltySeverity.CRITICAL &&
      a.category === 'SAFETY',
  );
}
