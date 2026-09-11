import { randomUUID } from 'crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { INVENTARIO_SCHEMA } from '../enums';
import { ItemProveedor } from './item-proveedor.entity';

@Entity({ name: 'proveedores', schema: INVENTARIO_SCHEMA })
export class Proveedor {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ unique: true })
  nombre: string;

  @Column({ default: true })
  activo: boolean;

  @OneToMany(() => ItemProveedor, (link) => link.proveedor)
  items: ItemProveedor[];

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
