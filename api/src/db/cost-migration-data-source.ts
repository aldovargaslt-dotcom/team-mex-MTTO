import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { postgresConnectionOptions } from './postgres-options';
import { InventoryWorkOrderCosts1791849600001 } from './migrations/1791849600001-InventoryWorkOrderCosts';

export function createCostMigrationDataSource() {
  return new DataSource({
    ...postgresConnectionOptions({ get: <T = string>(key: string, fallback?: T) => (process.env[key] ?? fallback) as T | undefined }),
    synchronize: false, dropSchema: false, migrationsRun: false,
    migrationsTableName: 'inventory_cost_schema_migrations',
    migrationsTransactionMode: 'all', migrations: [InventoryWorkOrderCosts1791849600001],
  });
}
