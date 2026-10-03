import { departureBlockReasons } from './departure-policy.rules';

const ready = {
  unitActive: true,
  journeyInRoute: false,
  physical: {
    physicalKnowledge: 'KNOWN' as const,
    physicalState: 'EN_PATIO' as const,
    physicalSource: 'FLOTA_TRANSITION' as const,
    version: 3,
    observedAt: new Date('2026-10-03T10:00:00Z'),
    operationalInconsistency: false,
  },
  insurance: {
    unidadId: 'u1',
    status: 'PRESENT_VALID' as const,
    reason: null,
    operationalDate: '2026-10-03',
    documentId: 'd1',
    version: 2,
    expirationDate: '2026-10-03',
  },
  check: {
    activeCheck: null,
    lastCompleted: {
      checkId: 'c1',
      snapshotHash: 'a'.repeat(64),
      result: 'FIT' as const,
      valid: true,
      reason: null,
      version: 8,
      dayEndInstant: new Date('2026-10-04T06:00:00Z'),
    },
  },
  maintenanceBlocking: false,
};

describe('departureBlockReasons', () => {
  it.each(['FIT', 'FIT_WITH_OBSERVATION'] as const)(
    'allows a ready unit with a valid %s CHECK',
    (result) => {
      expect(
        departureBlockReasons({
          ...ready,
          check: {
            ...ready.check,
            lastCompleted: { ...ready.check.lastCompleted!, result },
          },
        }),
      ).toEqual([]);
    },
  );

  it('returns every hard blocker instead of hiding later causes', () => {
    expect(
      departureBlockReasons({
        ...ready,
        physical: {
          physicalKnowledge: 'UNINITIALIZED' as const,
          physicalState: null,
        },
        insurance: {
          ...ready.insurance,
          status: 'MISSING' as const,
          reason: 'MISSING_INSURANCE' as const,
          documentId: null,
          version: null,
          expirationDate: null,
        },
        check: { activeCheck: null, lastCompleted: null },
        maintenanceBlocking: true,
      }),
    ).toEqual([
      'PHYSICAL_STATE_REQUIRED',
      'INSURANCE_REQUIRED',
      'CHECK_REQUIRED',
      'MAINTENANCE_BLOCKING',
    ]);
  });

  it.each([
    ['EXPIRED', 'CHECK_EXPIRED'],
    ['INVALIDATED', 'CHECK_INVALIDATED'],
    ['UNSIGNED', 'CHECK_UNSIGNED'],
  ] as const)('maps invalid CHECK reason %s', (reason, expected) => {
    expect(
      departureBlockReasons({
        ...ready,
        check: {
          activeCheck: null,
          lastCompleted: {
            ...ready.check.lastCompleted!,
            valid: false,
            reason,
          },
        },
      }),
    ).toContain(expected);
  });

  it('rejects UNFIT but not a valid observation result', () => {
    expect(
      departureBlockReasons({
        ...ready,
        check: {
          activeCheck: null,
          lastCompleted: {
            ...ready.check.lastCompleted!,
            result: 'UNFIT',
          },
        },
      }),
    ).toEqual(['CHECK_UNFIT']);
  });

  it('rejects an inactive unit or an already-open logistics journey', () => {
    expect(
      departureBlockReasons({
        ...ready,
        unitActive: false,
        journeyInRoute: true,
      }),
    ).toEqual(['UNIT_INACTIVE', 'JOURNEY_ALREADY_IN_ROUTE']);
  });
});
