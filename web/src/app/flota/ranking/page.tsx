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
import { FilterFacet } from '@/components/FilterFacet';
import { ListFilter } from '@/components/ListFilter';
import { UmbralAid } from '@/components/UmbralAid';
import { DataTable } from '@/components/ui/data-table';
import { Field, FormAlert, PageHeader } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
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
  parseYmdPatio,
  rankingSitiosPatio,
  rangoYmdPeriodoPatio,
  resumenCiclosPatio,
  umbralDesdeIds,
  unidadesAunFuera,
  UMBRALES_HORAS,
  UMBRALES_KM,
  type CicloCerradoPatio,
  type PeriodoPatio,
  type RankingSitioPatio,
} from '@/lib/ranking-patio';
import { useRole } from '@/lib/role';
import type { FlotaUnidadDetalle, TableroFlotaRow } from '@/lib/types';

export default function FlotaCiclosPage() {
  return (
    <Suspense fallback={<p className="muted">Cargando ciclos…</p>}>
      <CiclosPatio />
    </Suspense>
  );
}

function CiclosPatio() {
  const { role, userId } = useRole();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const vista = parseVistaPatio(searchParams.get('vista'));
  const from = parseYmdPatio(searchParams.get('from'));
  const to = parseYmdPatio(searchParams.get('to'));
  const periodoRaw = parsePeriodoPatio(searchParams.get('periodo'));
  const periodo: PeriodoPatio = from || to ? 'CUSTOM' : periodoRaw;
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

  function setPeriodo(id: PeriodoPatio) {
    if (id === 'CUSTOM') {
      const seed =
        from || to
          ? { from, to }
          : rangoYmdPeriodoPatio(periodo === 'CUSTOM' ? '30D' : periodo);
      setParams({
        periodo: 'CUSTOM',
        from: seed.from,
        to: seed.to,
      });
      return;
    }
    setParams({
      periodo: id === '30D' ? null : id,
      from: null,
      to: null,
    });
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
            : 'No se pudieron cargar los ciclos de patio.',
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [role, userId]);

  const rango = useMemo(() => ({ from, to }), [from, to]);
  const ciclosPeriodo = useMemo(
    () => ciclosEnPeriodo(ciclos, periodo, new Date(), rango),
    [ciclos, periodo, rango],
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
    () => resumenCiclosPatio(ciclosPeriodo, umbral),
    [ciclosPeriodo, umbral],
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
        id: 'atencion',
        header: 'Atención',
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
        id: 'atencion',
        header: 'Atención',
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
        header: 'Unidad que más va',
      },
    ],
    [],
  );

  return (
    <div className="space-y-3">
      <PageHeader
        title="Ciclos de patio"
        lede="Qué viajes ya cerrados rebasaron tiempo fuera o km — eso es lo que conviene revisar al regreso. El tablero sigue siendo el ahora."
      />
      <div className="filter-facets">
        <FilterFacet label="Atención">
          <ListFilter
            label="Atención de ciclos"
            value={lectura}
            options={opcionesLecturaPatio(ciclosPeriodo, umbral)}
            onChange={(id) =>
              setParams({ lectura: id === 'todas' ? null : id })
            }
          />
        </FilterFacet>
        <FilterFacet label="Listar">
          <ListFilter
            label="Listar ciclos de patio"
            value={vista}
            options={opcionesVistaPatio(ciclosPeriodo)}
            onChange={(id) => setParams({ vista: id === 'tiempo' ? null : id })}
          />
        </FilterFacet>
        <FilterFacet label="Periodo">
          <ListFilter
            label="Periodo de ciclos"
            value={periodo}
            options={opcionesPeriodoPatio(ciclos, new Date(), rango)}
            onChange={setPeriodo}
          />
          {periodo === 'CUSTOM' ? (
            <div className="filter-range">
              <Field label="Desde" htmlFor="ciclosFrom">
                <Input
                  id="ciclosFrom"
                  type="date"
                  value={from ?? ''}
                  onChange={(e) =>
                    setParams({
                      periodo: 'CUSTOM',
                      from: e.target.value || null,
                    })
                  }
                />
              </Field>
              <Field label="Hasta" htmlFor="ciclosTo">
                <Input
                  id="ciclosTo"
                  type="date"
                  value={to ?? ''}
                  onChange={(e) =>
                    setParams({
                      periodo: 'CUSTOM',
                      to: e.target.value || null,
                    })
                  }
                />
              </Field>
            </div>
          ) : null}
        </FilterFacet>
        <FilterFacet label="Tiempo fuera">
          <ListFilter
            label="Tiempo fuera para rebasar"
            value={horasId}
            options={UMBRALES_HORAS.map((item) => ({
              id: item.id,
              label: item.label,
            }))}
            onChange={(id) => setParams({ umbralH: id === '8' ? null : id })}
          />
        </FilterFacet>
        <FilterFacet label="Kilómetros">
          <ListFilter
            label="Kilómetros del ciclo para rebasar"
            value={kmId}
            options={UMBRALES_KM.map((item) => ({
              id: item.id,
              label: item.label,
            }))}
            onChange={(id) => setParams({ umbralKm: id === '50' ? null : id })}
          />
        </FilterFacet>
      </div>
      <p className="text-xs text-muted-foreground">{fraseUmbralPatio(umbral)}</p>
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
        <p className="muted">Cargando ciclos…</p>
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
