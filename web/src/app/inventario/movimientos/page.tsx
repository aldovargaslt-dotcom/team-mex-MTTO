'use client';

import { useEffect, useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { api, HttpError } from '@/lib/api';
import { etiquetaMovimiento, etiquetaUom, formatFecha } from '@/lib/format';
import { useRole } from '@/lib/role';
import type { Movimiento } from '@/lib/types';
import { OtLink, useOtLabels } from '@/components/OtLink';
import { DataTable } from '@/components/ui/data-table';
import { FormAlert, PageHeader } from '@/components/ui/field';

export default function MovimientosPage() {
  const { role, userId } = useRole();
  const [rows, setRows] = useState<Movimiento[]>([]);
  const [error, setError] = useState<string | null>(null);
  const labels = useOtLabels(
    rows.map((row) => row.visitaId),
    { role, userId },
  );

  useEffect(() => {
    if (!role) return;
    void (async () => {
      try {
        setRows(await api<Movimiento[]>('/inventario/movimientos', { role, userId }));
      } catch (err) {
        setError(
          err instanceof HttpError ? err.message : 'No se pudieron cargar los movimientos.',
        );
      }
    })();
  }, [role, userId]);

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
        accessorKey: 'sku',
        header: 'SKU',
        cell: ({ row }) => <span className="mono">{row.original.sku}</span>,
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
            {row.original.delta > 0 ? `+${row.original.delta}` : row.original.delta}
          </span>
        ),
      },
      {
        accessorKey: 'visitaId',
        header: 'Visita',
        cell: ({ row }) => (
          <OtLink visitaId={row.original.visitaId} labels={labels} />
        ),
      },
      {
        accessorKey: 'nota',
        header: 'Nota',
        cell: ({ row }) => row.original.nota || '—',
      },
    ],
    [labels],
  );

  return (
    <>
      <PageHeader title="Movimientos" />
      <FormAlert>{error}</FormAlert>
      <DataTable columns={columns} data={rows} empty="Aún no hay movimientos." />
    </>
  );
}
