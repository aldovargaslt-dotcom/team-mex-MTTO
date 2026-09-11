import { randomUUID } from 'crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  Unique,
} from 'typeorm';
import { TipoFirma } from './enums';
import { Visita } from './visita.entity';

@Entity('visita_firmas')
@Unique(['visita', 'tipo'])
export class VisitaFirma {
  @PrimaryColumn('uuid')
  id: string;

  @ManyToOne(() => Visita, (visita) => visita.firmas, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'visita_id' })
  visita: Visita;

  @Column({ type: 'enum', enum: TipoFirma })
  tipo: TipoFirma;

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
