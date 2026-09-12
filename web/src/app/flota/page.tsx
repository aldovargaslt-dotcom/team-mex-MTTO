'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { RoleGate } from '@/components/RoleGate';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { FormAlert, PageHeader } from '@/components/ui/field';
import { api, HttpError } from '@/lib/api';
import { formatDuracion } from '@/lib/format';
import { useRole } from '@/lib/role';
import type { TableroFlotaRow } from '@/lib/types';

export default function FlotaPage() {
  return (
    <RoleGate allow={['LOGISTICA', 'ADMIN_DIRECTIVO']}>
      <FlotaTablero />
    </RoleGate>
  );
}

function FlotaTablero() {
  const { role, userId } = useRole();
  const router = useRouter();
  const [rows, setRows] = useState<TableroFlotaRow[]>([]);
  const [fuera, setFuera] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cargar(soloFuera = fuera) {
    const qs = soloFuera ? '?fuera=1' : '';
    setRows(await api<TableroFlotaRow[]>(`/flota/tablero${qs}`, { role: role!, userId }));
  }

  useEffect(() => {
    if (!role) return;
    void cargar().catch((err) => {
      setError(
        err instanceof HttpError ? err.message : 'No se pudo cargar el tablero.',
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, fuera]);

  const columns = useMemo<ColumnDef<TableroFlotaRow>[]>(
    () => [
      {
        accessorKey: 'numeroInterno',
        header: 'Unidad',
        cell: ({ row }) => (
          <div>
            <strong>{row.original.numeroInterno}</strong>
            <div className="muted">{row.original.placas}</div>
          </div>
        ),
      },
      {
        accessorKey: 'estado',
        header: 'Estado',
        cell: ({ row }) => (
          <div>
            <StatusBadge estado={row.original.estado} />
            {row.original.motivoInactivacion === 'ENVIO_ESPECIAL' ? (
              <div className="muted">Envío especial</div>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: 'sitioNombre',
        header: 'Sitio',
        cell: ({ row }) => row.original.sitioNombre ?? 'Sin movimiento',
      },
      {
        accessorKey: 'choferActualNombre',
        header: 'Chofer actual',
        cell: ({ row }) => row.original.choferActualNombre ?? '—',
      },
      {
        accessorKey: 'choferUltimoNombre',
        header: 'Último chofer',
        cell: ({ row }) => row.original.choferUltimoNombre ?? '—',
      },
      {
        accessorKey: 'tiempoFueraMs',
        header: 'Fuera',
        cell: ({ row }) =>
          row.original.salidaAbiertaId
            ? formatDuracion(row.original.tiempoFueraMs)
            : 'En patio',
      },
    ],
    [],
  );

  return (
    <div className="space-y-3">
      <PageHeader
        title="Flota"
        lede="Bitácora de patio: quién se lleva qué unidad, a qué sitio y con firmas."
        actions={
          <Button asChild variant="secondary">
            <Link href="/flota/sitios">Sitios</Link>
          </Button>
        }
      />
      <FormAlert>{error}</FormAlert>
      <nav className="subnav" aria-label="Filtro flota">
        <button
          type="button"
          className={!fuera ? 'active' : ''}
          onClick={() => setFuera(false)}
        >
          Todas
        </button>
        <button
          type="button"
          className={fuera ? 'active' : ''}
          onClick={() => setFuera(true)}
        >
          Aún no regresan
        </button>
      </nav>
      <DataTable
        columns={columns}
        data={rows}
        empty="No hay unidades en este filtro."
        onRowClick={(row) => router.push(`/flota/unidades/${row.unidadId}`)}
      />
    </div>
  );
}
