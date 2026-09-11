import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthGuard } from './auth/auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { HealthController } from './health.controller';
import { ChoferesModule } from './choferes/choferes.module';
import { SeedModule } from './seed/seed.module';
import { TiposVehiculoModule } from './tipos-vehiculo/tipos-vehiculo.module';
import { UnidadesModule } from './unidades/unidades.module';
import { VisitasModule } from './visitas/visitas.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('DB_HOST', 'localhost'),
        port: parseInt(config.get<string>('DB_PORT', '5432'), 10),
        username: config.get<string>('DB_USER', 'team_mex'),
        password: config.get<string>('DB_PASSWORD', 'team_mex'),
        database: config.get<string>('DB_NAME', 'team_mex_mtto'),
        autoLoadEntities: true,
        synchronize: config.get<string>('DB_SYNCHRONIZE', 'true') === 'true',
        dropSchema: config.get<string>('DB_DROP_SCHEMA', 'false') === 'true',
      }),
    }),
    TiposVehiculoModule,
    UnidadesModule,
    ChoferesModule,
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
