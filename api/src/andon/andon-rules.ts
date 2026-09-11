import { LastClosedVisit } from './andon-types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function diasEntre(fromIso: string, toIso: string): number {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  return Math.floor((to - from) / MS_PER_DAY);
}

export type EvaluarAperturaInput = {
  lastClosed: LastClosedVisit | null;
  currentKm: number;
  nowIso: string;
  unidadActiva: boolean;
  tieneNoResuelto: boolean;
  tKm: number;
  tDias: number;
};

export type EvaluarAperturaResult = {
  abrir: boolean;
  kmDesde: number;
  diasDesde: number;
};

/**
 * Andon v0: aviso de mantenimiento vencido.
 * A1 skip si no hay visita cerrada previa.
 * A2 skip si ya hay un aviso no resuelto.
 * A4 skip si la unidad está inactiva.
 * A3 abrir si km-desde-última ≥ t_km OR días ≥ t_dias.
 */
export function evaluarApertura(
  input: EvaluarAperturaInput,
): EvaluarAperturaResult {
  const empty = { abrir: false, kmDesde: 0, diasDesde: 0 };
  // A1: sin VisitaCerrada previa (proyección lastClosed + visitaId opaco) no se abre.
  if (!input.lastClosed?.visitaId?.trim()) {
    return empty;
  }
  const kmDesde = input.currentKm - input.lastClosed.km;
  const diasDesde = diasEntre(input.lastClosed.cerradoAt, input.nowIso);
  if (!input.unidadActiva) {
    return { abrir: false, kmDesde, diasDesde };
  }
  if (input.tieneNoResuelto) {
    return { abrir: false, kmDesde, diasDesde };
  }
  const porKm = kmDesde >= input.tKm;
  const porDias = diasDesde >= input.tDias;
  return { abrir: porKm || porDias, kmDesde, diasDesde };
}
