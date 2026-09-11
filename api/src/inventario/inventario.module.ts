import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TiposVehiculoModule } from '../tipos-vehiculo/tipos-vehiculo.module';
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
    TiposVehiculoModule,
  ],
  controllers: [InventarioController],
  providers: [InventarioService],
  exports: [TypeOrmModule, InventarioService],
})
export class InventarioModule {}
