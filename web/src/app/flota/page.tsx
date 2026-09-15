'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Truck, MapPin, CircleDashed, TriangleAlert } from 'lucide-react';
import { ListFilter } from '@/components/ListFilter';
import { RoleGate } from '@/components/RoleGate';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { FormAlert, PageHeader } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { api, HttpError } from '@/lib/api';
import {
  choferDeFila,
  emptyTableroFlota,
  etiquetaAdminFlota,
  filtraTablero,
  opcionesFiltroTablero,
  parseFiltroTablero,
  viajeDeFila,
  type FiltroTableroFlota,
} from '@/lib/flota-viaje';
import { useRole } from '@/lib/role';
import type { TableroFlotaRow } from '@/lib/types';

export default function FlotaPage() {
  return (
    <RoleGate allow={['LOGISTICA', 'ADMIN_DIRECTIVO']}>
      <Suspense fallback={<p className="muted">Cargando tablero…</p>}>
        <FlotaTablero />
      </Suspense>
    </RoleGate>
  );
}

function FlotaTablero() {
  const { role, userId } = useRole();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filtro = parseFiltroTablero(searchParams.get('filtro'));
  const [rows, setRows] = useState<TableroFlotaRow[]>([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    setRows(await api<TableroFlotaRow[]>('/flota/tablero', { role: role!, userId }));
  }

  useEffect(() => {
    if (!role) return;
    void cargar().catch((err) => {
      setError(
        err instanceof HttpError ? err.message : 'No se pudo cargar el tablero.',
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  function setFiltro(id: FiltroTableroFlota) {
    const params = new URLSearchParams(searchParams.toString());
    if (id === 'todas') params.delete('filtro');
    else params.set('filtro', id);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const visibles = useMemo(
    () => filtraTablero(rows, filtro, q),
    [rows, filtro, q],
  );

  const columns = useMemo<ColumnDef<TableroFlotaRow>[]>(
    () => [
      {
        accessorKey: 'numeroInterno',
        header: 'Unidad',
        cell: ({ row }) => {
          const admin = etiquetaAdminFlota(row.original);
          return (
            <div>
              <strong>{row.original.numeroInterno}</strong>
              <div className="muted">{row.original.placas}</div>
              {admin ? <div className="muted">{admin}</div> : null}
            </div>
          );
        },
      },
      {
        id: 'viaje',
        header: 'Viaje',
        cell: ({ row }) => {
          const viaje = viajeDeFila(row.original);
          const Icon =
            viaje.clase === 'en_ruta'
              ? Truck
              : viaje.clase === 'en_sitio'
                ? MapPin
                : CircleDashed;
          return (
            <div>
              <span className="inline-flex items-center gap-1.5">
                <Icon
                  className="size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                {viaje.titulo}
              </span>
              {viaje.detalle ? (
                <div className="muted">{viaje.detalle}</div>
              ) : null}
            </div>
          );
        },
      },
      {
        id: 'chofer',
        header: 'Chofer',
        cell: ({ row }) => {
          const chofer = choferDeFila(row.original);
          return (
            <div>
              <div className={chofer.asignado ? undefined : 'muted'}>
                {chofer.principal}
              </div>
              {chofer.secundario ? (
                <div className="muted">{chofer.secundario}</div>
              ) : null}
            </div>
          );
        },
      },
      {
        id: 'atencion',
        header: 'Atención',
        cell: ({ row }) =>
          row.original.salidaAbiertaId ? (
            <Badge variant="warning" className="normal-case tracking-normal gap-1">
              <TriangleAlert className="size-3.5" aria-hidden />
              Registrar entrada
            </Badge>
          ) : (
            <span className="muted">—</span>
          ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-3">
      <PageHeader
        title="Flota"
        lede="Quién se llevó qué unidad, a qué sitio y a qué hora."
      />
      <FormAlert>{error}</FormAlert>
      <ListFilter
        label="Filtro flota"
        value={filtro}
        options={opcionesFiltroTablero(rows)}
        onChange={setFiltro}
      />
      <Input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar unidad, placas, chofer o sitio…"
        aria-label="Buscar unidad, placas, chofer o sitio"
        className="max-w-md"
      />
      <DataTable
        columns={columns}
        data={visibles}
        empty={emptyTableroFlota(filtro, q)}
        onRowClick={(row) => router.push(`/flota/unidades/${row.unidadId}`)}
      />
    </div>
  );
}
