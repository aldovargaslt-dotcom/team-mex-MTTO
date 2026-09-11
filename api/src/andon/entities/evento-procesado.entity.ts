import { CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';
import { ANDON_SCHEMA } from '../enums';

@Entity({ name: 'eventos_procesados', schema: ANDON_SCHEMA })
export class EventoProcesadoEntity {
  /** eventId del envelope VisitaCerrada (ADR-001). Idempotencia Andon (A8). */
  @PrimaryColumn({ name: 'event_id', type: 'uuid' })
  eventId: string;

  @CreateDateColumn({ name: 'processed_at' })
  processedAt: Date;
}
