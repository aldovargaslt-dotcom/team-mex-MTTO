import { postgresConnectionOptions } from './postgres-options';
import { migrateUiRelease } from './ui-release-migrations';

/** Production release guard runs before Nest can query the new columns. */
export async function prepareUiRelease(env: NodeJS.ProcessEnv = process.env) {
  if (env.NODE_ENV !== 'production') return [];
  return migrateUiRelease(postgresConnectionOptions({
    get: <T = string>(key: string, fallback?: T) => (env[key] ?? fallback) as T | undefined,
  }), {
    synchronize: env.DB_SYNCHRONIZE ?? 'false',
    dropSchema: env.DB_DROP_SCHEMA ?? 'false',
  });
}
