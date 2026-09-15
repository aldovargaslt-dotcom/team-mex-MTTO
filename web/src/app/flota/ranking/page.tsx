'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import { ListFilter } from '@/components/ListFilter';
import { DataTable } from '@/components/ui/data-table';
import { FormAlert, PageHeader } from '@/components/ui/field';
import { api, HttpError } from '@/lib/api';
import { formatDuracion, formatFecha, formatKm } from '@/lib/format';
import {
  ciclosCerradosDeDetalle,
  ciclosEnPeriodo,
  opcionesPeriodoPatio,
  opcionesVistaPatio,
  ordenaCiclosPorTiempo,
  parsePeriodoPatio,
  parseVistaPatio,
  rankingSitiosPatio,
  resumenCiclosPatio,
  unidadesAunFuera,
  type CicloCerradoPatio,
  type RankingSitioPatio,
} from '@/lib/ranking-patio';
import { useRole } from '@/lib/role';
import type { FlotaUnidadDetalle, TableroFlotaRow } from '@/lib/types';

export default function FlotaRankingPage() {
  return (
    <Suspense fallback={<p className="muted">Cargando ranking…</p>}>
      <RankingPatio />
    </Suspense>
  );
}

function RankingPatio() {
  const { role, userId } = useRole();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const vista = parseVistaPatio(searchParams.get('vista'));
  const periodo = parsePeriodoPatio(searchParams.get('periodo'));
  const [tablero, setTablero] = useState<TableroFlotaRow[]>([]);
  const [ciclos, setCiclos] = useState<CicloCerradoPatio[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function setParams(patch: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value == null || value === '') params.delete(key);
      else params.set(key, value);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  useEffect(() => {
    if (!role) return;
    setLoading(true);
    void (async () => {
      try {
        const rows = await api<TableroFlotaRow[]>('/flota/tablero', {
          role,
          userId,
        });
        const detalles = await Promise.all(
          rows.map((row) =>
            api<FlotaUnidadDetalle>(`/flota/unidades/${row.unidadId}`, {
              role,
              userId,
            }),
          ),
        );
        setTablero(rows);
        setCiclos(detalles.flatMap(ciclosCerradosDeDetalle));
        setError(null);
      } catch (err) {
        setTablero([]);
        setCiclos([]);
        setError(
          err instanceof HttpError
            ? err.message
            : 'No se pudo cargar el ranking de patio.',
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [role, userId]);

  const ciclosPeriodo = useMemo(
    () => ciclosEnPeriodo(ciclos, periodo),
    [ciclos, periodo],
  );
  const ciclosOrdenados = useMemo(
    () => ordenaCiclosPorTiempo(ciclosPeriodo),
    [ciclosPeriodo],
  );
  const sitios = useMemo(
    () => rankingSitiosPatio(ciclosPeriodo),
    [ciclosPeriodo],
  );
  const resumen = useMemo(
    () => resumenCiclosPatio(ciclosPeriodo),
    [ciclosPeriodo],
  );
  const fuera = unidadesAunFuera(tablero);

  const columnsTiempo = useMemo<ColumnDef<CicloCerradoPatio, unknown>[]>(
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
        accessorKey: 'choferPatio',
        header: 'Chofer patio',
      },
      {
        accessorKey: 'sitioDestino',
        header: 'Destino',
        cell: ({ row }) => (
          <div>
            <div>{row.original.sitioDestino}</div>
            <div className="muted">
              Regreso {row.original.sitioEntrada}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'tiempoFueraMs',
        header: 'Tiempo fuera',
        cell: ({ row }) => (
          <div>
            <div>{formatDuracion(row.original.tiempoFueraMs)}</div>
            <div className="muted">{formatFecha(row.original.salidaAt)}</div>
          </div>
        ),
      },
      {
        accessorKey: 'kmCiclo',
        header: 'km ciclo',
        cell: ({ row }) => formatKm(row.original.kmCiclo),
      },
      {
        accessorKey: 'entradaAt',
        header: 'Entrada',
        cell: ({ row }) => formatFecha(row.original.entradaAt),
      },
    ],
    [],
  );

  const columnsSitios = useMemo<ColumnDef<RankingSitioPatio, unknown>[]>(
    () => [
      { accessorKey: 'sitio', header: 'Sitio' },
      {
        accessorKey: 'ciclos',
        header: 'Ciclos',
        cell: ({ row }) => row.original.ciclos,
      },
      {
        accessorKey: 'tiempoFueraMs',
        header: 'Tiempo fuera',
        cell: ({ row }) => formatDuracion(row.original.tiempoFueraMs),
      },
      {
        accessorKey: 'kmCiclo',
        header: 'km',
        cell: ({ row }) => formatKm(row.original.kmCiclo),
      },
      {
        accessorKey: 'unidadTopInterno',
        header: 'Más frecuente',
        cell: ({ row }) => row.original.unidadTopInterno,
      },
    ],
    [],
  );

  return (
    <div className="space-y-3">
      <PageHeader
        title="Ranking de patio"
        lede="Qué suele pasar: tiempo fuera, km del ciclo y sitios que se repiten. El tablero sigue siendo el ahora."
      />
      <ListFilter
        label="Vista ranking patio"
        value={vista}
        options={opcionesVistaPatio(ciclosPeriodo)}
        onChange={(id) => setParams({ vista: id === 'tiempo' ? null : id })}
      />
      <ListFilter
        label="Periodo patio"
        value={periodo}
        options={opcionesPeriodoPatio(ciclos)}
        onChange={(id) => setParams({ periodo: id === '30D' ? null : id })}
      />
      <p className="text-xs text-muted-foreground">{resumen.linea}</p>
      {fuera > 0 ? (
        <p className="text-xs text-muted-foreground">
          {fuera === 1
            ? '1 unidad aún no regresa.'
            : `${fuera} unidades aún no regresan.`}{' '}
          <Link href="/flota?filtro=fuera" className="text-navy">
            Ver tablero
          </Link>
        </p>
      ) : null}
      <FormAlert>{error}</FormAlert>
      {loading && ciclos.length === 0 && !error ? (
        <p className="muted">Cargando ranking…</p>
      ) : vista === 'sitios' ? (
        <DataTable
          columns={columnsSitios}
          data={sitios}
          empty="No hay sitios con ciclos cerrados en este periodo."
          onRowClick={(row) => router.push(`/flota/unidades/${row.unidadTopId}`)}
        />
      ) : (
        <DataTable
          columns={columnsTiempo}
          data={ciclosOrdenados}
          empty="No hay ciclos cerrados en este periodo."
          onRowClick={(row) => router.push(`/flota/unidades/${row.unidadId}`)}
        />
      )}
    </div>
  );
}
