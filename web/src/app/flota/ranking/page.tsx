'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Clock,
  Gauge,
  MapPin,
  User,
} from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { ListFilter } from '@/components/ListFilter';
import { UmbralAid } from '@/components/UmbralAid';
import { DataTable } from '@/components/ui/data-table';
import { FormAlert, PageHeader } from '@/components/ui/field';
import { api, HttpError } from '@/lib/api';
import { formatDuracion, formatFecha, formatKm } from '@/lib/format';
import {
  ciclosCerradosDeDetalle,
  ciclosEnPeriodo,
  cicloRebasaUmbral,
  emptyLecturaPatio,
  fraseUmbralPatio,
  filtraLecturaPatio,
  filtraSitiosLectura,
  motivoRebaso,
  opcionesLecturaPatio,
  opcionesPeriodoPatio,
  opcionesVistaPatio,
  ordenaCiclosPorUmbral,
  parseLecturaPatio,
  parsePeriodoPatio,
  parseUmbralHoras,
  parseUmbralKm,
  parseVistaPatio,
  rankingSitiosPatio,
  resumenCiclosPatio,
  umbralDesdeIds,
  unidadesAunFuera,
  UMBRALES_HORAS,
  UMBRALES_KM,
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
  const horasId = parseUmbralHoras(searchParams.get('umbralH'));
  const kmId = parseUmbralKm(searchParams.get('umbralKm'));
  const lectura = parseLecturaPatio(searchParams.get('lectura'));
  const umbral = useMemo(
    () => umbralDesdeIds(horasId, kmId),
    [horasId, kmId],
  );
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
  const ciclosLectura = useMemo(
    () =>
      ordenaCiclosPorUmbral(
        filtraLecturaPatio(ciclosPeriodo, lectura, umbral),
        umbral,
      ),
    [ciclosPeriodo, lectura, umbral],
  );
  const sitios = useMemo(
    () =>
      filtraSitiosLectura(rankingSitiosPatio(ciclosPeriodo, umbral), lectura),
    [ciclosPeriodo, umbral, lectura],
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
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5">
            <User className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            {row.original.choferPatio}
          </span>
        ),
      },
      {
        accessorKey: 'sitioDestino',
        header: 'Destino',
        cell: ({ row }) => (
          <div>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              {row.original.sitioDestino}
            </span>
            <div className="muted">Regreso {row.original.sitioEntrada}</div>
          </div>
        ),
      },
      {
        accessorKey: 'tiempoFueraMs',
        header: 'Tiempo fuera',
        cell: ({ row }) => (
          <div>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              {formatDuracion(row.original.tiempoFueraMs)}
            </span>
            <div className="muted">{formatFecha(row.original.salidaAt)}</div>
          </div>
        ),
      },
      {
        accessorKey: 'kmCiclo',
        header: 'km ciclo',
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5">
            <Gauge className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            {formatKm(row.original.kmCiclo)}
          </span>
        ),
      },
      {
        id: 'umbral',
        header: 'Umbral',
        cell: ({ row }) => (
          <UmbralAid
            rebaso={cicloRebasaUmbral(row.original, umbral)}
            motivo={motivoRebaso(row.original, umbral)}
          />
        ),
      },
    ],
    [umbral],
  );

  const columnsSitios = useMemo<ColumnDef<RankingSitioPatio, unknown>[]>(
    () => [
      {
        accessorKey: 'sitio',
        header: 'Sitio',
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            {row.original.sitio}
          </span>
        ),
      },
      {
        accessorKey: 'ciclos',
        header: 'Ciclos',
        cell: ({ row }) => row.original.ciclos,
      },
      {
        id: 'umbral',
        header: 'Umbral',
        cell: ({ row }) => (
          <UmbralAid
            rebaso={row.original.rebasoCount > 0}
            motivo={
              row.original.rebasoCount > 0
                ? `${row.original.rebasoCount} de ${row.original.ciclos} rebasó`
                : null
            }
          />
        ),
      },
      {
        accessorKey: 'tiempoFueraMs',
        header: 'Tiempo fuera',
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            {formatDuracion(row.original.tiempoFueraMs)}
          </span>
        ),
      },
      {
        accessorKey: 'kmCiclo',
        header: 'km',
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1.5">
            <Gauge className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            {formatKm(row.original.kmCiclo)}
          </span>
        ),
      },
      {
        accessorKey: 'unidadTopInterno',
        header: 'Más frecuente',
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
      <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
        Umbral tiempo
      </p>
      <ListFilter
        label="Umbral tiempo"
        value={horasId}
        options={UMBRALES_HORAS.map((item) => ({
          id: item.id,
          label: item.label,
        }))}
        onChange={(id) => setParams({ umbralH: id === '8' ? null : id })}
      />
      <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
        Umbral km
      </p>
      <ListFilter
        label="Umbral km"
        value={kmId}
        options={UMBRALES_KM.map((item) => ({
          id: item.id,
          label: item.label,
        }))}
        onChange={(id) => setParams({ umbralKm: id === '50' ? null : id })}
      />
      <ListFilter
        label="Lectura umbral"
        value={lectura}
        options={opcionesLecturaPatio(ciclosPeriodo, umbral)}
        onChange={(id) =>
          setParams({ lectura: id === 'todas' ? null : id })
        }
      />
      <p className="text-xs text-muted-foreground">
        {fraseUmbralPatio(umbral)} {resumen.linea}
      </p>
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
          empty={
            lectura === 'todas'
              ? 'No hay sitios con ciclos cerrados en este periodo.'
              : emptyLecturaPatio(lectura)
          }
          onRowClick={(row) => router.push(`/flota/unidades/${row.unidadTopId}`)}
        />
      ) : (
        <DataTable
          columns={columnsTiempo}
          data={ciclosLectura}
          empty={emptyLecturaPatio(lectura)}
          onRowClick={(row) => router.push(`/flota/unidades/${row.unidadId}`)}
        />
      )}
    </div>
  );
}
