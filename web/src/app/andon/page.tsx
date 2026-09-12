'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import { RoleGate } from '@/components/RoleGate';
import { ListFilter } from '@/components/ListFilter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { FormAlert, PageHeader } from '@/components/ui/field';
import { api, HttpError } from '@/lib/api';
import { etiquetaEstadoAviso, formatFecha, formatKm } from '@/lib/format';
import { useRole } from '@/lib/role';
import type { AvisoAndon, EstadoAviso } from '@/lib/types';

const FILTROS: {
  id: 'pendientes' | 'enterados' | 'resueltos';
  label: string;
  estado: EstadoAviso | null;
}[] = [
  { id: 'pendientes', label: 'Pendientes', estado: null },
  { id: 'enterados', label: 'Enterados', estado: 'ENTERADO' },
  { id: 'resueltos', label: 'Resueltos', estado: 'RESUELTO' },
];

export default function AndonPage() {
  return (
    <RoleGate allow={['SUPERVISOR', 'ADMIN_DIRECTIVO']}>
      <AndonContent />
    </RoleGate>
  );
}

function AndonContent() {
  const router = useRouter();
  const { role, userId, isAdmin } = useRole();
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]['id']>('pendientes');
  const [avisos, setAvisos] = useState<AvisoAndon[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function cargar(nextFiltro = filtro) {
    const selected = FILTROS.find((f) => f.id === nextFiltro)!;
    const path = selected.estado
      ? `/andon/avisos?estado=${selected.estado}`
      : '/andon/avisos';
    const data = await api<AvisoAndon[]>(path, { role: role!, userId });
    setAvisos(data);
  }

  useEffect(() => {
    if (!role) return;
    void cargar().catch((err) => {
      setAvisos([]);
      setError(
        err instanceof HttpError
          ? err.message
          : 'No se pudieron cargar los avisos.',
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, userId, filtro]);

  async function enterado(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await api(`/andon/avisos/${id}/enterado`, {
        role: role!,
        userId,
        method: 'POST',
      });
      await cargar();
    } catch (err) {
      setError(
        err instanceof HttpError ? err.message : 'No se pudo marcar enterado.',
      );
    } finally {
      setBusyId(null);
    }
  }

  const columns = useMemo<ColumnDef<AvisoAndon, unknown>[]>(
    () => [
      {
        header: 'Unidad',
        accessorKey: 'numeroInterno',
        cell: ({ row }) => (
          <Link
            href={`/unidades/${row.original.unidadId}`}
            className="font-medium text-navy"
          >
            {row.original.numeroInterno ?? 'Unidad'}
          </Link>
        ),
      },
      {
        header: 'Tipo',
        accessorKey: 'tipoNombre',
        cell: ({ row }) => row.original.tipoNombre ?? '—',
      },
      {
        header: 'Estado',
        accessorKey: 'estado',
        cell: ({ row }) => (
          <Badge variant={row.original.estado === 'ABIERTO' ? 'warning' : 'muted'}>
            {etiquetaEstadoAviso(row.original.estado)}
          </Badge>
        ),
      },
      {
        header: 'Último cierre',
        id: 'ultimo',
        cell: ({ row }) => (
          <span className="text-[12px] text-muted-foreground">
            {formatKm(row.original.lastClosedKm)}
            <span className="block">{formatFecha(row.original.lastClosedAt)}</span>
          </span>
        ),
      },
      {
        header: 'Km / días',
        id: 'metricas',
        cell: ({ row }) => (
          <span className="text-[12px] text-muted-foreground">
            {row.original.kmAlAbrir.toLocaleString('es-MX')} km ·{' '}
            {row.original.diasAlAbrir} d
            <span className="block">
              umbral {row.original.umbralKm.toLocaleString('es-MX')} km /{' '}
              {row.original.umbralDias} d
            </span>
          </span>
        ),
      },
      {
        header: 'Abierto',
        accessorKey: 'abiertaAt',
        cell: ({ row }) => (
          <span className="text-[12px]">{formatFecha(row.original.abiertaAt)}</span>
        ),
      },
      {
        header: '',
        id: 'acciones',
        cell: ({ row }) =>
          !isAdmin && row.original.estado === 'ABIERTO' ? (
            <Button
              type="button"
              variant="outline"
              size="compact"
              className="h-11 min-h-11 min-w-11 md:h-11 md:min-h-11"
              disabled={busyId === row.original.id}
              onClick={(e) => {
                e.stopPropagation();
                void enterado(row.original.id);
              }}
            >
              Enterado
            </Button>
          ) : null,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busyId, isAdmin],
  );

  return (
    <>
      <PageHeader
        title="Andon"
        lede="Avisos de mantenimiento vencido. Enterado es in-app; solo una visita cerrada resuelve."
        actions={
          isAdmin ? (
            <Button asChild variant="secondary">
              <Link href="/unidades">Reglas por tipo</Link>
            </Button>
          ) : null
        }
      />
      <ListFilter
        label="Filtro Andon"
        value={filtro}
        options={FILTROS}
        onChange={setFiltro}
      />
      <FormAlert>{error}</FormAlert>
      {avisos == null ? (
        <p className="muted">Cargando avisos…</p>
      ) : (
        <DataTable
          columns={columns}
          data={avisos}
          empty="No hay avisos en este filtro."
          onRowClick={(row) => router.push(`/unidades/${row.unidadId}`)}
        />
      )}
    </>
  );
}
