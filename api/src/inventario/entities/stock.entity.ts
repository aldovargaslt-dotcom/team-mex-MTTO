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

  @Column({ type: 'int', default: 0 })
  qty: number;

  /** Umbral opt-in (ADR-007). null = sin alerta. Integer >= 0. */
  @Column({ name: 'min_qty', type: 'int', nullable: true })
  minQty: number | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
