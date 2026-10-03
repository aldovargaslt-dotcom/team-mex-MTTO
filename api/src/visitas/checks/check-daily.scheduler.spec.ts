import { CheckDailyScheduler } from './check-daily.scheduler';

describe('CheckDailyScheduler', () => {
  it('does not invoke the command while daily generation is disabled', async () => {
    const checks = { generateDailyVehicleChecks: jest.fn() };
    const scheduler = new CheckDailyScheduler(
      { get: () => 'false' } as never,
      checks as never,
    );
    expect(scheduler.run('facility', '2026-10-02', 'cmd-1')).toEqual({ enabled: false });
    expect(checks.generateDailyVehicleChecks).not.toHaveBeenCalled();
  });
});
