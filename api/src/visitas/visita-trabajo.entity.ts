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
import { CategoriaTrabajo } from './enums';
import { Visita } from './visita.entity';

@Entity('visita_trabajos')
@Unique(['visita', 'categoria', 'item'])
export class VisitaTrabajo {
  @PrimaryColumn('uuid')
  id: string;

  @ManyToOne(() => Visita, (visita) => visita.trabajos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'visita_id' })
  visita: Visita;

  @Column({ type: 'enum', enum: CategoriaTrabajo })
  categoria: CategoriaTrabajo;

  @Column()
  item: string;

  @BeforeInsert()
  assignId() {
    if (!this.id) {
      this.id = randomUUID();
    }
  }
}
