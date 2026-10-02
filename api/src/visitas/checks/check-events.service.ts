import {
  Injectable,
  Inject,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { DataSource, EntityManager } from 'typeorm';
import { TrustedActor } from '../../auth/trusted-actor';
import { OutboxEvent } from '../../kernel/outbox/outbox-event.entity';
import { OutboxService } from '../../kernel/outbox/outbox.service';
import { Visita } from '../visita.entity';
import { CheckInspection } from './check-inspection.entity';
import { CheckAudit } from './check-generation.entity';
import { CheckCreatedEvent, CheckDeliveryPort } from './check-delivery.port';
@Injectable()
export class CheckEventsService {
  constructor(private readonly outbox: OutboxService) {}
  async created(
    manager: EntityManager,
    visita: Visita,
    check: CheckInspection,
    actor: TrustedActor,
  ) {
    const occurredAt = new Date();
    const eventId = randomUUID();
    const event: CheckCreatedEvent = {
      eventId,
      eventType: 'CHECK_CREATED',
      schemaVersion: 1,
      occurredAt: occurredAt.toISOString(),
      checkId: visita.id,
      unidadId: visita.unidad.id,
      numeroInterno: visita.unidad.numeroInterno,
      facilityId: check.facilityId,
      source: check.source,
      operationalDate: check.operationalDate,
      actorRef: {
        subject: actor.subject,
        displayName: actor.displayName,
        attributionLevel: actor.attributionLevel,
      },
    };
    await manager.insert(CheckAudit, {
      eventId,
      eventType: event.eventType,
      checkId: visita.id,
      unidadId: event.unidadId,
      facilityId: check.facilityId,
      actorSubject: actor.subject,
      actorName: actor.displayName,
      attributionLevel: actor.attributionLevel,
      source: check.source,
      occurredAt,
    });
    await this.outbox.enqueue(manager, event.eventType, event);
  }
}
@Injectable()
export class CheckDeliveryRunner
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private timer?: ReturnType<typeof setInterval>;
  constructor(
    private readonly db: DataSource,
    @Inject(CheckDeliveryPort) private readonly delivery: CheckDeliveryPort,
    private readonly config: ConfigService,
  ) {}
  onApplicationBootstrap() {
    if (
      this.config.get('NODE_ENV') === 'test' ||
      this.config.get('CHECK_DELIVERY_ENABLED', 'true') !== 'true'
    )
      return;
    this.timer = setInterval(() => {
      void this.runOnce().catch(() => undefined);
    }, 30000);
    this.timer.unref();
    void this.runOnce().catch(() => undefined);
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  async runOnce(limit = 50) {
    let delivered = 0,
      failed = 0;
    const seen: string[] = [];
    for (let i = 0; i < Math.min(limit, 100); i++) {
      let id: string | undefined;
      try {
        const found = await this.db.transaction(async (manager) => {
          const qb = manager
            .getRepository(OutboxEvent)
            .createQueryBuilder('e')
            .where("e.type='CHECK_CREATED' AND e.processed_at IS NULL")
            .orderBy('e.created_at', 'ASC')
            .addOrderBy('e.id', 'ASC')
            .setLock('pessimistic_write')
            .setOnLocked('skip_locked')
            .limit(1);
          if (seen.length) qb.andWhere('e.id NOT IN (:...seen)', { seen });
          const event = await qb.getOne();
          if (!event) return false;
          id = event.id;
          seen.push(event.id);
          const payload = event.payload as CheckCreatedEvent;
          if (
            payload.eventId !== event.id ||
            payload.eventType !== 'CHECK_CREATED' ||
            payload.schemaVersion !== 1
          )
            throw new Error('Invalid CHECK event');
          await this.delivery.deliver(payload, manager);
          await manager.update(
            OutboxEvent,
            { id: event.id },
            { processedAt: new Date() },
          );
          return true;
        });
        if (!found) break;
        delivered++;
      } catch {
        if (!id) throw new Error('CHECK_DELIVERY_STORAGE_UNAVAILABLE');
        failed++;
      }
    }
    return { delivered, failed };
  }
}
