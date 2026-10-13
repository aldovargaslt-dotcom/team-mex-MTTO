import { ObjectStoragePort } from '../visitas/checks/object-storage.port';
import { PrivateFilesystemStorageAdapter } from '../visitas/checks/private-filesystem-storage.adapter';
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
import { MaterialAccount, MaterialClosure, MaterialCommandRecord } from './materials.entity';
import { InventoryMaterialsService } from './materials.service';
import { InventoryMaterialsPort } from './materials.port';
import { STOCK_ALERT_PORT } from './ports';

export const INVENTARIO_ENTITIES = [
  MaterialAccount, MaterialClosure, MaterialCommandRecord,
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
    InventarioService, InventoryMaterialsService, PrivateFilesystemStorageAdapter,
    { provide: ObjectStoragePort, useExisting: PrivateFilesystemStorageAdapter },
    { provide: InventoryMaterialsPort, useExisting: InventoryMaterialsService },
    {
      provide: STOCK_ALERT_PORT,
      useExisting: InventarioInboxAdapter,
    },
  ],
  exports: [TypeOrmModule, InventarioService, InventoryMaterialsPort],
})
export class InventarioModule {}
