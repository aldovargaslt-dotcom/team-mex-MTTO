import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { VISITA_CERRADA } from '../src/kernel/events/visita-cerrada';

export async function countVisitaCerradaOutbox(
  app: INestApplication,
  visitaId: string,
) {
  const ds = app.get(DataSource);
  const rows = (await ds.query(
    `SELECT id FROM outbox_events WHERE payload->>'visitaId' = $1`,
    [visitaId],
  )) as { id: string }[];
  return rows.length;
}

export async function assertVisitaCerradaOutbox(
  app: INestApplication,
  expected: {
    visitaId: string;
    unidadId: string;
    tipoVehiculoId: string;
    km: number;
    consumos: { itemId: string; qty: number; origen: string }[];
  },
) {
  const ds = app.get(DataSource);
  const rows = (await ds.query(
    `SELECT id, type, payload FROM outbox_events WHERE payload->>'visitaId' = $1`,
    [expected.visitaId],
  )) as { id: string; type: string; payload: Record<string, unknown> }[];

  expect(rows).toHaveLength(1);
  const row = rows[0];
  const payload = row.payload;
  expect(row.type).toBe(VISITA_CERRADA);
  expect(payload.eventId).toBe(row.id);
  expect(payload.eventType).toBe(VISITA_CERRADA);
  expect(payload.visitaId).toBe(expected.visitaId);
  expect(payload.unidadId).toBe(expected.unidadId);
  expect(payload.tipoVehiculoId).toBe(expected.tipoVehiculoId);
  expect(payload.km).toBe(expected.km);
  expect(typeof payload.cerradoAt).toBe('string');
  expect(payload.occurredAt).toBe(payload.cerradoAt);
  expect(payload.cerradoAt).toEqual(
    expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
  );
  expect(payload.consumos).toEqual(expected.consumos);
}
