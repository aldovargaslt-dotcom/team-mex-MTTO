import { andonOpenAsSourceAlert } from './alerts-score';
import { defaultDimensions } from './config-rules';
import {
  AlertOrigin,
  AlertPenaltySeverity,
  DimensionAvailability,
  HealthCapReason,
  HealthDimensionId,
  HealthStatus,
} from './enums';
import {
  applyCaps,
  computeUnitHealth,
  displayScore,
  statusFromDisplay,
  weightedRaw,
} from './health-score';
import { ComputeHealthInput, HealthConfig } from './salud-types';

const CONFIG: HealthConfig = {
  id: 'cfg-1',
  version: 1,
  dimensions: defaultDimensions(),
  alertEnabled: true,
  alertThreshold: 60,
  recoveryThreshold: 65,
  alertSeverity: 'WARNING',
  isActive: true,
  createdAt: '2026-09-01T00:00:00.000Z',
  createdBy: 'seed',
};

const LAST = {
  unidadId: 'u1',
  visitaId: 'v1',
  tipoVehiculoId: 't1',
  km: 10000,
  cerradoAt: '2026-01-01T00:00:00.000Z',
};

function input(
  over: Partial<ComputeHealthInput> & {
    maintenanceScores?: { m: number; a: number; i: number };
  } = {},
): ComputeHealthInput {
  const { maintenanceScores: _ignored, ...rest } = over;
  return {
    config: CONFIG,
    lastClosed: LAST,
    currentKm: 10000,
    nowIso: '2026-01-01T00:00:00.000Z',
    tKm: 10000,
    tDias: 90,
    sourceAlerts: [],
    inspection: {
      availability: DimensionAvailability.APPLICABLE,
      score: 100,
    },
    ...rest,
  };
}

/** Inyecta scores de dimensión saltándose la curva (H1). */
function fromScores(m: number, a: number, i: number | null) {
  const parts = [
    { score: m, weight: 45 },
    { score: a, weight: 40 },
  ];
  if (i != null) parts.push({ score: i, weight: 15 });
  return weightedRaw(parts);
}

describe('H1 formula', () => {
  it('72/80/100 × 45/40/15 → raw 79.4 → display 79 GOOD', () => {
    const raw = fromScores(72, 80, 100);
    expect(raw).toBeCloseTo(79.4, 5);
    expect(displayScore(raw)).toBe(79);
    expect(statusFromDisplay(79)).toBe(HealthStatus.GOOD);
  });
});

describe('H6 status boundaries', () => {
  const cases: [number, HealthStatus][] = [
    [89.5, HealthStatus.EXCELLENT],
    [90, HealthStatus.EXCELLENT],
    [74.9, HealthStatus.GOOD],
    [75, HealthStatus.GOOD],
    [59.9, HealthStatus.ATTENTION],
    [60, HealthStatus.ATTENTION],
    [39.9, HealthStatus.POOR],
    [40, HealthStatus.POOR],
    [0, HealthStatus.CRITICAL],
    [100, HealthStatus.EXCELLENT],
  ];
  it.each(cases)('raw/final %s → %s', (value, status) => {
    const display = displayScore(value);
    expect(statusFromDisplay(display)).toBe(status);
  });
});

describe('H5 hard caps', () => {
  it('raw 95 + critical safety → final 30', () => {
    const { final, cap } = applyCaps(95, {
      maintenanceScore: 90,
      criticalSafety: true,
    });
    expect(final).toBe(30);
    expect(cap?.reason).toBe(HealthCapReason.CRITICAL_SAFETY_ALERT);
    expect(statusFromDisplay(displayScore(final))).toBe(HealthStatus.CRITICAL);
  });

  it('raw 90 + maintenance_score 10 → final 50', () => {
    const { final, cap } = applyCaps(90, {
      maintenanceScore: 10,
      criticalSafety: false,
    });
    expect(final).toBe(50);
    expect(cap?.reason).toBe(HealthCapReason.SEVERELY_OVERDUE_MAINTENANCE);
  });

  it('safety 30 gana a overdue 50', () => {
    const { final, cap } = applyCaps(95, {
      maintenanceScore: 5,
      criticalSafety: true,
    });
    expect(final).toBe(30);
    expect(cap?.reason).toBe(HealthCapReason.CRITICAL_SAFETY_ALERT);
  });
});

describe('H7 NO_DATA / N/A', () => {
  it('sin visita cerrada → No disponible (no 100)', () => {
    const result = computeUnitHealth(input({ lastClosed: null }));
    expect(result.available).toBe(false);
    expect(result.score).toBeNull();
    expect(result.label).toBe('No disponible');
    expect(
      result.breakdown.find((d) => d.id === HealthDimensionId.MAINTENANCE)
        ?.availability,
    ).toBe(DimensionAvailability.NO_DATA);
  });

  it('inspecciones N/A renormaliza 45+40', () => {
    const result = computeUnitHealth(
      input({
        inspection: {
          availability: DimensionAvailability.NOT_APPLICABLE,
          score: null,
        },
        nowIso: '2026-01-01T00:00:00.000Z',
        currentKm: 10000,
      }),
    );
    expect(result.available).toBe(true);
    const insp = result.breakdown.find(
      (d) => d.id === HealthDimensionId.INSPECTIONS,
    );
    expect(insp?.availability).toBe(DimensionAvailability.NOT_APPLICABLE);
    expect(insp?.contribution).toBeNull();
    const maint = result.breakdown.find(
      (d) => d.id === HealthDimensionId.MAINTENANCE,
    );
    const alerts = result.breakdown.find(
      (d) => d.id === HealthDimensionId.ALERTS,
    );
    expect((maint?.contribution ?? 0) + (alerts?.contribution ?? 0)).toBeCloseTo(
      result.rawScore ?? 0,
      5,
    );
  });
});

describe('H8 INACTIVA no cambia el score', () => {
  it('misma entrada produce el mismo resultado (activa no es input)', () => {
    const a = computeUnitHealth(input());
    const b = computeUnitHealth(input());
    expect(a.score).toBe(b.score);
    expect(a.rawScore).toBe(b.rawScore);
  });
});

describe('computeUnitHealth end-to-end sample', () => {
  it('recién cerrada sin Andon es Excelente o Buena', () => {
    const result = computeUnitHealth(input());
    expect(result.available).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.status).toBe(HealthStatus.EXCELLENT);
  });

  it('Andon abierto baja alerts_score a 70', () => {
    const result = computeUnitHealth(
      input({ sourceAlerts: [andonOpenAsSourceAlert()] }),
    );
    const alerts = result.breakdown.find(
      (d) => d.id === HealthDimensionId.ALERTS,
    );
    expect(alerts?.score).toBe(70);
  });

  it('fixture SAFETY CRITICAL aplica cap 30', () => {
    const result = computeUnitHealth(
      input({
        sourceAlerts: [
          {
            origin: AlertOrigin.SOURCE,
            severity: AlertPenaltySeverity.CRITICAL,
            category: 'SAFETY',
          },
        ],
      }),
    );
    expect(result.score).toBeLessThanOrEqual(30);
    expect(result.cap?.reason).toBe(HealthCapReason.CRITICAL_SAFETY_ALERT);
  });
});
