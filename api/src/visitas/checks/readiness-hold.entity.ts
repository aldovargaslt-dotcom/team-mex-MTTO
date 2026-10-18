import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('unit_safety_holds')
@Index('unit_safety_hold_command_uidx', ['actorId', 'commandId'], {
  unique: true,
})
export class ReadinessHold {
  @PrimaryColumn('uuid') id: string;
  @Column({ name: 'unidad_id', type: 'uuid' }) unidadId: string;
  @Column({ name: 'order_id', type: 'uuid' }) orderId: string;
  @Column('text') reason: string;
  @Column({ name: 'actor_id', type: 'varchar' }) actorId: string;
  @Column({ name: 'actor_name', type: 'varchar' }) actorName: string;
  @Column({ name: 'command_id', type: 'uuid' }) commandId: string;
  @Column({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @Column({ name: 'verification_id', type: 'uuid', nullable: true })
  verificationId: string | null;
}

@Entity('unit_repair_verifications')
@Index('unit_verification_command_uidx', ['actorId', 'commandId'], {
  unique: true,
})
export class RepairVerification {
  @PrimaryColumn('uuid') id: string;
  @Column({ name: 'unidad_id', type: 'uuid' }) unidadId: string;
  @Column({ name: 'order_id', type: 'uuid' }) orderId: string;
  @Column({ name: 'actor_id', type: 'varchar' }) actorId: string;
  @Column({ name: 'actor_name', type: 'varchar' }) actorName: string;
  @Column({ name: 'command_id', type: 'uuid' }) commandId: string;
  @Column({ name: 'request_hash', type: 'varchar' }) requestHash: string;
  @Column('jsonb') snapshot: Record<string, unknown>;
  @Column({ name: 'signature_data_url', type: 'text', select: false })
  signatureDataUrl: string;
  @Column({ name: 'signature_hash', type: 'varchar' }) signatureHash: string;
  @Column({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
}
