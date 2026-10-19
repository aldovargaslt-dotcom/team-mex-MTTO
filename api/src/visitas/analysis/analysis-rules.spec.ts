import {
  aggregateMoney,
  buildQueryPeriod,
  economicDate,
  normalizeWork,
  scheduledSeconds,
  utilization,
  validateSchedule,
  validateService,
  validateClaims,
} from './analysis-rules';

describe('AN-MTTO contract rules', () => {
  const now = new Date('2026-10-18T18:00:00Z');
  it('keeps exact signed cents and unknown fiscal coverage separate', () => {
    expect(
      aggregateMoney([
        { netCents: '9007199254740993', taxCents: null },
        { netCents: '100', taxCents: '16', sign: -1 },
        { netCents: null, taxCents: null },
      ]),
    ).toEqual({
      netCents: '9007199254740893',
      taxCents: null,
      totalCents: null,
      pending: 1,
      fiscalUnknown: 1,
    });
  });
  it('recognizes external multiday work on completion, rejects future and impossible dates', () => {
    expect(
      economicDate('2026-11-02', '2026-10-30', new Date('2026-11-03T12:00Z')),
    ).toBe('2026-11-02');
    expect(() => economicDate('2026-10-19', undefined, now)).toThrow();
    expect(() => economicDate('2026-02-30', undefined, now)).toThrow();
  });
  it('clips elapsed local reporting periods and rejects invalid ranges', () => {
    const period = buildQueryPeriod('2026-10-12', '2026-10-19', now);
    expect(period.from).toBe('2026-10-12T06:00:00.000Z');
    expect(period.to).toBe(now.toISOString());
    expect(() => buildQueryPeriod('2026-10-19', '2026-10-20', now)).toThrow();
    expect(() => buildQueryPeriod('2026-01-01', '2028-01-01', now)).toThrow();
  });
  it('never presents a percentage with partial coverage or a zero denominator', () => {
    expect(utilization(10800, 28800, 28800)).toEqual({
      value: 37.5,
      reason: null,
    });
    expect(utilization(10800, 28800, 28799).value).toBeNull();
    expect(utilization(0, 0, 0).reason).toBe('NOT_APPLICABLE');
    expect(() => utilization(30000, 28800, 28800)).toThrow();
  });
  it('distinguishes a closed schedule and missing schedule, unions overnight intervals', () => {
    const schedule = {
      weeklyDays: { '1': [{ start: '22:00', end: '02:00', endDayOffset: 1 }] },
      dateOverrides: {},
    };
    validateSchedule(schedule);
    expect(
      scheduledSeconds(
        schedule,
        new Date('2026-10-12T06:00Z'),
        new Date('2026-10-14T06:00Z'),
      ),
    ).toBe(14400);
    expect(
      scheduledSeconds(
        { weeklyDays: {}, dateOverrides: {} },
        new Date('2026-10-12T06:00Z'),
        new Date('2026-10-14T06:00Z'),
      ),
    ).toBe(0);
    expect(() =>
      validateSchedule({
        weeklyDays: { '1': [{ start: '09:00', end: '08:00' }] },
      }),
    ).toThrow();
  });
  it('counts calibration as adjustment and never silently calls a legacy part name a replacement', () => {
    expect(normalizeWork('D', 'Calibración y rotación').kind).toBe(
      'REVIEW_ADJUSTMENT',
    );
    expect(normalizeWork('B', 'Balatas delanteras / traseras').kind).toBe(
      'UNSPECIFIED',
    );
  });
  it('requires explicit type on direct services and rejects unknown payload fields', () => {
    const service = {
      unitId: '00000000-0000-4000-8000-000000000001',
      providerName: 'Taller',
      performedOn: '2026-10-17',
      maintenanceType: 'PREVENTIVE',
      workLines: [{ system: 'D', workCode: 'D_REPAIR', workKind: 'REPAIR' }],
      costLines: [
        {
          system: 'D',
          mode: 'SERVICE_ONLY',
          money: {
            state: 'RECORDED',
            inputTotalCents: '50000',
            currency: 'MXN',
            taxMode: 'INCLUDED',
            taxTreatment: 'TAXED',
            rateBps: 1600,
          },
        },
      ],
    };
    expect(validateService(service, now).costLines[0].money?.netCents).toBe(
      '43103',
    );
    expect(() =>
      validateService({ ...service, actor: 'forged' }, now),
    ).toThrow();
    expect(() =>
      validateService({ ...service, maintenanceType: undefined }, now),
    ).toThrow();
  });
  it('rejects overlapping supplier-piece claims and company stock exclusions', () => {
    const source = {
      id: 'op',
      kind: 'EXTERNAL',
      qty: 3,
      version: 1,
      unidadId: 'unit',
    };
    const claims = [{ sourceOpId: 'op', sourceVersion: 1, from: 0, to: 2 }];
    expect(() =>
      validateClaims(
        [...claims, { ...claims[0], from: 1, to: 3 }],
        [source],
        'unit',
      ),
    ).toThrow();
    expect(() =>
      validateClaims(claims, [{ ...source, kind: 'CONSUMPTION' }], 'unit'),
    ).toThrow();
    expect(() =>
      validateClaims(claims, [{ ...source, version: 2 }], 'unit'),
    ).toThrow();
  });
});
