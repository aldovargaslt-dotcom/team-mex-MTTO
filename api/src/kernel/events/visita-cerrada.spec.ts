import { randomUUID } from 'crypto';
import { OrigenConsumo, VISITA_CERRADA, buildVisitaCerrada } from './visita-cerrada';

describe('VisitaCerrada envelope (ADR-001 / ADR-004 O1)', () => {
  it('O1 congela eventId, visitaId, unidadId, tipoVehiculoId, km, cerradoAt y consumos', () => {
    const eventId = randomUUID();
    const cerradoAt = new Date('2026-09-11T12:00:00.000Z');
    const payload = buildVisitaCerrada({
      eventId,
      visitaId: 'visita-1',
      unidadId: 'unidad-1',
      tipoVehiculoId: 'tipo-1',
      km: 14000,
      cerradoAt,
      consumos: [
        { itemId: 'item-1', qty: 2, origen: OrigenConsumo.DESDE_STOCK },
      ],
    });

    expect(payload).toEqual({
      eventId,
      eventType: VISITA_CERRADA,
      occurredAt: '2026-09-11T12:00:00.000Z',
      visitaId: 'visita-1',
      unidadId: 'unidad-1',
      tipoVehiculoId: 'tipo-1',
      km: 14000,
      cerradoAt: '2026-09-11T12:00:00.000Z',
      consumos: [{ itemId: 'item-1', qty: 2, origen: 'DESDE_STOCK' }],
    });
  });

  it('permite consumos vacíos', () => {
    const payload = buildVisitaCerrada({
      eventId: randomUUID(),
      visitaId: 'visita-2',
      unidadId: 'unidad-1',
      tipoVehiculoId: 'tipo-1',
      km: 0,
      cerradoAt: '2026-09-11T08:00:00.000Z',
      consumos: [],
    });
    expect(payload.km).toBe(0);
    expect(payload.consumos).toEqual([]);
    expect(payload.eventType).toBe(VISITA_CERRADA);
    expect(payload.cerradoAt).toBe(payload.occurredAt);
  });
});
