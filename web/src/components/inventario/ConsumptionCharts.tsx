'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Field } from '@/components/ui/field';
import { NativeSelect } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { consumptionCharts, type ConsumptionBucket } from '@/lib/inventory-charts';
import { rememberAnalysisPosition } from '@/lib/inventory-analysis';
import type { ConsumoSku } from '@/lib/consumo-totales';
import type { ItemInventario, Movimiento, PendienteComprobante } from '@/lib/types';

type Props = {
  rows: ConsumoSku[];
  catalog: ReadonlyMap<string, ItemInventario>;
  movements: Movimiento[];
  purchases: PendienteComprobante[];
  from: string | null;
  to: string | null;
  currentHref: string;
  sourceHref: (row: ConsumoSku, source: 'stock' | 'external') => string;
  intervalHref: (bucket: ConsumptionBucket) => string;
  chosenUnit: string | null;
  onUnitChange: (unit: string) => void;
};
const number = (value: number) => value.toLocaleString('es-MX', { maximumFractionDigits: 3 });
const date = (value: string) => new Date(`${value}T00:00:00Z`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const fullRange = (bucket: ConsumptionBucket) => bucket.from === bucket.to ? bucket.from : `${bucket.from} al ${bucket.to}`;

export function ConsumptionCharts({ rows, catalog, movements, purchases, from, to, currentHref, sourceHref, intervalHref, chosenUnit, onUnitChange }: Props) {
  const model = useMemo(() => consumptionCharts(rows, catalog, movements, purchases, from, to), [rows, catalog, movements, purchases, from, to]);
  const [expandedRanking, setExpandedRanking] = useState(false);
  const series = model.series.find(entry => entry.unit === chosenUnit) ?? model.series.find(entry => entry.unit === 'pza') ?? model.series[0];
  if (!series) return rows.length ? <p className="mb-3 text-xs text-muted-foreground">Las gráficas requieren la unidad de medida de las refacciones. Consulta los registros en la tabla.</p> : null;
  const maxTime = Math.max(1, ...series.buckets.map(bucket => bucket.stock + bucket.external));
  const maxRank = Math.max(1, ...series.rows.map(row => row.salidaOt + row.compraExterna));
  const savePosition = () => rememberAnalysisPosition(currentHref);
  return (
    <section className="inventory-charts" aria-label="Comportamiento del consumo">
      <div className="inventory-charts-toolbar">
        <p className="inventory-chart-legend"><span><i className="inventory-chart-stock" aria-hidden="true" />Desde almacén</span><span><i className="inventory-chart-external" aria-hidden="true" />Compra externa</span></p>
        {model.series.length > 1 ? <Field label="Unidad" htmlFor="chart-unit" className="inventory-chart-unit"><NativeSelect id="chart-unit" value={series.unit} onChange={event => onUnitChange(event.target.value)}>{model.series.map(entry => <option key={entry.unit} value={entry.unit}>{entry.unit}</option>)}</NativeSelect></Field>
          : <span className="text-xs text-muted-foreground">Cantidades en {series.unit}</span>}
      </div>
      <div className="inventory-charts-grid">
        <figure className="inventory-chart-time">
          <figcaption><h2>Consumo en el tiempo</h2><p>Por {series.interval === 'años' ? `${series.yearStep} años` : series.interval} · {series.unit}</p></figcaption>
          <div className="inventory-time-frame">
          <div className="inventory-time-scale" aria-hidden="true"><span>{number(maxTime)}</span><span>{number(maxTime / 2)}</span><span>0</span></div>
          <div className="inventory-time-scroll" role="region" aria-label="Intervalos de consumo; desplaza para ver todos" tabIndex={0}>
            <div className="inventory-time-plot">
              {series.buckets.map(bucket => {
                const total = bucket.stock + bucket.external;
                const label = `${fullRange(bucket)}: ${number(bucket.stock)} ${series.unit} desde almacén y ${number(bucket.external)} ${series.unit} de compra externa. Revisar consumo del intervalo`;
                const labelDate = series.interval === 'años' ? `${bucket.from.slice(0, 4)}–${bucket.to.slice(0, 4)}`
                  : series.interval === 'año' ? bucket.from.slice(0, 4)
                  : series.interval === 'mes' ? new Date(`${bucket.from}T00:00:00Z`).toLocaleDateString('es-MX', { month: 'short', year: '2-digit', timeZone: 'UTC' }) : date(bucket.from);
                const contents = <><span className="inventory-time-column" aria-hidden="true"><span className="inventory-time-stack" style={{ height: `${total / maxTime * 100}%` }}><span className="inventory-time-value">{number(total)}</span><span className="inventory-chart-external" style={{ height: `${total ? bucket.external / total * 100 : 0}%` }} /><span className="inventory-chart-stock" style={{ height: `${total ? bucket.stock / total * 100 : 0}%` }} /></span></span><span className="inventory-time-label" aria-hidden="true">{labelDate}</span></>;
                return total > 0 ? <Link key={bucket.from} href={intervalHref(bucket)} className="inventory-time-bucket" onClick={savePosition} aria-label={label} title={label}>{contents}</Link>
                  : <div key={bucket.from} className="inventory-time-bucket" aria-label={`${fullRange(bucket)}: sin consumo`}>{contents}</div>;
              })}
            </div>
          </div>
          </div>
          <p className="inventory-chart-hint">Selecciona un intervalo para revisar su consumo.</p>
          <details className="inventory-chart-values"><summary>Ver valores por intervalo</summary><div className="inventory-chart-values-scroll"><table><caption className="sr-only">Consumo por intervalo en {series.unit}</caption><thead><tr><th>Periodo</th><th>Almacén</th><th>Externa</th></tr></thead><tbody>{series.buckets.map(bucket => <tr key={bucket.from}><th scope="row">{fullRange(bucket)}</th><td>{number(bucket.stock)}</td><td>{number(bucket.external)}</td></tr>)}</tbody></table></div></details>
        </figure>
        <figure className="inventory-chart-ranking">
          <figcaption><h2>Refacciones más consumidas</h2><p>{!expandedRanking && series.rows.length > 5 ? `5 de ${series.rows.length} principales` : `${series.rows.length} refacciones`} · total de ambos orígenes · {series.unit}</p></figcaption>
          <div className="inventory-rank-head" aria-hidden="true"><span>Refacción</span><span>Almacén</span><span>Externa</span></div>
          <ol>
            {series.rows.slice(0, expandedRanking ? 10 : 5).map(row => <li key={row.itemId}>
              <div className="inventory-rank-row"><span className="inventory-rank-name" title={`${row.nombre} · ${row.sku}`}>{row.nombre}</span><span className="inventory-rank-quantities"><Link href={sourceHref(row, 'stock')} onClick={savePosition} aria-label={`${row.nombre}: ${number(row.salidaOt)} ${series.unit} desde almacén; ver salidas`} title="Ver salidas de almacén">{number(row.salidaOt)}</Link><Link href={sourceHref(row, 'external')} onClick={savePosition} aria-label={`${row.nombre}: ${number(row.compraExterna)} ${series.unit} de compra externa; ver comprobantes`} title="Ver compras externas">{number(row.compraExterna)}</Link></span></div>
              <div className="inventory-rank-track" aria-hidden="true"><span className="inventory-chart-stock" style={{ width: `${row.salidaOt / maxRank * 100}%` }} /><span className="inventory-chart-external" style={{ width: `${row.compraExterna / maxRank * 100}%` }} /></div>
            </li>)}
          </ol>
          {series.rows.length > 5 ? <Button variant="quiet" className="inventory-rank-expand" aria-expanded={expandedRanking} onClick={() => setExpandedRanking(value => !value)}>{expandedRanking ? 'Mostrar solo 5' : `Ver las ${series.rows.length} refacciones`}</Button> : null}

        </figure>
      </div>
      {model.unknownItems > 0 ? <p className="inventory-chart-exclusion">{model.unknownItems} {model.unknownItems === 1 ? 'refacción sin unidad conocida, excluida' : 'refacciones sin unidad conocida, excluidas'} de las gráficas.</p> : null}
    </section>
  );
}
