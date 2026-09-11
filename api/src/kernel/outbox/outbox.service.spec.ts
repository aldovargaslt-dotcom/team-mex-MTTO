import { randomUUID } from 'crypto';
import { EntityManager } from 'typeorm';
import {
  OrigenConsumo,
  VISITA_CERRADA,
  buildVisitaCerrada,
} from '../events/visita-cerrada';
import { OutboxEvent } from './outbox-event.entity';
import { OutboxService } from './outbox.service';

describe('OutboxService (ADR-001 eventId)', () => {
  it('persiste eventId como id de outbox_events y no escribe si no hay handler', async () => {
    const saved: OutboxEvent[] = [];
    const manager = {
      create: (_cls: unknown, data: Partial<OutboxEvent>) =>
        Object.assign(new OutboxEvent(), data),
      save: async (entity: OutboxEvent) => {
        saved.push(entity);
        return entity;
      },
    } as unknown as EntityManager;

    const payload = buildVisitaCerrada({
      eventId: randomUUID(),
      visitaId: 'visita-1',
      unidadId: 'unidad-1',
      tipoVehiculoId: 'tipo-1',
      km: 250,
      cerradoAt: '2026-09-11T12:00:00.000Z',
      consumos: [
        { itemId: 'item-1', qty: 1, origen: OrigenConsumo.COMPRA_EXTERNA },
      ],
    });

    const svc = new OutboxService();
    const event = await svc.enqueueAndDispatch(manager, VISITA_CERRADA, payload);

    expect(event.id).toBe(payload.eventId);
    expect(saved).toHaveLength(1);
    expect(saved[0].id).toBe(payload.eventId);
    expect(saved[0].type).toBe(VISITA_CERRADA);
    expect(saved[0].payload.eventId).toBe(payload.eventId);
    expect(saved[0].payload.km).toBe(250);
    expect(saved[0].payload.cerradoAt).toBe('2026-09-11T12:00:00.000Z');
    expect(saved[0].payload.consumos).toEqual([
      { itemId: 'item-1', qty: 1, origen: OrigenConsumo.COMPRA_EXTERNA },
    ]);
    expect(saved[0].processedAt).toBeNull();
  });
});
