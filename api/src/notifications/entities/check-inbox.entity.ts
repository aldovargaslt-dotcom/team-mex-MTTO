import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
@Entity({ schema: 'notifications', name: 'check_inbox' })
export class CheckInboxItem {
  @PrimaryColumn({ name: 'event_id', type: 'uuid' }) eventId: string;
  @Column({ name: 'check_id', type: 'uuid' }) checkId: string;
  @Column({ name: 'unidad_id', type: 'uuid' }) unidadId: string;
  @Column({ name: 'facility_id', type: 'varchar' }) facilityId: string;
  @Column({ name: 'numero_interno', type: 'varchar' }) numeroInterno: string;
  @Column({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
}
@Entity({ schema: 'notifications', name: 'check_inbox_read' })
export class CheckInboxRead {
  @PrimaryColumn({ name: 'event_id', type: 'uuid' }) eventId: string;
  @PrimaryColumn({ name: 'user_id', type: 'varchar' }) userId: string;
  @Column({ name: 'read_at', type: 'timestamptz' }) readAt: Date;
  @ManyToOne(() => CheckInboxItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  item: CheckInboxItem;
}
