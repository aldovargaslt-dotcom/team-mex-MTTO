import { randomUUID } from 'crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { INVENTARIO_SCHEMA, TipoMovimiento } from '../enums';
import { Item } from './item.entity';

@Entity({ name: 'movimientos', schema: INVENTARIO_SCHEMA })
export class Movimiento {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: TipoMovimiento })
  tipo: TipoMovimiento;

  @ManyToOne(() => Item, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'item_id' })
  item: Item;

  @Column({ type: 'int' })
  qty: number;

  @Column({ type: 'int' })
  delta: number;

  /** ID opaco de la visita (mantenimiento). Sin FK cruzada. */
  @Column({ name: 'visita_id', type: 'uuid', nullable: true })
  visitaId: string | null;

  @Column({ type: 'text', nullable: true })
  nota: string | null;

  @Column({ name: 'created_by', type: 'varchar', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @BeforeInsert()
  assignId() {
    if (!this.id) {
      this.id = randomUUID();
    }
  }
}
