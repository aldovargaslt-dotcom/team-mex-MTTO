import { randomUUID } from 'crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
} from 'typeorm';
import { ANDON_SCHEMA, WhatsAppKind } from '../enums';

@Entity({ name: 'whatsapp_salidas', schema: ANDON_SCHEMA })
export class WhatsappSalidaEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'aviso_id', type: 'uuid' })
  avisoId: string;

  @Column({ name: 'unidad_id', type: 'uuid' })
  unidadId: string;

  @Column({ type: 'enum', enum: WhatsAppKind, enumName: 'andon_whatsapp_kind' })
  kind: WhatsAppKind;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @BeforeInsert()
  assignId() {
    if (!this.id) {
      this.id = randomUUID();
    }
  }
}
