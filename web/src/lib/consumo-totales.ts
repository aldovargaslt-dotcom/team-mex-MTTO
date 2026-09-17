import type { Movimiento, PendienteComprobante, TipoMovimiento } from './types';

export const PERIODOS_CONSUMO = [
  { id: '7D', label: '7 d' },
  { id: '30D', label: '30 d' },
  { id: '90D', label: '90 d' },
] as const;

export type PeriodoConsumo = (typeof PERIODOS_CONSUMO)[number]['id'];

export type ConsumoSku = {
  itemId: string;
  sku: string;
  nombre: string;
  salidaOt: number;
  entrada: number;
  ajuste: number;
  compraExterna: number;
};

export function parsePeriodoConsumo(raw: string | null): PeriodoConsumo {
  if (raw === '7D' || raw === '90D') return raw;
  return '30D';
}

function ymdUtc(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addUtcDays(base: Date, days: number) {
  return new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + days),
  );
}

export function datesForPeriodoConsumo(
  id: PeriodoConsumo,
  now = new Date(),
): { from: string; to: string } {
  const to = ymdUtc(now);
  if (id === '7D') return { from: ymdUtc(addUtcDays(now, -6)), to };
  if (id === '90D') return { from: ymdUtc(addUtcDays(now, -89)), to };
  return { from: ymdUtc(addUtcDays(now, -29)), to };
}

function startOfUtcDay(isoDate: string) {
  return new Date(`${isoDate}T00:00:00.000Z`).getTime();
}

function endOfUtcDay(isoDate: string) {
  return new Date(`${isoDate}T23:59:59.999Z`).getTime();
}

export function inPeriodoIso(
  iso: string | null | undefined,
  from: string,
  to: string,
) {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= startOfUtcDay(from) && t <= endOfUtcDay(to);
}

function ensureRow(
  byId: Map<string, ConsumoSku>,
  itemId: string,
  sku: string,
  nombre: string,
) {
  let row = byId.get(itemId);
  if (!row) {
    row = {
      itemId,
      sku,
      nombre,
      salidaOt: 0,
      entrada: 0,
      ajuste: 0,
      compraExterna: 0,
    };
    byId.set(itemId, row);
  }
  return row;
}

function qtyTipo(tipo: TipoMovimiento, qty: number, row: ConsumoSku) {
  if (tipo === 'SALIDA_OT') row.salidaOt += qty;
  else if (tipo === 'ENTRADA') row.entrada += qty;
  else row.ajuste += qty;
}

export function agregarConsumo(
  movimientos: Movimiento[],
  pendientes: PendienteComprobante[],
  from: string,
  to: string,
): ConsumoSku[] {
  const byId = new Map<string, ConsumoSku>();
  for (const mov of movimientos) {
    if (!inPeriodoIso(mov.createdAt, from, to)) continue;
    qtyTipo(
      mov.tipo,
      mov.qty,
      ensureRow(byId, mov.itemId, mov.sku, mov.nombre),
    );
  }
  for (const pendiente of pendientes) {
    if (!inPeriodoIso(pendiente.createdAt, from, to)) continue;
    ensureRow(
      byId,
      pendiente.itemId,
      pendiente.sku,
      pendiente.nombre,
    ).compraExterna += pendiente.qty;
  }
  return [...byId.values()].sort((a, b) => {
    if (a.salidaOt !== b.salidaOt) return b.salidaOt - a.salidaOt;
    if (a.compraExterna !== b.compraExterna) {
      return b.compraExterna - a.compraExterna;
    }
    return a.sku.localeCompare(b.sku, 'es');
  });
}

export function totalesOrigen(rows: ConsumoSku[]) {
  return rows.reduce(
    (acc, row) => {
      acc.desdeStock += row.salidaOt;
      acc.compraExterna += row.compraExterna;
      return acc;
    },
    { desdeStock: 0, compraExterna: 0 },
  );
}
