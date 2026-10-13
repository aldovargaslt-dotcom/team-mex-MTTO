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
import { OrigenConsumo } from '../kernel/events/visita-cerrada';
import { Visita } from './visita.entity';

@Entity('visita_piezas')
@Unique(['visita', 'itemId'])
export class VisitaPieza {
  @PrimaryColumn('uuid')
  id: string;

  @ManyToOne(() => Visita, (visita) => visita.piezas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'visita_id' })
  visita: Visita;

  /** ID opaco de inventario.item. Sin FK cruzada. */
  @Column({ name: 'item_id', type: 'uuid' })
  itemId: string;

  @Column({ type: 'numeric', precision: 20, scale: 6, transformer: { to: (value: number) => value, from: (value: string) => Number(value) } })
  qty: number;

  @Column({ type: 'enum', enum: OrigenConsumo })
  origen: OrigenConsumo;

  @BeforeInsert()
  assignId() {
    if (!this.id) {
      this.id = randomUUID();
    }
  }
}
