import { randomUUID } from 'crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { INVENTARIO_SCHEMA, UOM_PIEZA } from '../enums';
import { Compatibilidad } from './compatibilidad.entity';
import { Familia } from './familia.entity';
import { ItemProveedor } from './item-proveedor.entity';
import { Stock } from './stock.entity';

@Entity({ name: 'items', schema: INVENTARIO_SCHEMA })
export class Item {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ unique: true })
  sku: string;

  @Column()
  nombre: string;

  @ManyToOne(() => Familia, (familia) => familia.items, {
    eager: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'familia_id' })
  familia: Familia;

  @Column({ type: 'varchar', nullable: true })
  oem: string | null;

  @Column({ default: UOM_PIEZA })
  uom: string;

  @Column({ default: true })
  activo: boolean;

  @OneToOne(() => Stock, (stock) => stock.item, { cascade: true })
  stock: Stock;

  @OneToMany(() => Compatibilidad, (compat) => compat.item, { cascade: true })
  compatibilidades: Compatibilidad[];

  @OneToMany(() => ItemProveedor, (link) => link.item, { cascade: true })
  proveedores: ItemProveedor[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @BeforeInsert()
  assignId() {
    if (!this.id) {
      this.id = randomUUID();
    }
  }
}
