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
import { EstadoPendiente, INVENTARIO_SCHEMA } from '../enums';
import { Item } from './item.entity';

@Entity({ name: 'pendientes_comprobante', schema: INVENTARIO_SCHEMA })
export class PendienteComprobante {
  @PrimaryColumn('uuid')
  id: string;

  /** ID opaco de la visita (mantenimiento). Sin FK cruzada. */
  @Column({ name: 'visita_id', type: 'uuid' })
  visitaId: string;

  @ManyToOne(() => Item, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'item_id' })
  item: Item;

  @Column({ type: 'int' })
  qty: number;

  @Column({ type: 'enum', enum: EstadoPendiente, default: EstadoPendiente.PENDIENTE })
  estado: EstadoPendiente;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @BeforeInsert()
  assignId() {
    if (!this.id) {
      this.id = randomUUID();
    }
  }
}
