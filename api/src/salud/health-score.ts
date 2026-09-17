import { alertsScoreFrom, hasCriticalSafety } from './alerts-score';
import { weightOf } from './config-rules';
import {
  CAP_CRITICAL_SAFETY,
  CAP_SEVERELY_OVERDUE,
  DimensionAvailability,
  HealthCapReason,
  HealthDimensionId,
  HealthDriverType,
  HEALTH_STATUS_LABEL,
  HealthStatus,
  SEVERE_MAINTENANCE_SCORE,
} from './enums';
import {
  diasEntre,
  maintenanceAxisScore,
  minScore,
  remainingFromUsed,
} from './maintenance-score';
import {
  ComputeHealthInput,
  DimensionBreakdown,
  HealthCap,
  HealthComputation,
  HealthDriver,
  MaintenanceAxis,
} from './salud-types';

export function displayScore(final: number): number {
  return Math.min(100, Math.max(0, Math.round(final)));
}

export function weightedRaw(
  parts: { score: number; weight: number }[],
): number {
  const sum = parts.reduce((s, p) => s + p.weight, 0);
  if (sum <= 0) return 0;
  return parts.reduce((s, p) => s + (p.score * p.weight) / sum, 0);
}

/** H6: status sobre el entero de display. */
export function statusFromDisplay(score: number): HealthStatus {
  if (score >= 90) return HealthStatus.EXCELLENT;
  if (score >= 75) return HealthStatus.GOOD;
  if (score >= 60) return HealthStatus.ATTENTION;
  if (score >= 40) return HealthStatus.POOR;
  return HealthStatus.CRITICAL;
}

export function applyCaps(
  raw: number,
  ctx: { maintenanceScore: number | null; criticalSafety: boolean },
): { final: number; cap: HealthCap | null } {
  const caps: HealthCap[] = [];
  if (ctx.criticalSafety) {
    caps.push({
      maxScore: CAP_CRITICAL_SAFETY,
      reason: HealthCapReason.CRITICAL_SAFETY_ALERT,
    });
  }
  if (
    ctx.maintenanceScore != null &&
    ctx.maintenanceScore <= SEVERE_MAINTENANCE_SCORE
  ) {
    caps.push({
      maxScore: CAP_SEVERELY_OVERDUE,
      reason: HealthCapReason.SEVERELY_OVERDUE_MAINTENANCE,
    });
  }
  if (caps.length === 0) {
    return { final: raw, cap: null };
  }
  const cap = caps.reduce((a, b) => (a.maxScore <= b.maxScore ? a : b));
  const final = Math.min(raw, cap.maxScore);
  if (final < raw) {
    return { final, cap };
  }
  return { final: raw, cap: null };
}

function contribution(
  score: number,
  weight: number,
  applicableWeightSum: number,
): number {
  if (applicableWeightSum <= 0) return 0;
  return (score * weight) / applicableWeightSum;
}

function capMessage(cap: HealthCap): string {
  if (cap.reason === HealthCapReason.CRITICAL_SAFETY_ALERT) {
    return `Limitado a ${cap.maxScore}% por alerta crítica de seguridad.`;
  }
  return `Limitado a ${cap.maxScore}% por mantenimiento severamente vencido.`;
}

function kmDriver(remaining: number): HealthDriver {
  const abs = Math.abs(Math.round(remaining));
  const formatted = abs.toLocaleString('es-MX');
  if (remaining < 0) {
    return {
      type: HealthDriverType.MAINTENANCE_OVERDUE,
      message: `Servicio preventivo vencido (${formatted} km de más)`,
    };
  }
  return {
    type: HealthDriverType.MAINTENANCE_DUE,
    message: `Servicio preventivo en ${formatted} km`,
  };
}

function daysDriver(remaining: number): HealthDriver {
  const abs = Math.abs(Math.round(remaining));
  if (remaining < 0) {
    return {
      type: HealthDriverType.MAINTENANCE_OVERDUE,
      message: `Servicio preventivo vencido (${abs} días de más)`,
    };
  }
  return {
    type: HealthDriverType.MAINTENANCE_DUE,
    message: `Servicio preventivo en ${abs} días`,
  };
}

