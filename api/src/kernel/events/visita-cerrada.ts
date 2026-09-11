export const VISITA_CERRADA = 'VisitaCerrada';

export enum OrigenConsumo {
  DESDE_STOCK = 'DESDE_STOCK',
  COMPRA_EXTERNA = 'COMPRA_EXTERNA',
}

export type ConsumoLinea = {
  itemId: string;
  qty: number;
  origen: OrigenConsumo;
};

/** Envelope congelado (ADR-001). Inventario aplica solo `consumos` (ADR-002). */
export type VisitaCerradaPayload = {
  eventId: string;
  eventType: typeof VISITA_CERRADA;
  occurredAt: string;
  visitaId: string;
  unidadId: string;
  tipoVehiculoId: string;
  km: number;
  cerradoAt: string;
  consumos: ConsumoLinea[];
};

export function toIso8601(value: Date | string) {
  return typeof value === 'string' ? value : value.toISOString();
}

export function buildVisitaCerrada(input: {
  eventId: string;
  visitaId: string;
  unidadId: string;
  tipoVehiculoId: string;
  km: number;
  cerradoAt: Date | string;
  consumos: ConsumoLinea[];
}): VisitaCerradaPayload {
  const cerradoAt = toIso8601(input.cerradoAt);
  return {
    eventId: input.eventId,
    eventType: VISITA_CERRADA,
    occurredAt: cerradoAt,
    visitaId: input.visitaId,
    unidadId: input.unidadId,
    tipoVehiculoId: input.tipoVehiculoId,
    km: input.km,
    cerradoAt,
    consumos: input.consumos,
  };
}
