import { randomUUID } from 'crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

export const VEHICLE_DOCUMENTS_SCHEMA = 'vehicle_documents';
export const VEHICLE_DOCUMENT_TYPE = 'POLIZA_SEGURO' as const;

@Entity({ name: 'document_versions', schema: VEHICLE_DOCUMENTS_SCHEMA })
@Index('vehicle_document_current_uidx', ['unidadId', 'documentType'], {
  unique: true,
  where: '"current" = true',
})
@Index(
  'vehicle_document_version_uidx',
  ['unidadId', 'documentType', 'version'],
  {
    unique: true,
  },
)
export class VehicleDocumentVersion {
  @PrimaryColumn('uuid') id: string;
  @Column({ name: 'unidad_id', type: 'uuid' }) unidadId: string;
  @Column({ name: 'document_type', type: 'varchar', length: 32 })
  documentType: typeof VEHICLE_DOCUMENT_TYPE;
  @Column({ name: 'expiration_date', type: 'date' }) expirationDate: string;
  @Column({ type: 'int' }) version: number;
  @Column({ type: 'boolean', default: true }) current: boolean;
  @Column({ type: 'varchar', length: 160, nullable: true }) issuer:
    string | null;
  @Column({ type: 'varchar', length: 160, nullable: true }) reference:
    string | null;
  @Column({ name: 'object_key', type: 'varchar', length: 512, nullable: true })
  objectKey: string | null;
  @Column({ name: 'supersedes_id', type: 'uuid', nullable: true })
  supersedesId: string | null;
  @Column({ name: 'created_by', type: 'varchar', length: 128 })
  createdBy: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @BeforeInsert()
  assignId() {
    if (!this.id) this.id = randomUUID();
  }
}
