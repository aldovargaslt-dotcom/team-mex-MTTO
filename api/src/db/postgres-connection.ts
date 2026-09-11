export type PostgresConnectionOptions = {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl?: { rejectUnauthorized: boolean };
};

type EnvLike = {
  get<T = string>(key: string, defaultValue?: T): T | undefined;
};

function isLocalHost(host: string): boolean {
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host.endsWith('.railway.internal')
  );
}

function resolveSsl(
  host: string,
  sslMode: string | null,
  explicit: string | undefined,
): { rejectUnauthorized: boolean } | undefined {
  const flag = explicit?.trim().toLowerCase();
  if (flag === 'true' || flag === '1' || flag === 'require') {
    return { rejectUnauthorized: false };
  }
  if (flag === 'false' || flag === '0' || flag === 'disable') {
    return undefined;
  }
  if (
    sslMode === 'require' ||
    sslMode === 'verify-full' ||
    sslMode === 'verify-ca' ||
    sslMode === 'prefer'
  ) {
    return { rejectUnauthorized: false };
  }
  if (sslMode === 'disable') {
    return undefined;
  }
  if (isLocalHost(host)) {
    return undefined;
  }
  return { rejectUnauthorized: false };
}

export function parseDatabaseUrl(url: string): {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  sslMode: string | null;
} {
  const parsed = new URL(url);
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  if (!parsed.hostname || !database) {
    throw new Error('DATABASE_URL inválida: falta host o nombre de base.');
  }
  return {
    host: parsed.hostname,
    port: parsed.port ? parseInt(parsed.port, 10) : 5432,
    username: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database,
    sslMode: parsed.searchParams.get('sslmode'),
  };
}

/** Conexión Postgres: DATABASE_URL (Railway) o DB_* (local / Docker). */
export function postgresConnectionFrom(config: EnvLike): PostgresConnectionOptions {
  const databaseUrl = config.get<string>('DATABASE_URL')?.trim();
  const explicitSsl = config.get<string>('DB_SSL');

  if (databaseUrl) {
    const parsed = parseDatabaseUrl(databaseUrl);
    return {
      host: parsed.host,
      port: parsed.port,
      username: parsed.username,
      password: parsed.password,
      database: parsed.database,
      ssl: resolveSsl(parsed.host, parsed.sslMode, explicitSsl),
    };
  }

  const host = config.get<string>('DB_HOST', 'localhost') ?? 'localhost';
  return {
    host,
    port: parseInt(config.get<string>('DB_PORT', '5432') ?? '5432', 10),
    username: config.get<string>('DB_USER', 'team_mex') ?? 'team_mex',
    password: config.get<string>('DB_PASSWORD', 'team_mex') ?? 'team_mex',
    database: config.get<string>('DB_NAME', 'team_mex_mtto') ?? 'team_mex_mtto',
    ssl: resolveSsl(host, null, explicitSsl),
  };
}
