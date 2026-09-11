import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { VisitaCerradaPayload } from '../events/visita-cerrada';
import { OutboxEvent } from './outbox-event.entity';

export type OutboxHandler = (
  payload: Record<string, unknown>,
  manager: EntityManager,
) => Promise<void>;

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);
  private readonly handlers = new Map<string, OutboxHandler>();

  register(type: string, handler: OutboxHandler) {
    this.handlers.set(type, handler);
  }

  async enqueueAndDispatch(
    manager: EntityManager,
    type: string,
    payload: Record<string, unknown> | VisitaCerradaPayload,
  ) {
    const eventId =
      payload &&
      typeof payload === 'object' &&
      'eventId' in payload &&
      typeof payload.eventId === 'string'
        ? payload.eventId
        : undefined;

    if (eventId) {
      const existing = await manager.findOne(OutboxEvent, {
        where: { id: eventId },
      });
      if (existing?.processedAt) {
        return existing;
      }
    }

    const event = manager.create(OutboxEvent, {
      ...(eventId ? { id: eventId } : {}),
      type,
      payload: payload as unknown as Record<string, unknown>,
      processedAt: null,
    });
    await manager.save(event);

    const handler = this.handlers.get(type);
    if (!handler) {
      this.logger.warn(`Sin handler para outbox ${type}; queda pendiente.`);
      return event;
    }

    await handler(payload as unknown as Record<string, unknown>, manager);
    event.processedAt = new Date();
    await manager.save(event);
    return event;
  }
}
