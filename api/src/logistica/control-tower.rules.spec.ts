import { composeTowerRow, configuredUrgency } from './control-tower.rules';

const base = {
  unidadId: 'unidad-1',
  identification: { numeroInterno: 'U-101', placas: 'ABC-123' },
  physical: {
    physicalKnowledge: 'KNOWN' as const,
    physicalState: 'EN_PATIO' as const,
    physicalSource: 'FLOTA_MOVEMENT' as const,
    version: 3,
    observedAt: new Date('2026-10-02T15:00:00.000Z'),
    operationalInconsistency: false,
  },
  journey: { inRoute: false, salidaAt: null, returnDueAt: null },
  insurance: {
    status: 'PRESENT_VALID' as const,
    operationalDate: '2026-10-02',
    documentId: 'doc-1',
    version: 2,
    expirationDate: '2026-10-03',
    reason: null,
  },
  check: {
    activeCheck: null,
    lastCompleted: {
      checkId: 'check-1',
      snapshotHash: 'hash',
      result: 'FIT' as const,
      valid: true,
      reason: null,
      version: 4,
      dayEndInstant: new Date('2026-10-03T06:00:00.000Z'),
    },
  },
  maintenanceBlocking: false,
  now: new Date('2026-10-02T18:00:00.000Z'),
  urgencyConfig: { attentionWindowSeconds: 7200, version: 1 },
};

describe('Control Tower rules', () => {
  it('mantiene cuatro ejes independientes y no infiere taller por una correctiva no bloqueante', () => {
    const row = composeTowerRow(base);
    expect(row.physicalState).toBe('EN_PATIO');
    expect(row.readiness).toBe('LISTA');
    expect(row.checkState).toBe('APTA');
    expect(row.urgency).toBe('NORMAL');
    expect(row.activeCauses).toEqual([]);
  });

  it('acepta EN_TALLER sólo cuando la fuente física lo declara', () => {
    const row = composeTowerRow({
      ...base,
      physical: {
        ...base.physical,
        physicalState: 'EN_TALLER',
        physicalSource: 'FLOTA_TRANSITION',
      },
    });
    expect(row.physicalState).toBe('EN_TALLER');
    expect(row.physicalSource).toBe('FLOTA_TRANSITION');
  });

  it('nunca produce Lista ni Normal si la fuente física es desconocida', () => {
    const row = composeTowerRow({
      ...base,
      physical: {
        physicalKnowledge: 'UNAVAILABLE' as const,
        physicalState: null,
      },
    });
    expect(row.readiness).toBe('BLOQUEADA');
    expect(row.urgency).toBe('CRITICAL');
    expect(row.staleSources).toContain('PHYSICAL_STATE');
  });

  it('mantiene Despachada y causas críticas visibles para una unidad en ruta', () => {
    const row = composeTowerRow({
      ...base,
      journey: {
        inRoute: true,
        salidaAt: new Date('2026-10-02T07:00:00.000Z'),
        returnDueAt: new Date('2026-10-02T15:00:00.000Z'),
      },
      insurance: {
        ...base.insurance,
        status: 'EXPIRED_OR_EXPIRES_TODAY',
        reason: 'INVALID_INSURANCE',
      },
    });
    expect(row.readiness).toBe('DESPACHADA');
    expect(row.urgency).toBe('CRITICAL');
    expect(row.activeCauses.map((cause) => cause.code)).toContain(
      'INVALID_INSURANCE',
    );
  });

  it('usa máximo de severidad y el umbral configurado: 2h Atención, más de 2h Crítica', () => {
    expect(configuredUrgency(7200, 7200)).toBe('ATTENTION');
    expect(configuredUrgency(7201, 7200)).toBe('CRITICAL');
    expect(configuredUrgency(0, 7200)).toBeNull();
  });
});
