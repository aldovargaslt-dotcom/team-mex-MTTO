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

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
