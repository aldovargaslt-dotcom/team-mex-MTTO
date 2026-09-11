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
import { Visita } from './visita.entity';

@Entity('visita_fotos')
export class VisitaFoto {
  @PrimaryColumn('uuid')
  id: string;

  @ManyToOne(() => Visita, (visita) => visita.fotos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'visita_id' })
  visita: Visita;

  @Column({ name: 'data_url', type: 'text' })
  dataUrl: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @BeforeInsert()
  assignId() {
    if (!this.id) {
      this.id = randomUUID();
    }
  }
}
