import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthGuard } from './auth/auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { HealthController } from './health.controller';
import { ChoferesModule } from './choferes/choferes.module';
import { ensureModuleSchemas } from './db/ensure-schemas';
import { postgresConnectionFrom } from './db/postgres-connection';
import { AndonModule } from './andon/andon.module';
import { InventarioModule } from './inventario/inventario.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OutboxModule } from './kernel/outbox/outbox.module';
import { SeedModule } from './seed/seed.module';
import { TiposVehiculoModule } from './tipos-vehiculo/tipos-vehiculo.module';
import { UnidadesModule } from './unidades/unidades.module';
import { VisitasModule } from './visitas/visitas.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        await ensureModuleSchemas(config);
        return {
          type: 'postgres' as const,
          ...postgresConnectionFrom(config),
          autoLoadEntities: true,
          synchronize: config.get<string>('DB_SYNCHRONIZE', 'true') === 'true',
          dropSchema: config.get<string>('DB_DROP_SCHEMA', 'false') === 'true',
        };
      },
    }),
    OutboxModule,
    TiposVehiculoModule,
    UnidadesModule,
    ChoferesModule,
    InventarioModule,
    NotificationsModule,
    AndonModule,
    VisitasModule,
    SeedModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
