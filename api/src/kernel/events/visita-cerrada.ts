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

export type VisitaCerradaPayload = {
  visitaId: string;
  unidadId: string;
  tipoVehiculoId: string;
  consumos: ConsumoLinea[];
};
