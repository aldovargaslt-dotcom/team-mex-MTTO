import {
  parseDatabaseUrl,
  postgresConnectionFrom,
} from './postgres-connection';

function env(values: Record<string, string | undefined>) {
  return {
    get<T = string>(key: string, defaultValue?: T): T | undefined {
      if (Object.prototype.hasOwnProperty.call(values, key)) {
        return values[key] as T | undefined;
      }
      return defaultValue;
    },
  };
}

describe('parseDatabaseUrl', () => {
  it('lee user, password, host, puerto y db', () => {
    expect(
      parseDatabaseUrl(
        'postgresql://team_mex:s3cret@shuttle.proxy.rlwy.net:23456/railway',
      ),
    ).toEqual({
      host: 'shuttle.proxy.rlwy.net',
      port: 23456,
      username: 'team_mex',
      password: 's3cret',
      database: 'railway',
      sslMode: null,
    });
  });

  it('decodifica password y respeta sslmode', () => {
    const parsed = parseDatabaseUrl(
      'postgres://u:p%40ss@db.example.com:5432/app?sslmode=require',
    );
    expect(parsed.password).toBe('p@ss');
    expect(parsed.sslMode).toBe('require');
  });
});

describe('postgresConnectionFrom', () => {
  it('usa DB_* en local sin SSL', () => {
    expect(
      postgresConnectionFrom(
        env({
          DB_HOST: 'localhost',
          DB_PORT: '5432',
          DB_USER: 'team_mex',
          DB_PASSWORD: 'team_mex',
          DB_NAME: 'team_mex_mtto',
        }),
      ),
    ).toEqual({
      host: 'localhost',
      port: 5432,
      username: 'team_mex',
      password: 'team_mex',
      database: 'team_mex_mtto',
      ssl: undefined,
    });
  });

  it('prioriza DATABASE_URL y activa SSL en host público', () => {
    expect(
      postgresConnectionFrom(
        env({
          DATABASE_URL:
            'postgresql://postgres:pw@shuttle.proxy.rlwy.net:1234/railway',
          DB_HOST: 'localhost',
        }),
      ),
    ).toEqual({
      host: 'shuttle.proxy.rlwy.net',
      port: 1234,
      username: 'postgres',
      password: 'pw',
      database: 'railway',
      ssl: { rejectUnauthorized: false },
    });
  });

  it('no exige SSL en *.railway.internal (red privada)', () => {
    const conn = postgresConnectionFrom(
      env({
        DATABASE_URL:
          'postgresql://postgres:pw@postgres.railway.internal:5432/railway',
      }),
    );
    expect(conn.ssl).toBeUndefined();
    expect(conn.host).toBe('postgres.railway.internal');
  });

  it('DB_SSL=false apaga SSL aunque el host sea público', () => {
    const conn = postgresConnectionFrom(
      env({
        DATABASE_URL: 'postgresql://u:p@db.example.com:5432/app',
        DB_SSL: 'false',
      }),
    );
    expect(conn.ssl).toBeUndefined();
  });

  it('DB_SSL=true fuerza SSL en localhost', () => {
    const conn = postgresConnectionFrom(
      env({
        DB_HOST: 'localhost',
        DB_SSL: 'true',
      }),
    );
    expect(conn.ssl).toEqual({ rejectUnauthorized: false });
  });
});
