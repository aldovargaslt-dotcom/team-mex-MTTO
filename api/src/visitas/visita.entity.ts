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
  VersionColumn,
} from 'typeorm';
import { Chofer } from '../choferes/chofer.entity';
import { Unidad } from '../unidades/unidad.entity';
import { EstadoVisita, TipoVisita } from './enums';
import { VisitaFirma } from './visita-firma.entity';
import { VisitaFoto } from './visita-foto.entity';
import { VisitaPieza } from './visita-pieza.entity';
import { VisitaTrabajo } from './visita-trabajo.entity';
import { WorkOrderStatus, WorkOrderType } from './work-order';

@Entity('visitas')
export class Visita {
  @PrimaryColumn('uuid')
  id: string;

  @ManyToOne(() => Unidad, {
    eager: true,
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'unidad_id' })
  unidad: Unidad;

  @Column({
    type: 'enum',
    enum: EstadoVisita,
    default: EstadoVisita.BORRADOR,
    nullable: true,
  })
  estado: EstadoVisita | null;

  @Column({ name: 'work_order_type', type: 'varchar' })
  workOrderType: WorkOrderType;
  @Column({ name: 'work_order_status', type: 'varchar' })
  workOrderStatus: WorkOrderStatus;
  @VersionColumn() version: number;
  @Column({ name: 'legacy_compat_draft', default: false })
  legacyCompatDraft: boolean;
  @Column({ name: 'migration_backfilled', default: false })
  migrationBackfilled: boolean;
  @Column({ name: 'assigned_user_id', type: 'varchar', nullable: true })
  assignedUserId: string | null;
  @Column({ name: 'assigned_at', type: 'timestamptz', nullable: true })
  assignedAt: Date | null;
  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;
  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;
  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;
  @Column({ name: 'blocks_operation', default: false })
  blocksOperation: boolean;
  @Column({ name: 'block_reason', type: 'text', nullable: true }) blockReason:
    string | null;
  @Column({ name: 'block_actor', type: 'varchar', nullable: true }) blockActor:
    string | null;
  @Column({ name: 'requires_reinspection', default: false })
  requiresReinspection: boolean;
  @Column({ name: 'source_check_id', type: 'uuid', nullable: true })
  sourceCheckId: string | null;
  @Column({ name: 'finding_id', type: 'uuid', nullable: true }) findingId:
    string | null;
  @Column({ name: 'created_actor_name', type: 'varchar', nullable: true })
  createdActorName: string | null;
  @Column({
    name: 'attribution_level',
    type: 'varchar',
    default: 'LEGACY_HEADER',
  })
  attributionLevel: string;
  @Column({ name: 'creation_key', type: 'varchar', nullable: true })
  creationKey: string | null;
  @Column({ name: 'creation_hash', type: 'varchar', nullable: true })
  creationHash: string | null;

  @ManyToOne(() => Chofer, {
    eager: true,
    nullable: true,
    onDelete: 'RESTRICT',
  })
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
