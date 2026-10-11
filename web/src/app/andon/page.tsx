'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import { RoleGate } from '@/components/RoleGate';
import { ListFilter } from '@/components/ListFilter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { FormAlert, PageHeader } from '@/components/ui/field';
import { ReadStatus } from '@/components/ReadStatus';
import { useReadResource } from '@/lib/use-read-resource';
import { api, HttpError } from '@/lib/api';
import {
  fraseDemora,
  lineasOvershoot,
  parseVistaAndon,
  rankingReincidentes,
  VISTAS_ANDON,
  type RankingAndonUnidad,
  type VistaAndon,
} from '@/lib/andon-demora';
import {
  etiquetaEstadoAviso,
  formatFecha,
  formatKm,
  lineasCausaAvisoAndon,
} from '@/lib/format';
import { useRole } from '@/lib/role';
import type { AvisoAndon, EstadoAviso } from '@/lib/types';

const PERIODOS = [
  { id: '7D', label: '7 d' },
  { id: '30D', label: '30 d' },
  { id: '90D', label: '90 d' },
] as const;

type Periodo = (typeof PERIODOS)[number]['id'];

function parsePeriodo(raw: string | null): Periodo {
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

function datesForPeriodo(id: Periodo, now = new Date()) {
  const to = ymdUtc(now);
  if (id === '7D') return { from: ymdUtc(addUtcDays(now, -6)), to };
  if (id === '90D') return { from: ymdUtc(addUtcDays(now, -89)), to };
  return { from: ymdUtc(addUtcDays(now, -29)), to };
}

function inPeriodo(iso: string | null | undefined, from: string, to: string) {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return (
    t >= new Date(`${from}T00:00:00.000Z`).getTime() &&
    t <= new Date(`${to}T23:59:59.999Z`).getTime()
  );
}

function estadoDeVista(vista: VistaAndon): EstadoAviso | null {
  if (vista === 'enterados') return 'ENTERADO';
  if (vista === 'resueltos') return 'RESUELTO';
  return null;
}

export default function AndonPage() {
  return (
    <RoleGate allow={['SUPERVISOR', 'ADMIN_DIRECTIVO']}>
      <Suspense fallback={<p className="muted">Cargando alertas…</p>}>
        <AndonContent />
      </Suspense>
    </RoleGate>
  );
}

function AndonContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { role, userId, isAdmin } = useRole();
  const vista = parseVistaAndon(searchParams.get('vista'));
  const periodo = parsePeriodo(searchParams.get('periodo'));
  const rango = useMemo(() => datesForPeriodo(periodo), [periodo]);
  const estado = estadoDeVista(vista);
  const read = useReadResource(role ? JSON.stringify([role, userId, vista]) : null,
    () => api<AvisoAndon[]>(estado ? `/andon/avisos?estado=${estado}` : '/andon/avisos', { role: role!, userId }));
  const resolvedRead = useReadResource(role && vista === 'reincidentes' ? JSON.stringify([role, userId, 'resueltos']) : null,
    () => api<AvisoAndon[]>('/andon/avisos?estado=RESUELTO', { role: role!, userId }));
  const avisos = useMemo(() => vista === 'reincidentes'
    ? read.data === null && resolvedRead.data === null ? null : [...(read.data ?? []), ...(resolvedRead.data ?? [])]
    : read.data, [read.data, resolvedRead.data, vista]);
  const parcial = vista === 'reincidentes' && (read.data === null || resolvedRead.data === null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function setParams(patch: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value == null || value === '') params.delete(key);
      else params.set(key, value);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  async function enterado(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await api(`/andon/avisos/${id}/enterado`, {
        role: role!,
        userId,
        method: 'POST',
      });
      read.retry();
    } catch (err) {
      setError(
        err instanceof HttpError ? err.message : 'No se pudo marcar enterado.',
      );
    } finally {
      setBusyId(null);
    }
  }

  const consulta = vista === 'resueltos' || vista === 'reincidentes';
  const avisosPeriodo = useMemo(() => {
    if (!avisos || !consulta) return avisos ?? [];
    return avisos.filter((a) =>
      inPeriodo(a.resueltoAt ?? a.abiertaAt, rango.from, rango.to),
    );
  }, [avisos, consulta, rango.from, rango.to]);

  const ranking = useMemo(
    () => (vista === 'reincidentes' ? rankingReincidentes(avisosPeriodo) : []),
    [vista, avisosPeriodo],
  );

  const columnsCola = useMemo<ColumnDef<AvisoAndon, unknown>[]>(
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
        header: 'Último servicio',
        id: 'ultimo',
        cell: ({ row }) => (
          <span className="text-[12px] text-muted-foreground">
            <span className="block">{formatFecha(row.original.lastClosedAt)}</span>
            <span className="block">
              Odómetro {formatKm(row.original.lastClosedKm)}
            </span>
          </span>
        ),
      },
      {
        header: 'Causa',
        id: 'causa',
        cell: ({ row }) => (
          <span className="text-[12px] text-muted-foreground">
            {lineasCausaAvisoAndon(row.original).map((linea) => (
              <span key={linea} className="block">
                {linea}
              </span>
            ))}
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

  const columnsResueltos = useMemo<ColumnDef<AvisoAndon, unknown>[]>(
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
        header: 'Overshoot',
        id: 'overshoot',
        cell: ({ row }) => (
          <span className="text-[12px] text-muted-foreground">
            {lineasOvershoot(row.original).map((linea) => (
              <span key={linea} className="block">
                {linea}
              </span>
            ))}
          </span>
        ),
      },
      {
        header: 'Demora',
        id: 'demora',
        cell: ({ row }) => (
          <span className="text-[12px]">
            <span className="block text-muted-foreground">
              Enterado {fraseDemora(row.original.abiertaAt, row.original.enteradoAt)}
            </span>
            <span className="block">
              {fraseDemora(
                row.original.enteradoAt ?? row.original.abiertaAt,
                row.original.resueltoAt,
                'Resuelto el mismo día',
              )}
            </span>
          </span>
        ),
      },
      {
        header: 'Resuelto',
        accessorKey: 'resueltoAt',
        cell: ({ row }) => (
          <span className="text-[12px]">
            {formatFecha(row.original.resueltoAt)}
          </span>
        ),
      },
    ],
    [],
  );

  const columnsRanking = useMemo<ColumnDef<RankingAndonUnidad, unknown>[]>(
    () => [
      {
        header: 'Unidad',
        accessorKey: 'numeroInterno',
        cell: ({ row }) => (
          <span className="font-medium text-navy">{row.original.numeroInterno}</span>
        ),
      },
      {
        header: 'Avisos',
        accessorKey: 'avisos',
        cell: ({ row }) => (
          <span className="mono text-[12px]">{row.original.avisos}</span>
        ),
      },
      {
        header: '',
        id: 'badge',
        cell: ({ row }) =>
          row.original.reincidente ? (
            <Badge variant="warning" className="normal-case tracking-normal">
              Reincidente
            </Badge>
          ) : null,
      },
    ],
    [],
  );

  const emptyTitle =
    vista === 'pendientes'
      ? 'No hay alertas pendientes.'
      : vista === 'enterados'
        ? 'No hay alertas enteradas.'
        : vista === 'resueltos'
          ? 'No hay alertas resueltas.'
          : 'No hay alertas en este periodo.';

  const emptyLede =
    vista === 'pendientes'
      ? 'Aparecen cuando una unidad rebase el intervalo de km o de días desde su última visita cerrada.'
      : vista === 'reincidentes'
        ? 'Se agrupan por unidad. Reincidente = dos o más alertas en el periodo.'
        : 'Cambie el filtro para ver otras alertas.';

  const tablaVacia =
    vista === 'reincidentes' ? ranking.length === 0 : avisosPeriodo.length === 0;

  return (
    <>
      <PageHeader
        title="Mantenimiento vencido"
        lede="Alertas de mantenimiento vencido. Enterado es in-app; solo una visita cerrada resuelve."
        actions={
          isAdmin ? (
            <Button asChild variant="secondary">
              <Link href="/configuracion/alertas?code=MTTO_VENCIDO">Configurar alertas</Link>
            </Button>
          ) : null
        }
      />
      <ListFilter
        label="Filtro de alertas"
        value={vista}
        options={VISTAS_ANDON}
        onChange={(next) =>
          setParams({
            vista: next === 'pendientes' ? null : next,
            periodo: next === 'pendientes' || next === 'enterados' ? null : periodo,
          })
        }
      />
      {consulta ? (
        <ListFilter
          label="Periodo"
          value={periodo}
          options={PERIODOS}
          onChange={(next) =>
            setParams({ periodo: next === '30D' ? null : next })
          }
        />
      ) : null}
      <FormAlert>{error}</FormAlert>
      <ReadStatus loading={read.loading} error={read.error} loadingText="Cargando avisos…" errorText="No se pudieron cargar los avisos." retry={read.retry} />
      {vista === 'reincidentes' ? <ReadStatus loading={resolvedRead.loading} error={resolvedRead.error} loadingText="Cargando avisos resueltos…" errorText="No se pudieron cargar los avisos resueltos." retry={resolvedRead.retry} /> : null}
      {parcial && avisos !== null ? <p role="status" className="muted">Consulta parcial: se muestran los avisos disponibles; el ranking no está disponible.</p> : null}
      {avisos == null ? null : parcial ? (avisos.length ? <DataTable columns={columnsCola} data={avisos} /> : null) : tablaVacia ? (
        <div className="empty-state">
          <h2>{emptyTitle}</h2>
          <p className="muted">{emptyLede}</p>
        </div>
      ) : vista === 'reincidentes' ? (
        <DataTable
          columns={columnsRanking}
          data={ranking}
          onRowClick={(row) => router.push(`/unidades/${row.unidadId}`)}
        />
      ) : (
        <DataTable
          columns={vista === 'resueltos' ? columnsResueltos : columnsCola}
          data={vista === 'resueltos' ? avisosPeriodo : avisos}
          onRowClick={(row) => router.push(`/unidades/${row.unidadId}`)}
        />
      )}
    </>
  );
}
