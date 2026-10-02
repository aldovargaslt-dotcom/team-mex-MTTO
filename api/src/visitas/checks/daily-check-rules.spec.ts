import { dailyEligibility, scheduleDue } from './daily-check-rules';
import { PhysicalStateSnapshot } from '../../flota/physical-state-read.port';
const known = (
  physicalState: 'EN_PATIO' | 'EN_RUTA' | 'EN_TALLER' | 'INACTIVA',
): PhysicalStateSnapshot => ({
  physicalKnowledge: 'KNOWN',
  physicalState,
  version: 1,
  observedAt: new Date(),
  operationalInconsistency: false,
});
describe('EWO-016 daily policy', () => {
  it('requires administrative ACTIVA and authoritative consistent EN_PATIO', () => {
    expect(dailyEligibility('ACTIVA', known('EN_PATIO'))).toBeNull();
    for (const state of ['EN_RUTA', 'EN_TALLER', 'INACTIVA'] as const)
      expect(dailyEligibility('ACTIVA', known(state))).toBe(
        'PHYSICAL_STATE_INELIGIBLE',
      );
    expect(dailyEligibility('INACTIVA', known('EN_PATIO'))).toBe(
      'UNIT_INACTIVE',
    );
    expect(
      dailyEligibility('ACTIVA', {
        physicalKnowledge: 'UNAVAILABLE',
        physicalState: null,
      }),
    ).toBe('PHYSICAL_SOURCE_UNAVAILABLE');
    expect(
      dailyEligibility('ACTIVA', {
        ...known('EN_PATIO'),
        operationalInconsistency: true,
      } as PhysicalStateSnapshot),
    ).toBe('PHYSICAL_SOURCE_INCONSISTENT');
  });
  it('uses configured local schedule and Mexico City date, including midnight', () => {
    expect(scheduleDue(new Date('2026-10-02T05:59:59.999Z'), '23:59')).toEqual({
      operationalDate: '2026-10-01',
      due: true,
    });
    expect(scheduleDue(new Date('2026-10-02T06:00:00Z'), '06:00')).toEqual({
      operationalDate: '2026-10-02',
      due: false,
    });
    expect(() => scheduleDue(new Date(), '25:00')).toThrow();
    expect(() => scheduleDue(new Date(), '')).toThrow();
  });
});

import { ConfigService } from '@nestjs/config';
import {
  DailyCheckScheduler,
  DailyChecksService,
} from './daily-checks.service';
describe('EWO-016 scheduler configuration boundary', () => {
  const generate = jest.fn().mockResolvedValue({ results: [] });
  beforeEach(() => generate.mockClear());
  it('is disabled without explicit enablement; enabled missing schedule fails closed', async () => {
    expect(
      await new DailyCheckScheduler(new ConfigService({}), {
        generate,
      } as unknown as DailyChecksService).tick(),
    ).toEqual({ status: 'DISABLED' });
    expect(generate).not.toHaveBeenCalled();
    await expect(
      new DailyCheckScheduler(
        new ConfigService({ CHECK_DAILY_ENABLED: 'true' }),
        { generate } as unknown as DailyChecksService,
      ).tick(),
    ).rejects.toThrow('DAILY_CONFIGURATION_REQUIRED');
  });
  it('invokes only the common command with configured facility and server SYSTEM identity', async () => {
    const scheduler = new DailyCheckScheduler(
      new ConfigService({
        CHECK_DAILY_ENABLED: 'true',
        CHECK_DAILY_SCHEDULES: JSON.stringify([
          {
            facilityId: 'mex',
            localTime: '06:00',
            actorSubject: 'system|daily',
            actorName: 'Daily fixture',
          },
        ]),
      }),
      { generate } as unknown as DailyChecksService,
    );
    await scheduler.tick(new Date('2026-10-02T11:59:59Z'));
    expect(generate).not.toHaveBeenCalled();
    await scheduler.tick(new Date('2026-10-02T12:00:00Z'));
    expect(generate).toHaveBeenCalledWith(
      'mex',
      '2026-10-02',
      expect.objectContaining({
        subject: 'system|daily',
        roles: ['SYSTEM'],
        facilityScopes: ['mex'],
      }),
      'daily:mex:2026-10-02',
    );
  });
});
