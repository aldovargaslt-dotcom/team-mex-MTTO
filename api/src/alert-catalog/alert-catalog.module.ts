import { Global, Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertasModule } from '../alertas/alertas.module';
import { AndonModule } from '../andon/andon.module';
import { InventarioModule } from '../inventario/inventario.module';
import { SaludModule } from '../salud/salud.module';
import { AlertCatalogController } from './alert-catalog.controller';
import { AlertCatalogService } from './alert-catalog.service';
import { AlertTypeEntity } from './entities/alert-type.entity';
import { ALERT_TYPE_ACTIVE_PORT } from './ports';

export const ALERT_CATALOG_ENTITIES = [AlertTypeEntity];

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature(ALERT_CATALOG_ENTITIES),
    AlertasModule,
    forwardRef(() => AndonModule),
    forwardRef(() => InventarioModule),
    forwardRef(() => SaludModule),
  ],
  controllers: [AlertCatalogController],
  providers: [
    AlertCatalogService,
    {
      provide: ALERT_TYPE_ACTIVE_PORT,
      useExisting: AlertCatalogService,
    },
  ],
  exports: [AlertCatalogService, ALERT_TYPE_ACTIVE_PORT, TypeOrmModule],
})
export class AlertCatalogModule {}
