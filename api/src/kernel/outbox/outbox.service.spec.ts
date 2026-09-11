import { randomUUID } from 'crypto';
import { EntityManager } from 'typeorm';
import {
  OrigenConsumo,
  VISITA_CERRADA,
  buildVisitaCerrada,
} from '../events/visita-cerrada';
import { OutboxEvent } from './outbox-event.entity';
import { OutboxService } from './outbox.service';

function payloadFixture(eventId: string) {
  return buildVisitaCerrada({
    eventId,
    visitaId: 'visita-1',
    unidadId: 'unidad-1',
    tipoVehiculoId: 'tipo-1',
    km: 250,
    cerradoAt: '2026-09-11T12:00:00.000Z',
    consumos: [
      { itemId: 'item-1', qty: 1, origen: OrigenConsumo.COMPRA_EXTERNA },
    ],
  });
}

describe('OutboxService (ADR-001 / ADR-004 O1/O2)', () => {
  it('O1 persiste eventId como id de outbox_events', async () => {
    const saved: OutboxEvent[] = [];
    const manager = {
      findOne: async () => null,
      create: (_cls: unknown, data: Partial<OutboxEvent>) =>
        Object.assign(new OutboxEvent(), data),
      save: async (entity: OutboxEvent) => {
        saved.push(entity);
        return entity;
      },
    } as unknown as EntityManager;

    const payload = payloadFixture(randomUUID());
    const svc = new OutboxService();
    const event = await svc.enqueueAndDispatch(manager, VISITA_CERRADA, payload);

    expect(event.id).toBe(payload.eventId);
    expect(saved).toHaveLength(1);
    expect(saved[0].id).toBe(payload.eventId);
    expect(saved[0].payload.eventId).toBe(payload.eventId);
    expect(saved[0].payload.visitaId).toBe('visita-1');
    expect(saved[0].payload.unidadId).toBe('unidad-1');
    expect(saved[0].payload.tipoVehiculoId).toBe('tipo-1');
    expect(saved[0].payload.km).toBe(250);
    expect(saved[0].payload.cerradoAt).toBe('2026-09-11T12:00:00.000Z');
    expect(saved[0].payload.consumos).toEqual(payload.consumos);
    expect(saved[0].processedAt).toBeNull();
  });

  it('O2 no re-despacha el mismo eventId si processedAt ya está', async () => {
    const eventId = randomUUID();
    const payload = payloadFixture(eventId);
    const processed: OutboxEvent = Object.assign(new OutboxEvent(), {
      id: eventId,
      type: VISITA_CERRADA,
      payload,
      processedAt: new Date('2026-09-11T12:00:00.000Z'),
    });
    let handlerCalls = 0;
    const manager = {
      findOne: async () => processed,
      create: () => {
        throw new Error('no debe crear otra fila');
      },
      save: async () => {
        throw new Error('no debe volver a guardar');
      },
    } as unknown as EntityManager;

    const svc = new OutboxService();
    svc.register(VISITA_CERRADA, async () => {
      handlerCalls += 1;
    });
    const event = await svc.enqueueAndDispatch(manager, VISITA_CERRADA, payload);
    expect(event.id).toBe(eventId);
    expect(event.processedAt).toEqual(processed.processedAt);
    expect(handlerCalls).toBe(0);
  });
});