export function computeUnitHealth(
  input: ComputeHealthInput,
): HealthComputation {
  const dims = input.config.dimensions;
  const maintenanceWeight = weightOf(dims, HealthDimensionId.MAINTENANCE);
  const alertsWeight = weightOf(dims, HealthDimensionId.ALERTS);
  const inspectionsWeight = weightOf(dims, HealthDimensionId.INSPECTIONS);

  const inspectionAvail =
    input.inspection?.availability ?? DimensionAvailability.NOT_APPLICABLE;
  const inspectionScore =
    inspectionAvail === DimensionAvailability.APPLICABLE
      ? (input.inspection?.score ?? null)
      : null;

  if (!input.lastClosed?.visitaId?.trim()) {
    return {
      available: false,
      rawScore: null,
      finalScore: null,
      score: null,
      status: null,
      label: 'No disponible',
      breakdown: [
        {
          id: HealthDimensionId.MAINTENANCE,
          availability: DimensionAvailability.NO_DATA,
          score: null,
          weight: maintenanceWeight,
          contribution: null,
        },
        {
          id: HealthDimensionId.ALERTS,
          availability: DimensionAvailability.APPLICABLE,
          score: alertsScoreFrom(input.sourceAlerts),
          weight: alertsWeight,
          contribution: null,
        },
        {
          id: HealthDimensionId.INSPECTIONS,
          availability: inspectionAvail,
          score: inspectionScore,
          weight: inspectionsWeight,
          contribution: null,
        },
      ],
      cap: null,
      drivers: [
        {
          type: HealthDriverType.NO_DATA,
          message: 'No hay información suficiente para calcular la salud.',
        },
      ],
      message: 'No hay información suficiente para calcular la salud.',
    };
  }

  const kmDesde = (input.currentKm ?? input.lastClosed.km) - input.lastClosed.km;
  const diasDesde = diasEntre(input.lastClosed.cerradoAt, input.nowIso);
  const remainingKm = remainingFromUsed(kmDesde, input.tKm);
  const remainingDays = remainingFromUsed(diasDesde, input.tDias);
  const kmAxis: MaintenanceAxis = {
    remaining: remainingKm,
    interval: input.tKm,
    score: maintenanceAxisScore(remainingKm, input.tKm),
  };
  const timeAxis: MaintenanceAxis = {
    remaining: remainingDays,
    interval: input.tDias,
    score: maintenanceAxisScore(remainingDays, input.tDias),
  };
  const maintenanceScore = minScore([kmAxis.score, timeAxis.score]);
  const governingKm = kmAxis.score <= timeAxis.score;
  const governingRemaining = governingKm
    ? kmAxis.remaining
    : timeAxis.remaining;

  const alertsScore = alertsScoreFrom(input.sourceAlerts);

  const applicable: { id: HealthDimensionId; score: number; weight: number }[] =
    [
      {
        id: HealthDimensionId.MAINTENANCE,
        score: maintenanceScore,
        weight: maintenanceWeight,
      },
      {
        id: HealthDimensionId.ALERTS,
        score: alertsScore,
        weight: alertsWeight,
      },
    ];
  if (
    inspectionAvail === DimensionAvailability.APPLICABLE &&
    inspectionScore != null
  ) {
    applicable.push({
      id: HealthDimensionId.INSPECTIONS,
      score: inspectionScore,
      weight: inspectionsWeight,
    });
  }

  const weightSum = applicable.reduce((s, d) => s + d.weight, 0);
  const raw = weightedRaw(applicable);

  const { final, cap } = applyCaps(raw, {
    maintenanceScore,
    criticalSafety: hasCriticalSafety(input.sourceAlerts),
  });
  const score = displayScore(final);
  const status = statusFromDisplay(score);

  const breakdown: DimensionBreakdown[] = [
    {
      id: HealthDimensionId.MAINTENANCE,
      availability: DimensionAvailability.APPLICABLE,
      score: maintenanceScore,
      weight: maintenanceWeight,
      contribution:
        weightSum > 0
          ? contribution(maintenanceScore, maintenanceWeight, weightSum)
          : null,
      governing: governingKm ? 'km' : 'tiempo',
    },
    {
      id: HealthDimensionId.ALERTS,
      availability: DimensionAvailability.APPLICABLE,
      score: alertsScore,
      weight: alertsWeight,
      contribution:
        weightSum > 0
          ? contribution(alertsScore, alertsWeight, weightSum)
          : null,
    },
    {
      id: HealthDimensionId.INSPECTIONS,
      availability: inspectionAvail,
      score: inspectionScore,
      weight: inspectionsWeight,
      contribution:
        inspectionAvail === DimensionAvailability.APPLICABLE &&
        inspectionScore != null &&
        weightSum > 0
          ? contribution(inspectionScore, inspectionsWeight, weightSum)
          : null,
    },
  ];

  const drivers: HealthDriver[] = [];
  drivers.push(
    governingKm ? kmDriver(governingRemaining) : daysDriver(governingRemaining),
  );
  const hasAndon = input.sourceAlerts.some((a) => a.category === 'MAINTENANCE');
  if (hasAndon) {
    drivers.push({
      type: HealthDriverType.ANDON_OPEN,
      message: '1 alerta de mantenimiento vencido',
    });
  } else {
    drivers.push({
      type: HealthDriverType.NO_CRITICAL_FAILURES,
      message: 'Sin fallas críticas activas',
    });
  }
  if (cap) {
    drivers.push({ type: HealthDriverType.CAP, message: capMessage(cap) });
  }

  return {
    available: true,
    rawScore: raw,
    finalScore: final,
    score,
    status,
    label: HEALTH_STATUS_LABEL[status],
    breakdown,
    cap,
    drivers,
    message: null,
  };
}
