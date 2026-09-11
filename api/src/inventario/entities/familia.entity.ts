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
import { Item } from './item.entity';

@Entity({ name: 'familias', schema: INVENTARIO_SCHEMA })
export class Familia {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ unique: true })
  nombre: string;

  @Column({ default: true })
  activa: boolean;

  @OneToMany(() => Item, (item) => item.familia)
  items: Item[];

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
