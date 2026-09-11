import { randomUUID } from 'crypto';
import { OrigenConsumo, VISITA_CERRADA, buildVisitaCerrada } from './visita-cerrada';

describe('VisitaCerrada envelope (ADR-001)', () => {
  it('congela eventId, eventType, km, cerradoAt y occurredAt ISO-8601', () => {
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
});
