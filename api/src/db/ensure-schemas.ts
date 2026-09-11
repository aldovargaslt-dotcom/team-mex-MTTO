import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { postgresConnectionFrom } from './postgres-connection';

export async function ensureModuleSchemas(config: ConfigService) {
  const ds = new DataSource({
    type: 'postgres',
    ...postgresConnectionFrom(config),
  });
  await ds.initialize();
  try {
    await ds.query('CREATE SCHEMA IF NOT EXISTS inventario');
    await ds.query('CREATE SCHEMA IF NOT EXISTS andon');
    await ds.query('CREATE SCHEMA IF NOT EXISTS notifications');
  } finally {
    await ds.destroy();
  }
}
