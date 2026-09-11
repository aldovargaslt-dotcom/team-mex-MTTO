import { randomUUID } from 'crypto';
import {
  BeforeInsert,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Unique,
} from 'typeorm';
import { INVENTARIO_SCHEMA } from '../enums';
import { Item } from './item.entity';
import { Proveedor } from './proveedor.entity';

@Entity({ name: 'item_proveedores', schema: INVENTARIO_SCHEMA })
@Unique(['item', 'proveedor'])
export class ItemProveedor {
  @PrimaryColumn('uuid')
  id: string;

  @ManyToOne(() => Item, (item) => item.proveedores, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item: Item;

  @ManyToOne(() => Proveedor, (proveedor) => proveedor.items, {
    eager: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'proveedor_id' })
  proveedor: Proveedor;

  @Column({ name: 'codigo_proveedor' })
  codigoProveedor: string;

  @Column({ default: false })
  preferido: boolean;

  @BeforeInsert()
  assignId() {
    if (!this.id) {
      this.id = randomUUID();
    }
  }
}
