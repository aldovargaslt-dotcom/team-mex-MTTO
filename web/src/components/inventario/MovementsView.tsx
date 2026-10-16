'use client';

import { InventoryResultCount } from './InventoryResultCount';
import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { OtLink, useOtLabels } from '@/components/OtLink';
import { DataTable } from '@/components/ui/data-table';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { etiquetaMovimiento, etiquetaUom, formatFecha } from '@/lib/format';
import type { Movimiento } from '@/lib/types';

export function MovementsView({ rows, role, userId }: { rows: Movimiento[]; role: string | null; userId?: string }) {
  const [detalle, setDetalle] = useState<Movimiento | null>(null);
  const labels = useOtLabels(rows.map((row) => row.visitaId), { role, userId });
  const columns: ColumnDef<Movimiento, unknown>[] = useMemo(
    () => [
      {
        accessorKey: 'createdAt',
        header: 'Fecha',
        cell: ({ row }) => formatFecha(row.original.createdAt),
      },
      {
        accessorKey: 'tipo',
        header: 'Tipo',
        cell: ({ row }) => etiquetaMovimiento(row.original.tipo),
      },
      {
        accessorKey: 'nombre',
        header: 'Refacción',
        cell: ({ row }) => <span className="inventory-identity"><span>{row.original.nombre}</span><span className="inventory-secondary">{row.original.sku}</span></span>,
      },
      {
        accessorKey: 'qty',
        header: 'Cant.',
        cell: ({ row }) => (
          <span className="mono">
            {row.original.qty} {etiquetaUom('pieza')}
          </span>
        ),
      },
      {
        accessorKey: 'delta',
        header: 'Cambio',
        cell: ({ row }) => (
          <span className="mono">
            {row.original.delta > 0
              ? `+${row.original.delta}`
              : row.original.delta}
          </span>
        ),
      },
      {
        accessorKey: 'visitaId',
        header: 'Visita',
        cell: ({ row }) => (
          <OtLink visitaId={row.original.visitaId} labels={labels} compact />
        ),
      },
      {
        accessorKey: 'nota',
        header: 'Nota',
        cell: ({ row }) => <span className="inventory-note-preview">{row.original.nota || '—'}</span>,
      },
    ],
    [labels],
  );

  return (
    <>
      <InventoryResultCount count={rows.length} singular="movimiento" plural="movimientos" />
      <DataTable
          columns={columns}
          data={rows}
          className="inventory-movements-table"
          rowActionColumn="nombre"
          rowActionLabel={(row) => `Abrir movimiento de ${row.nombre}`}
          columnClassNames={{ qty: 'text-right whitespace-nowrap', delta: 'text-right whitespace-nowrap', tipo: 'whitespace-nowrap' }}
          onRowClick={setDetalle}
          empty={
            <>No hay movimientos con estos filtros.<span className="mt-1 block text-muted-foreground">Revisa la búsqueda, categoría, periodo o tipo de movimiento.</span></>
          }
      />

      {rows.length > 0 ? <ul className="inventory-operation-mobile" aria-label="Movimientos">
        {rows.map((row) => <li key={row.id}>
          <button type="button" className="inventory-mobile-main" onClick={() => setDetalle(row)} aria-label={`Abrir movimiento de ${row.nombre}`}>
            <span className="inventory-mobile-copy"><span className="font-medium text-navy">{row.nombre}</span><span className="inventory-secondary">{row.sku}</span></span>
            <span className="inventory-mobile-meta"><span className="text-xs">{etiquetaMovimiento(row.tipo)}</span><span className="mono whitespace-nowrap">{row.delta > 0 ? '+' : ''}{row.delta} {etiquetaUom('pieza')}</span></span>
          </button>
          <div className="inventory-operation-context"><span>{formatFecha(row.createdAt)}</span><OtLink visitaId={row.visitaId} labels={labels} compact /></div>
        </li>)}
      </ul> : null}
      <Sheet
        open={detalle != null}
        onOpenChange={(open) => {
          if (!open) setDetalle(null);
        }}
      >
        <SheetContent side="right" className="inventory-detail-sheet overflow-y-auto">
          {detalle ? (
            <>
              <SheetHeader>
                <SheetTitle>{etiquetaMovimiento(detalle.tipo)}</SheetTitle>
                <SheetDescription>
                  <span className="mono">{detalle.sku}</span>
                  {` · ${detalle.nombre}`}
                </SheetDescription>
              </SheetHeader>
              <dl className="grid gap-3 px-4 pb-4 text-sm">
                <div>
                  <dt className="text-[12px] text-muted-foreground">Fecha</dt>
                  <dd>{formatFecha(detalle.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-[12px] text-muted-foreground">SKU</dt>
                  <dd className="mono">{detalle.sku}</dd>
                </div>
                <div>
                  <dt className="text-[12px] text-muted-foreground">Tipo</dt>
                  <dd>{etiquetaMovimiento(detalle.tipo)}</dd>
                </div>
                <div>
                  <dt className="text-[12px] text-muted-foreground">Cantidad</dt>
                  <dd className="mono">
                    {detalle.qty} {etiquetaUom('pieza')}
                  </dd>
                </div>
                <div>
                  <dt className="text-[12px] text-muted-foreground">Cambio</dt>
                  <dd className="mono">
                    {detalle.delta > 0 ? `+${detalle.delta}` : detalle.delta}
                  </dd>
                </div>
                <div>
                  <dt className="text-[12px] text-muted-foreground">Visita</dt>
                  <dd>
                    <OtLink visitaId={detalle.visitaId} labels={labels} />
                  </dd>
                </div>
                <div>
                  <dt className="text-[12px] text-muted-foreground">Nota</dt>
                  <dd>{detalle.nota || '—'}</dd>
                </div>
                <div>
                  <dt className="text-[12px] text-muted-foreground">Usuario</dt>
                  <dd className="mono">{detalle.createdBy || '—'}</dd>
                </div>
              </dl>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
