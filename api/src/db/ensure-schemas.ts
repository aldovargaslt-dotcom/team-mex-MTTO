import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

export async function ensureModuleSchemas(config: ConfigService) {
  const ds = new DataSource({
    type: 'postgres',
    host: config.get<string>('DB_HOST', 'localhost'),
    port: parseInt(config.get<string>('DB_PORT', '5432'), 10),
    username: config.get<string>('DB_USER', 'team_mex'),
    password: config.get<string>('DB_PASSWORD', 'team_mex'),
    database: config.get<string>('DB_NAME', 'team_mex_mtto'),
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
