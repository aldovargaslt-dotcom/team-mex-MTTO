import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { postgresConnectionOptions } from './postgres-options';

export async function ensureModuleSchemas(config: ConfigService) {
  const ds = new DataSource({
    ...postgresConnectionOptions(config),
  });
  await ds.initialize();
  try {
    await ds.query('CREATE SCHEMA IF NOT EXISTS inventario');
    await ds.query('CREATE SCHEMA IF NOT EXISTS andon');
    await ds.query('CREATE SCHEMA IF NOT EXISTS notifications');
    await ds.query('CREATE SCHEMA IF NOT EXISTS flota');
    await ds.query('CREATE SCHEMA IF NOT EXISTS salud');
    await ds.query('CREATE SCHEMA IF NOT EXISTS alertas');
  } finally {
    await ds.destroy();
  }
}
