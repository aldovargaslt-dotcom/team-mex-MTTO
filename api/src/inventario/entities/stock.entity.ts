import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { INVENTARIO_SCHEMA } from '../enums';
import { Item } from './item.entity';

@Entity({ name: 'stock', schema: INVENTARIO_SCHEMA })
export class Stock {
  @PrimaryColumn('uuid', { name: 'item_id' })
  itemId: string;

  @OneToOne(() => Item, (item) => item.stock, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'item_id' })
  item: Item;

  @Column({ type: 'numeric', precision: 20, scale: 6, transformer: { to: (v: number) => v, from: (v: string | null) => v === null ? null : Number(v) }, default: 0 })
  qty: number;

  /** Umbral opt-in (ADR-007). null = sin alerta. Integer >= 0. */
  @Column({ name: 'min_qty', type: 'numeric', precision: 20, scale: 6, transformer: { to: (v: number) => v, from: (v: string | null) => v === null ? null : Number(v) }, nullable: true })
  minQty: number | null;

  @Column({ name: 'critical_qty', type: 'numeric', precision: 20, scale: 6, transformer: { to: (v: number) => v, from: (v: string | null) => v === null ? null : Number(v) }, default: 0 })
  criticalQty: number;

  @Column({ name: 'known_value', type: 'numeric', precision: 20, scale: 6, default: '0' })
  knownValue: string;

  @Column({ name: 'unknown_qty', type: 'numeric', precision: 20, scale: 6, default: '0' })
  unknownQty: string;

  @Column({ name: 'cost_sources', type: 'jsonb', default: () => "'[]'::jsonb" })
  costSources: import('../materials-model').ValueSource[];

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
