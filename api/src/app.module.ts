import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthGuard } from './auth/auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { HealthController } from './health.controller';
import { ChoferesModule } from './choferes/choferes.module';
import { ensureModuleSchemas } from './db/ensure-schemas';
import { typeormRootOptions } from './db/postgres-options';
import { AndonModule } from './andon/andon.module';
import { FlotaModule } from './flota/flota.module';
import { LogisticaModule } from './logistica/logistica.module';
import { InventarioModule } from './inventario/inventario.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OutboxModule } from './kernel/outbox/outbox.module';
import { SeedModule } from './seed/seed.module';
import { UnidadesModule } from './unidades/unidades.module';
import { VisitasModule } from './visitas/visitas.module';
import { AlertasModule } from './alertas/alertas.module';
import { SaludModule } from './salud/salud.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        await ensureModuleSchemas(config);
        return typeormRootOptions(config);
      },
    }),
    OutboxModule,
    UnidadesModule,
    ChoferesModule,
    FlotaModule,
    AlertasModule,
    LogisticaModule,
    InventarioModule,
    NotificationsModule,
    AndonModule,
    VisitasModule,
    SaludModule,
    SeedModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
