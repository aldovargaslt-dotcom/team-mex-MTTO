import {
  postgresConnectionOptions,
  resolvePostgresSsl,
  typeormRootOptions,
} from './postgres-options';

function env(map: Record<string, string | undefined>) {
  return {
    get<T = string>(key: string, defaultValue?: T): T | undefined {
      if (Object.prototype.hasOwnProperty.call(map, key)) {
        return map[key] as T | undefined;
      }
      return defaultValue;
    },
  };
}

describe('postgres-options (Railway / Vercel)', () => {
  it('uses DATABASE_URL when present', () => {
    const opts = postgresConnectionOptions(
      env({
        DATABASE_URL: 'postgresql://postgres:x@postgres.railway.internal:5432/railway',
      }),
    );
    expect(opts.url).toContain('railway.internal');
    expect(opts.host).toBeUndefined();
    expect(opts.ssl).toBeUndefined();
  });

  it('falls back to DB_* for local docker', () => {
    const opts = postgresConnectionOptions(env({}));
    expect(opts.host).toBe('localhost');
    expect(opts.database).toBe('team_mex_mtto');
    expect(opts.ssl).toBeUndefined();
  });

  it('enables TLS for public Railway proxy and Supabase', () => {
    expect(
      resolvePostgresSsl(
        env({}),
        'postgresql://postgres:x@maglev.proxy.rlwy.net:12345/railway',
      ),
    ).toEqual({ rejectUnauthorized: false });
    expect(
      resolvePostgresSsl(
        env({}),
        'postgresql://postgres:x@db.abc.supabase.co:5432/postgres',
      ),
    ).toEqual({ rejectUnauthorized: false });
  });

  it('honors DB_SSL override and sslmode=disable', () => {
    expect(
      resolvePostgresSsl(
        env({ DB_SSL: 'true' }),
        'postgresql://postgres:x@postgres.railway.internal:5432/railway',
      ),
    ).toEqual({ rejectUnauthorized: false });
    expect(
      resolvePostgresSsl(
        env({}),
        'postgresql://postgres:x@maglev.proxy.rlwy.net:12345/railway?sslmode=disable',
      ),
    ).toBeUndefined();
  });

  it('keeps synchronize default true for demo seed', () => {
    expect(typeormRootOptions(env({})).synchronize).toBe(true);
    expect(typeormRootOptions(env({ DB_SYNCHRONIZE: 'false' })).synchronize).toBe(
      false,
    );
  });
});
