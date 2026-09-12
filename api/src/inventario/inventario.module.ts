import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventarioInboxAdapter } from '../notifications/inventario-inbox.adapter';
import { NotificationsModule } from '../notifications/notifications.module';
import { UnidadesModule } from '../unidades/unidades.module';
import { Compatibilidad } from './entities/compatibilidad.entity';
import { Familia } from './entities/familia.entity';
import { Item } from './entities/item.entity';
import { ItemProveedor } from './entities/item-proveedor.entity';
import { Movimiento } from './entities/movimiento.entity';
import { PendienteComprobante } from './entities/pendiente-comprobante.entity';
import { Proveedor } from './entities/proveedor.entity';
import { Stock } from './entities/stock.entity';
import { InventarioController } from './inventario.controller';
import { InventarioService } from './inventario.service';
import { STOCK_ALERT_PORT } from './ports';

export const INVENTARIO_ENTITIES = [
  Familia,
  Item,
  Proveedor,
  ItemProveedor,
  Compatibilidad,
  Stock,
  Movimiento,
  PendienteComprobante,
];

@Module({
  imports: [
    TypeOrmModule.forFeature(INVENTARIO_ENTITIES),
    UnidadesModule,
    NotificationsModule,
  ],
  controllers: [InventarioController],
  providers: [
    InventarioService,
    {
      provide: STOCK_ALERT_PORT,
      useExisting: InventarioInboxAdapter,
    },
  ],
  exports: [TypeOrmModule, InventarioService],
})
export class InventarioModule {}
