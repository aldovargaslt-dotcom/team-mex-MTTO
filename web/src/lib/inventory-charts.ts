import type { ConsumoSku } from './consumo-totales';
import type { ItemInventario, Movimiento, PendienteComprobante } from './types';

type Catalog = ReadonlyMap<string, ItemInventario>;
export type ConsumptionBucket = { from: string; to: string; stock: number; external: number };
export type ConsumptionSeries = {
  unit: string;
  rows: ConsumoSku[];
  buckets: ConsumptionBucket[];
  interval: 'día' | 'semana' | 'mes' | 'año' | 'años';
  yearStep: number;
};
const DAY = 86400000;
const iso = (time: number) => new Date(time).toISOString().slice(0, 10);
const time = (date: string) => Date.parse(`${date}T00:00:00Z`);

export function consumptionUnit(item: { uom?: string | null } | undefined): string | null {
  const unit = item?.uom?.trim();
  if (!unit) return null;
  return unit === 'pieza' || unit === 'pza' ? 'pza' : unit;
}

export function consumptionUnitTotals(rows: ConsumoSku[], catalog: Catalog) {
  const groups = new Map<string | null, { stock: number; external: number }>();
  for (const row of rows) {
    const unit = consumptionUnit(catalog.get(row.itemId));
    const total = groups.get(unit) ?? { stock: 0, external: 0 };
    total.stock += row.salidaOt;
    total.external += row.compraExterna;
    groups.set(unit, total);
  }
  return [...groups].map(([unit, totals]) => ({ unit, ...totals }));
}

/** Only include the same item identities as the filtered consumption table. */
export function consumptionCharts(
  rows: ConsumoSku[], catalog: Catalog, movements: Movimiento[], purchases: PendienteComprobante[],
  from: string | null, to: string | null,
): { series: ConsumptionSeries[]; unknownItems: number } {
  const ids = new Set(rows.map(row => row.itemId));
  const events = [
    ...movements.filter(row => row.tipo === 'SALIDA_OT').map(row => ({ ...row, source: 'stock' as const })),
    ...purchases.map(row => ({ ...row, source: 'external' as const })),
  ].filter(row => ids.has(row.itemId) && row.qty > 0 && Number.isFinite(row.qty)
    && Number.isFinite(Date.parse(row.createdAt))
    && (!from || iso(Date.parse(row.createdAt)) >= from) && (!to || iso(Date.parse(row.createdAt)) <= to));
  const dates = events.map(row => iso(Date.parse(row.createdAt))).sort();
  if (!dates.length) return { series: [], unknownItems: rows.filter(row => !consumptionUnit(catalog.get(row.itemId))).length };
  const start = time(from ?? dates[0]);
  const end = time(to ?? dates[dates.length - 1]);
  const days = Math.round((end - start) / DAY) + 1;
  const interval = days <= 14 ? 'día' : days <= 93 ? 'semana' : days <= 1096 ? 'mes' : 'año';
  const yearStep = interval === 'año' ? Math.max(1, Math.ceil((new Date(end).getUTCFullYear() - new Date(start).getUTCFullYear() + 1) / 24)) : 1;
  const floor = (value: number) => {
    const d = new Date(value);
    if (interval === 'día') return value;
    if (interval === 'semana') return value - ((d.getUTCDay() + 6) % 7) * DAY;
    if (interval === 'mes') { d.setUTCDate(1); return d.getTime(); }
    d.setUTCFullYear(Math.floor(d.getUTCFullYear() / yearStep) * yearStep, 0, 1);
    return d.getTime();
  };
  const next = (value: number) => {
    if (interval === 'día') return value + DAY;
    if (interval === 'semana') return value + 7 * DAY;
    const d = new Date(value);
    if (interval === 'mes') d.setUTCMonth(d.getUTCMonth() + 1);
    else d.setUTCFullYear(d.getUTCFullYear() + yearStep);
    return d.getTime();
  };
  const template: ConsumptionBucket[] = [];
  for (let cursor = floor(start); cursor <= end; cursor = next(cursor)) {
    template.push({ from: iso(Math.max(cursor, start)), to: iso(Math.min(next(cursor) - DAY, end)), stock: 0, external: 0 });
  }
  const grouped = new Map<string, ConsumoSku[]>();
  let unknownItems = 0;
  for (const row of rows) {
    const unit = consumptionUnit(catalog.get(row.itemId));
    if (!unit) { unknownItems++; continue; }
    const list = grouped.get(unit) ?? [];
    list.push(row); grouped.set(unit, list);
  }
  const series = [...grouped].sort(([a], [b]) => a.localeCompare(b, 'es')).map<ConsumptionSeries>(([unit, entries]) => {
    const buckets = template.map(bucket => ({ ...bucket }));
    const bucketIndexes = new Map(buckets.map((bucket, index) => [iso(floor(time(bucket.from))), index]));
    for (const event of events) {
      if (consumptionUnit(catalog.get(event.itemId)) !== unit) continue;
      const index = bucketIndexes.get(iso(floor(time(iso(Date.parse(event.createdAt))))));
      if (index !== undefined) buckets[index][event.source] += event.qty;
    }
    return {
      unit, buckets, interval: yearStep > 1 ? 'años' as const : interval, yearStep,
      rows: [...entries].sort((a, b) => (b.salidaOt + b.compraExterna) - (a.salidaOt + a.compraExterna)
        || a.nombre.localeCompare(b.nombre, 'es') || a.sku.localeCompare(b.sku, 'es') || a.itemId.localeCompare(b.itemId)).slice(0, 10),
    };
  });
  return { series, unknownItems };
}
