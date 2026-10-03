import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

@Entity('check_signatures')
@Index('check_signature_visita_uidx', ['visitaId'], { unique: true })
@Index('check_signature_object_key_uidx', ['objectKey'], { unique: true })
export class CheckSignature {
  @PrimaryColumn('uuid') id: string;
  @Column({ name: 'visita_id', type: 'uuid' }) visitaId: string;
  @Column({ name: 'object_key', type: 'varchar', length: 512 })
  objectKey: string;
  @Column({ name: 'object_version_id', type: 'varchar', length: 128 })
  objectVersionId: string;
  @Column({ name: 'mime_type', type: 'varchar', length: 64 }) mimeType: string;
  @Column({ type: 'int' }) bytes: number;
  @Column({ type: 'varchar', length: 64 }) sha256: string;
  @Column({ type: 'int' }) width: number;
  @Column({ type: 'int' }) height: number;
  @Column({ type: 'varchar', length: 32 }) method: 'TOUCH_CANVAS';
  @Column({ name: 'signer_subject', type: 'varchar', length: 128 })
  signerSubject: string;
  @Column({ name: 'signer_name', type: 'varchar', length: 160 })
  signerName: string;
  @Column({ name: 'attribution_level', type: 'varchar', length: 32 })
  attributionLevel: string;
  @Column({ name: 'signed_content_hash', type: 'varchar', length: 64 })
  signedContentHash: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
