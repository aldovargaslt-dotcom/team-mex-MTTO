import { randomUUID } from 'crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Chofer } from '../choferes/chofer.entity';
import { Unidad } from '../unidades/unidad.entity';
import { EstadoVisita, TipoVisita } from './enums';
import { VisitaFirma } from './visita-firma.entity';
import { VisitaFoto } from './visita-foto.entity';
import { VisitaPieza } from './visita-pieza.entity';
import { VisitaTrabajo } from './visita-trabajo.entity';

@Entity('visitas')
export class Visita {
  @PrimaryColumn('uuid')
  id: string;

  @ManyToOne(() => Unidad, { eager: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'unidad_id' })
  unidad: Unidad;

  @Column({ type: 'enum', enum: EstadoVisita, default: EstadoVisita.BORRADOR })
  estado: EstadoVisita;

  @ManyToOne(() => Chofer, { eager: true, nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'chofer_id' })
  chofer: Chofer | null;

  @Column({ type: 'int', nullable: true })
  km: number | null;

  @Column({ type: 'enum', enum: TipoVisita, nullable: true })
  tipo: TipoVisita | null;

  @Column({ type: 'text', nullable: true })
  observaciones: string | null;

  @Column({ name: 'created_by', type: 'varchar', nullable: true })
  createdBy: string | null;

  @Column({ name: 'cerrado_at', type: 'timestamptz', nullable: true })
  cerradoAt: Date | null;

  @OneToMany(() => VisitaTrabajo, (trabajo) => trabajo.visita, {
    cascade: true,
  })
  trabajos: VisitaTrabajo[];

  @OneToMany(() => VisitaFoto, (foto) => foto.visita, { cascade: true })
  fotos: VisitaFoto[];

  @OneToMany(() => VisitaFirma, (firma) => firma.visita, { cascade: true })
  firmas: VisitaFirma[];

  @OneToMany(() => VisitaPieza, (pieza) => pieza.visita, { cascade: true })
  piezas: VisitaPieza[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @BeforeInsert()
  assignId() {
    if (!this.id) {
      this.id = randomUUID();
    }
  }
}
