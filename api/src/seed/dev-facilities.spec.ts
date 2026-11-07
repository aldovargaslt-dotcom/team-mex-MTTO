import { devFacilitiesEnabled, DEV_SUCURSALES } from './dev-facilities';

describe('devFacilitiesEnabled (EWO-069 AC-4)', () => {
  it('is on only for local development', () => {
    expect(devFacilitiesEnabled({ NODE_ENV: 'development' })).toBe(true);
  });
  it.each(['production', 'test', undefined, 'staging', ''])(
    'is off for NODE_ENV=%s',
    (NODE_ENV) => {
      expect(devFacilitiesEnabled({ NODE_ENV })).toBe(false);
    },
  );
  it('is off when a remote DATABASE_URL is set, even in development', () => {
    expect(
      devFacilitiesEnabled({
        NODE_ENV: 'development',
        DATABASE_URL: 'postgresql://x@host/db',
      }),
    ).toBe(false);
  });
  it('lists monterrey plus the 9 release sucursales without duplicates', () => {
    const ids = DEV_SUCURSALES.map((s) => s.id);
    expect(ids).toHaveLength(10);
    expect(new Set(ids).size).toBe(10);
    expect(ids).toContain('monterrey');
  });
});
