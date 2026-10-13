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

  @Column({ type: 'numeric', precision: 20, scale: 6, transformer: { to: (v: number) => v, from: (v: string) => Number(v) } })
  qty: number;

  @Column({ type: 'numeric', precision: 20, scale: 6, transformer: { to: (v: number) => v, from: (v: string) => Number(v) } })
  delta: number;

  /** ID opaco de la visita (mantenimiento). Sin FK cruzada. */
  @Column({ name: 'visita_id', type: 'uuid', nullable: true })
  visitaId: string | null;

  @Column({ type: 'text', nullable: true })
  nota: string | null;

  @Column({ name: 'created_by', type: 'varchar', nullable: true })
  createdBy: string | null;

  @Column({ type: 'numeric', precision: 20, scale: 6, nullable: true })
  cost: string | null;
  @Column({ name: 'known_cost', type: 'numeric', precision: 20, scale: 6, nullable: true })
  knownCost: string | null;
  @Column({ name: 'unknown_qty', type: 'numeric', precision: 20, scale: 6, nullable: true })
  unknownQty: string | null;

  @Column({ name: 'cost_sources', type: 'jsonb', nullable: true })
  costSources: import('../materials-model').ValueSource[] | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @BeforeInsert()
  assignId() {
    if (!this.id) {
      this.id = randomUUID();
    }
  }
}
