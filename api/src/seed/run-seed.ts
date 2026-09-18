import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SeedService } from './seed.service';

/**
 * Re-run the idempotent demo seed without serving HTTP.
 * OnModuleInit already seeds once; this second pass must not duplicate rows.
 *
 *   cd api && npm run seed
 */
async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  try {
    await app.get(SeedService).seed();
  } finally {
    await app.close();
  }
}

void run();
