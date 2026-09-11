export type EnvReader = {
  get<T = string>(key: string, defaultValue?: T): T | undefined;
};

export type PostgresSsl = { rejectUnauthorized: boolean } | undefined;

export type PostgresConnectionOptions = {
  type: 'postgres';
  url?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  ssl?: PostgresSsl;
};

function envFlag(raw: string | undefined): boolean | undefined {
  if (raw === undefined) return undefined;
  const v = raw.trim().toLowerCase();
  if (['1', 'true', 'yes', 'require'].includes(v)) return true;
  if (['0', 'false', 'no', 'disable', 'disabled'].includes(v)) return false;
  return undefined;
}

function hostFromUrl(url: string): string | undefined {
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}

function sslModeFromUrl(url: string): string | undefined {
  try {
    return new URL(url).searchParams.get('sslmode') ?? undefined;
  } catch {
    return undefined;
  }
}

/** Public Railway / Supabase hosts need TLS. Private *.railway.internal does not. */
export function resolvePostgresSsl(
  config: EnvReader,
  databaseUrl?: string,
): PostgresSsl {
  const forced = envFlag(config.get('DB_SSL'));
  if (forced === false) return undefined;
  if (forced === true) return { rejectUnauthorized: false };

  const sslMode = databaseUrl ? sslModeFromUrl(databaseUrl) : undefined;
  if (sslMode === 'disable') return undefined;
  if (
    sslMode === 'require' ||
    sslMode === 'verify-ca' ||
    sslMode === 'verify-full' ||
    sslMode === 'prefer'
  ) {
    return { rejectUnauthorized: false };
  }

  const host =
    (databaseUrl ? hostFromUrl(databaseUrl) : undefined) ??
    config.get('DB_HOST', 'localhost');
  if (!host || host === 'localhost' || host === '127.0.0.1') return undefined;
  if (host.endsWith('.railway.internal')) return undefined;
  if (
    host.endsWith('.rlwy.net') ||
    host.endsWith('.railway.app') ||
    host.endsWith('.supabase.co') ||
    host.endsWith('.pooler.supabase.com')
  ) {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

export function postgresConnectionOptions(
  config: EnvReader,
): PostgresConnectionOptions {
  const url = config.get('DATABASE_URL')?.trim();
  const ssl = resolvePostgresSsl(config, url);

  if (url) {
    return { type: 'postgres', url, ssl };
  }

  return {
    type: 'postgres',
    host: config.get('DB_HOST', 'localhost'),
    port: parseInt(config.get('DB_PORT', '5432') ?? '5432', 10),
    username: config.get('DB_USER', 'team_mex'),
    password: config.get('DB_PASSWORD', 'team_mex'),
    database: config.get('DB_NAME', 'team_mex_mtto'),
    ssl,
  };
}

function truthyEnv(config: EnvReader, key: string, fallback: string): boolean {
  return String(config.get(key) ?? fallback)
    .trim()
    .toLowerCase() === 'true';
}

export function typeormRootOptions(config: EnvReader) {
  return {
    ...postgresConnectionOptions(config),
    autoLoadEntities: true,
    synchronize: truthyEnv(config, 'DB_SYNCHRONIZE', 'true'),
    dropSchema: truthyEnv(config, 'DB_DROP_SCHEMA', 'false'),
  };
}
