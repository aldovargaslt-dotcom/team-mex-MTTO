'use client';

import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import type { ConsumoSku } from '@/lib/consumo-totales';
import type { ItemInventario } from '@/lib/types';
import { consumptionUnit, consumptionUnitTotals } from '@/lib/inventory-charts';
import { rememberAnalysisPosition } from '@/lib/inventory-analysis';

type Props = {
  rows: ConsumoSku[];
  catalog: ReadonlyMap<string, ItemInventario>;
  movementsAvailable: boolean;
  purchasesAvailable: boolean;
  currentHref: string;
  sourceHref: (row: ConsumoSku, source: 'stock' | 'external') => string;
};

export function ConsumptionView({ rows, catalog, movementsAvailable, purchasesAvailable, currentHref, sourceHref }: Props) {
  const totals = consumptionUnitTotals(rows, catalog);
  const totalText = (key: 'stock' | 'external') => totals.filter(total => total[key] !== 0).map(total => total.unit ? `${total[key].toLocaleString('es-MX')} ${total.unit}` : 'Unidad no disponible').join(', ') || '0';
  function source(row: ConsumoSku, kind: 'stock' | 'external') {
    const available = kind === 'stock' ? movementsAvailable : purchasesAvailable;
    if (!available) return <span className="text-xs text-muted-foreground">No disponible</span>;
    return (
      <Link
        href={sourceHref(row, kind)}
        className="inventory-source-link mono"
        onClick={() => rememberAnalysisPosition(currentHref)}
        aria-label={`Ver ${kind === 'stock' ? 'salidas de almacén' : 'compras externas'} de ${row.nombre}`}
      >
        {kind === 'stock' ? row.salidaOt : row.compraExterna} {consumptionUnit(catalog.get(row.itemId)) ?? '(unidad no disponible)'}
      </Link>
    );
  }
  const columns: ColumnDef<ConsumoSku, unknown>[] = [
    {
      accessorKey: 'nombre', header: 'Refacción',
      cell: ({ row }) => <span className="inventory-identity"><span className="font-medium text-navy">{row.original.nombre}</span><span className="inventory-secondary">{row.original.sku}</span></span>,
    },
    { accessorKey: 'salidaOt', header: 'Desde almacén', cell: ({ row }) => source(row.original, 'stock') },
    { accessorKey: 'compraExterna', header: 'Compra externa', cell: ({ row }) => source(row.original, 'external') },
  ];
  return (
    <>
      <div className="inventory-consumption-heading"><h2>Detalle por refacción</h2><span>{rows.length} {rows.length === 1 ? 'refacción' : 'refacciones'}</span></div>
      <p className="inventory-consumption-totals" role="status">
        <span><span>Desde almacén</span><strong>{movementsAvailable ? totalText('stock') : 'No disponible'}</strong></span>
        <span><span>Compra externa</span><strong>{purchasesAvailable ? totalText('external') : 'No disponible'}</strong></span>
      </p>
      <DataTable
        columns={columns}
        data={rows}
        className="inventory-consumption-table"
        columnClassNames={{ salidaOt: 'text-right whitespace-nowrap', compraExterna: 'text-right whitespace-nowrap' }}
        empty={movementsAvailable && purchasesAvailable
          ? 'No hay consumo con estos filtros. Revisa la búsqueda, categoría o periodo.'
          : 'La consulta está incompleta; falta una fuente de información.'}
      />
      {rows.length > 0 ? (
        <ul className="inventory-operation-mobile" aria-label="Consumo por refacción">
          {rows.map((row) => (
            <li key={row.itemId} className="inventory-consumption-item">
              <div className="inventory-identity"><span className="font-medium text-navy">{row.nombre}</span><span className="inventory-secondary">{row.sku}</span></div>
              <dl className="inventory-origin-grid">
                <div><dt>Desde almacén</dt><dd>{source(row, 'stock')}</dd></div>
                <div><dt>Compra externa</dt><dd>{source(row, 'external')}</dd></div>
              </dl>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
