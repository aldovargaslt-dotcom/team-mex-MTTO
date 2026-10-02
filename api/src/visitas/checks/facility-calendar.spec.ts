import { operationalDay } from './facility-calendar';

describe('S1-T10 operational calendar', () => {
  it('uses Mexico City midnight, independently of host UTC', () => {
    const last = operationalDay(new Date('2026-10-02T05:59:59.999Z'));
    expect(last.operationalDate).toBe('2026-10-01');
    expect(last.dayStartInstant.toISOString()).toBe('2026-10-01T06:00:00.000Z');
    expect(last.dayEndInstant.toISOString()).toBe('2026-10-02T06:00:00.000Z');
    expect(
      operationalDay(new Date('2026-10-02T06:00:00Z')).operationalDate,
    ).toBe('2026-10-02');
  });
  it('derives historic DST calendar boundaries, not a fixed 24-hour TTL', () => {
    const day = operationalDay(new Date('2021-04-04T18:00:00Z'));
    expect(day.dayEndInstant.getTime() - day.dayStartInstant.getTime()).toBe(
      23 * 3600000,
    );
  });
  it('rejects an invalid instant', () => {
    expect(() => operationalDay(new Date(NaN))).toThrow();
  });
});
