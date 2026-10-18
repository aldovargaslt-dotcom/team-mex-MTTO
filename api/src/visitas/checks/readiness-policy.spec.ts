import { checkDueAt, resolveReadinessSettings } from './readiness-policy';
import { ReadinessSettings } from './readiness-settings.entity';

describe('UR-06/07/17 daily-only ABC policy', () => {
  it('uses Mexico City calendar midnight, rather than 24h from a daily review', () => {
    expect(
      checkDueAt(new Date('2026-10-17T19:30:00Z'), {
        mode: 'DAILY',
      }).toISOString(),
    ).toBe('2026-10-18T06:00:00.000Z');
  });
  it('preserves local time and milliseconds for weekly validity', () => {
    expect(
      checkDueAt(new Date('2026-10-17T19:30:12.123Z'), {
        mode: 'WEEKLY',
      }).toISOString(),
    ).toBe('2026-10-24T19:30:12.123Z');
  });
  it.each([
    ['2026-01-31T19:30:00Z', '2026-02-28T19:30:00.000Z'],
    ['2028-01-31T19:30:00Z', '2028-02-29T19:30:00.000Z'],
    ['2026-12-31T19:30:00Z', '2027-01-31T19:30:00.000Z'],
  ])(
    'clamps calendar-month validity without overflowing: %s',
    (anchor, expected) => {
      expect(
        checkDueAt(new Date(anchor), { mode: 'MONTHLY' }).toISOString(),
      ).toBe(expected);
    },
  );
  it('uses an explicit elapsed duration for custom hours', () => {
    expect(
      checkDueAt(new Date('2026-10-17T19:30:00Z'), {
        mode: 'CUSTOM',
        hours: 12,
      }).toISOString(),
    ).toBe('2026-10-18T07:30:00.000Z');
  });
  it.each([undefined, 0, -1, 1.2, 8761])(
    'rejects invalid custom hours %s',
    (hours) => {
      expect(() => checkDueAt(new Date(), { mode: 'CUSTOM', hours })).toThrow();
    },
  );
  it('ignores historical fleet/category/unit intervals and Stock usage', () => {
    const rows = [
      {
        facilityId: 'mex',
        scope: 'FLEET',
        targetId: '*',
        interval: { mode: 'DAILY' },
        usage: 'DAILY',
        version: 1,
      },
      {
        facilityId: 'mex',
        scope: 'CATEGORY',
        targetId: 'type',
        interval: { mode: 'WEEKLY' },
        usage: 'STOCK',
        version: 2,
      },
      {
        facilityId: 'mex',
        scope: 'UNIT',
        targetId: 'unit',
        interval: { mode: 'MONTHLY' },
        usage: null,
        version: 3,
      },
      {
        facilityId: 'other',
        scope: 'UNIT',
        targetId: 'unit',
        interval: { mode: 'CUSTOM', hours: 1000 },
        usage: 'DAILY',
        version: 100,
      },
    ] as ReadinessSettings[];
    expect(resolveReadinessSettings(rows, 'mex', 'unit', 'type')).toMatchObject(
      {
        interval: { mode: 'DAILY' },
        usage: 'DAILY',
        fingerprint: 'daily-only-v1',
      },
    );
    expect(resolveReadinessSettings([], 'mex', 'unit', 'type')).toMatchObject({
      interval: { mode: 'DAILY' },
      usage: 'DAILY',
      fingerprint: 'daily-only-v1',
    });
  });
});
