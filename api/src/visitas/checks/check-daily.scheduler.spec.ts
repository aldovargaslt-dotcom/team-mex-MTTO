import { CheckDailyScheduler } from './check-daily.scheduler';

describe('CheckDailyScheduler', () => {
  it('does not invoke the command while daily generation is disabled', async () => {
    const checks = { generateDailyVehicleChecks: jest.fn() };
    const scheduler = new CheckDailyScheduler(
      { get: () => 'false' } as never,
      checks as never,
    );
    expect(scheduler.run('facility', '2026-10-02', 'cmd-1')).toEqual({
      enabled: false,
    });
    expect(checks.generateDailyVehicleChecks).not.toHaveBeenCalled();
  });
});

describe('daily lifecycle and retries', () => {
  const original = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = original;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });
  function fixture(enabled?: string) {
    const checks = {
      generateDailyVehicleChecks: jest.fn().mockResolvedValue({ items: [] }),
    };
    const db = {
      manager: { find: jest.fn().mockResolvedValue([{ id: 'mex' }]) },
    };
    const scheduler = new CheckDailyScheduler(
      { get: () => enabled } as never,
      checks as never,
      db as never,
    );
    return { checks, db, scheduler };
  }
  it('runs immediately and every minute; stops on shutdown', async () => {
    process.env.NODE_ENV = 'development';
    jest.useFakeTimers();
    const { checks, scheduler } = fixture();
    scheduler.onApplicationBootstrap();
    await jest.advanceTimersByTimeAsync(0);
    expect(checks.generateDailyVehicleChecks).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(60_000);
    expect(checks.generateDailyVehicleChecks).toHaveBeenCalledTimes(2);
    scheduler.onApplicationShutdown();
    await jest.advanceTimersByTimeAsync(60_000);
    expect(checks.generateDailyVehicleChecks).toHaveBeenCalledTimes(2);
  });
  it('retries a failed invocation and does not leave a stuck running flag', async () => {
    const { checks, scheduler } = fixture();
    checks.generateDailyVehicleChecks.mockRejectedValueOnce(
      new Error('temporary'),
    );
    await scheduler.tick();
    await scheduler.tick();
    expect(checks.generateDailyVehicleChecks).toHaveBeenCalledTimes(2);
  });
  it('does not run the lifecycle when explicitly disabled or inside tests', async () => {
    process.env.NODE_ENV = 'test';
    jest.useFakeTimers();
    const a = fixture();
    a.scheduler.onApplicationBootstrap();
    process.env.NODE_ENV = 'development';
    const b = fixture('false');
    b.scheduler.onApplicationBootstrap();
    await jest.advanceTimersByTimeAsync(120_000);
    expect(a.checks.generateDailyVehicleChecks).not.toHaveBeenCalled();
    expect(b.checks.generateDailyVehicleChecks).not.toHaveBeenCalled();
  });
});
