'use client';

import Link from 'next/link';
import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CirclePause,
  Info,
  LayoutGrid,
  LayoutList,
  RotateCcw,
  Search,
  TriangleAlert,
  Truck,
  X,
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { UnidadTipoIcon, UnidadTipoMark } from '@/components/UnidadTipoMark';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Field } from '@/components/ui/field';
import { Input, NativeSelect } from '@/components/ui/input';
import {
  avisoDeUnidad,
  kpisFlota,
  ordenarUnidades,
  pctDelTotal,
  UNIDADES_PAGE_SIZE,
  type UnidadesSort,
  type UnidadesVista,
} from '@/lib/unidades-catalogo';
import { resumenAvisoMantenimiento } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { AvisoAndon, TipoVehiculo, UmbralAndon, Unidad } from '@/lib/types';

const DEFAULT_T_KM = 10000;
const DEFAULT_T_DIAS = 90;

function etiquetaUnidad(unidad: Unidad) {
  if (!unidad.marcaModelo) return '—';
  return unidad.anio
    ? `${unidad.marcaModelo} · ${unidad.anio}`
    : unidad.marcaModelo;
}

const SORT_OPTIONS: { id: UnidadesSort; label: string }[] = [
  { id: 'interno-asc', label: 'Interno (A-Z)' },
  { id: 'interno-desc', label: 'Interno (Z-A)' },
  { id: 'placas-asc', label: 'Placas (A-Z)' },
];

export function UnidadesCatalogo({
  unidades,
  flota,
  tipos,
  umbrales,
  avisos,
  q,
  tipoFiltro,
  estadoFiltro,
  buscando,
  isAdmin,
  actions,
  onQ,
  onTipoFiltro,
  onEstadoFiltro,
  onSearch,
  onOpenUnidad,
  onEditarTipo,
  onEliminarTipo,
}: {
  unidades: Unidad[];
  flota: Unidad[];
  tipos: TipoVehiculo[];
  umbrales: Record<string, UmbralAndon>;
  avisos: AvisoAndon[];
  q: string;
  tipoFiltro: string;
  estadoFiltro: string;
  buscando: boolean;
  isAdmin: boolean;
  actions?: ReactNode;
  onQ: (value: string) => void;
  onTipoFiltro: (value: string) => void;
  onEstadoFiltro: (value: string) => void;
  onSearch: (event: FormEvent) => void;
  onOpenUnidad: (unidad: Unidad) => void;
  onEditarTipo: (tipo: TipoVehiculo) => void;
  onEliminarTipo: (tipo: TipoVehiculo) => void;
}) {
  const [sort, setSort] = useState<UnidadesSort>('interno-asc');
  const [vista, setVista] = useState<UnidadesVista>('tabla');
  const [page, setPage] = useState(1);
  const [consejo, setConsejo] = useState(true);

  const kpis = useMemo(() => kpisFlota(flota, avisos), [flota, avisos]);
  const tipoSeleccionado = tipos.find((t) => t.id === tipoFiltro) ?? null;

  const ordenadas = useMemo(
    () => ordenarUnidades(unidades, sort),
    [unidades, sort],
  );
  const pages = Math.max(1, Math.ceil(ordenadas.length / UNIDADES_PAGE_SIZE));
  const pagina = Math.min(page, pages);
  const slice = useMemo(() => {
    const start = (pagina - 1) * UNIDADES_PAGE_SIZE;
    return ordenadas.slice(start, start + UNIDADES_PAGE_SIZE);
  }, [ordenadas, pagina]);

  useEffect(() => {
    setPage(1);
  }, [unidades, sort]);

  function limpiarFiltros() {
    onQ('');
    onTipoFiltro('');
    onEstadoFiltro('');
  }

  function celdaMantenimiento(unidad: Unidad) {
    const aviso = avisoDeUnidad(avisos, unidad.id);
    const umbral = umbrales[unidad.tipo.id];
    if (aviso) {
      return (
        <p className="unidades-aviso">
          <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
          Requiere inspección
        </p>
      );
    }
    return (
      <p className="muted">
        {resumenAvisoMantenimiento(
          umbral?.tKm ?? DEFAULT_T_KM,
          umbral?.tDias ?? DEFAULT_T_DIAS,
        )}
      </p>
    );
  }

  const columns: ColumnDef<Unidad, unknown>[] = useMemo(
    () => [
      {
        id: 'unidad',
        header: 'Unidad',
        cell: ({ row }) => (
          <div className="unidades-unidad">
            <UnidadTipoMark nombre={row.original.tipo.nombre} />
            <div>
              <div className="mono">{row.original.numeroInterno}</div>
              <div className="muted">{etiquetaUnidad(row.original)}</div>
            </div>
          </div>
        ),
      },
      {
        id: 'tipo',
        header: 'Tipo',
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className="gap-1 normal-case tracking-normal"
          >
            <UnidadTipoIcon nombre={row.original.tipo.nombre} />
            {row.original.tipo.nombre}
          </Badge>
        ),
      },
      { accessorKey: 'placas', header: 'Placas' },
      {
        accessorKey: 'estado',
        header: 'Estado',
        cell: ({ row }) => (
          <StatusBadge
            estado={row.original.estado}
            className="normal-case tracking-normal"
          />
        ),
      },
      {
        id: 'mantenimiento',
        header: 'Mantenimiento',
        cell: ({ row }) => celdaMantenimiento(row.original),
      },
      {
        id: 'acciones',
        header: () => <span className="block text-right">Acciones</span>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              asChild
              size="compact"
              variant="outline"
              className="border-navy bg-navy text-white hover:bg-[#1c2040] hover:text-white"
              onClick={(event) => event.stopPropagation()}
            >
              <Link href={`/unidades/${row.original.id}`}>
                Ver ficha
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </Button>
          </div>
        ),
      },
    ],
    // celdaMantenimiento cierra sobre avisos/umbrales
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [avisos, umbrales],
  );

  const from = ordenadas.length === 0 ? 0 : (pagina - 1) * UNIDADES_PAGE_SIZE + 1;
  const to = Math.min(pagina * UNIDADES_PAGE_SIZE, ordenadas.length);

  return (
    <div className="unidades-page">
      <div className="unidades-hero">
        <div className="min-w-0 flex-1">
          <h1>Unidades</h1>
          <p className="lede">
            Seleccione una unidad para ver su ficha.
          </p>
          {actions ? (
            <div className="mt-2 flex flex-wrap gap-2">{actions}</div>
          ) : null}
        </div>
        <aside className="unidades-hero-aside" aria-label="Resumen de flota">
          <span className="unidades-hero-aside__icon" aria-hidden>
            <Truck className="size-5" strokeWidth={1.75} />
          </span>
          <span>
            <strong>Flota en operación</strong>
            <span>
              {kpis.activas} activas · {kpis.conAviso} con aviso
            </span>
          </span>
          <Truck className="unidades-hero-aside__mark" aria-hidden />
        </aside>
      </div>

      <div className="unidades-kpis">
        <button
          type="button"
          className={cn(
            'unidades-kpi',
            !estadoFiltro && !tipoFiltro && !q.trim() && 'is-active',
          )}
          onClick={limpiarFiltros}
        >
          <span className="unidades-kpi__icon unidades-kpi__icon--total">
            <Truck className="size-5" aria-hidden />
          </span>
          <span className="unidades-kpi__copy">
            <span className="unidades-kpi__label">Total de unidades</span>
            <span className="unidades-kpi__value">{kpis.total}</span>
          </span>
        </button>
        <button
          type="button"
          className={cn(
            'unidades-kpi',
            estadoFiltro === 'ACTIVA' && 'is-active',
          )}
          onClick={() =>
            onEstadoFiltro(estadoFiltro === 'ACTIVA' ? '' : 'ACTIVA')
          }
        >
          <span className="unidades-kpi__icon unidades-kpi__icon--ok">
            <CircleCheck className="size-5" aria-hidden />
          </span>
          <span className="unidades-kpi__copy">
            <span className="unidades-kpi__label">Activas</span>
            <span className="unidades-kpi__value">{kpis.activas}</span>
            <span className="unidades-kpi__meta">
              {pctDelTotal(kpis.activas, kpis.total)}% del total
            </span>
          </span>
        </button>
        <button
          type="button"
          className={cn(
            'unidades-kpi',
            estadoFiltro === 'INACTIVA' && 'is-active',
          )}
          onClick={() =>
            onEstadoFiltro(estadoFiltro === 'INACTIVA' ? '' : 'INACTIVA')
          }
        >
          <span className="unidades-kpi__icon unidades-kpi__icon--off">
            <CirclePause className="size-5" aria-hidden />
          </span>
          <span className="unidades-kpi__copy">
            <span className="unidades-kpi__label">Inactivas</span>
            <span className="unidades-kpi__value">{kpis.inactivas}</span>
            <span className="unidades-kpi__meta">
              {pctDelTotal(kpis.inactivas, kpis.total)}% del total
            </span>
          </span>
        </button>
        <Link href="/andon" className="unidades-kpi">
          <span className="unidades-kpi__icon unidades-kpi__icon--alert">
            <TriangleAlert className="size-5" aria-hidden />
          </span>
          <span className="unidades-kpi__copy">
            <span className="unidades-kpi__label">Avisos Andon</span>
            <span className="unidades-kpi__value">{kpis.conAviso}</span>
            <span className="unidades-kpi__meta">
              {pctDelTotal(kpis.conAviso, kpis.total)}% del total
            </span>
          </span>
        </Link>
      </div>

      <form onSubmit={onSearch}>
        <Card className="unidades-filters">
          <Field label="Buscar unidad" htmlFor="unidadQ">
            <div className="unidades-search">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id="unidadQ"
                value={q}
                onChange={(e) => onQ(e.target.value)}
                placeholder="Interno, placas, marca o modelo…"
                className="pl-9"
              />
            </div>
          </Field>
          <Field label="Tipo de unidad" htmlFor="unidadTipo">
            <NativeSelect
              id="unidadTipo"
              value={tipoFiltro}
              onChange={(e) => onTipoFiltro(e.target.value)}
            >
              <option value="">Todos</option>
              {tipos.map((tipo) => (
                <option key={tipo.id} value={tipo.id}>
                  {tipo.nombre}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Estado" htmlFor="unidadEstado">
            <NativeSelect
              id="unidadEstado"
              value={estadoFiltro}
              onChange={(e) => onEstadoFiltro(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="ACTIVA">Activa</option>
              <option value="INACTIVA">Inactiva</option>
            </NativeSelect>
          </Field>
          <div className="unidades-filters__actions">
            <Button
              type="button"
              variant="quiet"
              size="compact"
              disabled={!buscando}
              onClick={limpiarFiltros}
            >
              <RotateCcw className="size-3.5" aria-hidden />
              Limpiar filtros
            </Button>
            <Button
              type="submit"
              variant="outline"
              className="border-navy bg-navy text-white hover:bg-[#1c2040] hover:text-white"
            >
              Buscar
            </Button>
          </div>
        </Card>
      </form>

      {tipos.length > 0 ? (
        <div className="unidades-toolbar">
          <div className="list-filter" role="group" aria-label="Tipo">
            <button
              type="button"
              aria-pressed={!tipoFiltro}
              className={!tipoFiltro ? 'active' : ''}
              onClick={() => onTipoFiltro('')}
            >
              Todas ({flota.length})
            </button>
            {tipos.map((tipo) => {
              const n = flota.filter((u) => u.tipo.id === tipo.id).length;
              return (
                <button
                  key={tipo.id}
                  type="button"
                  aria-pressed={tipoFiltro === tipo.id}
                  className={tipoFiltro === tipo.id ? 'active' : ''}
                  onClick={() =>
                    onTipoFiltro(tipoFiltro === tipo.id ? '' : tipo.id)
                  }
                >
                  <UnidadTipoIcon nombre={tipo.nombre} />
                  {tipo.nombre} ({n})
                </button>
              );
            })}
          </div>
          <div className="unidades-toolbar__tools">
            <label className="unidades-sort">
              <span>Ordenar por</span>
              <NativeSelect
                value={sort}
                onChange={(e) => setSort(e.target.value as UnidadesSort)}
                aria-label="Ordenar por"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </NativeSelect>
            </label>
            <div className="unidades-vista" role="group" aria-label="Vista">
              <button
                type="button"
                aria-pressed={vista === 'tabla'}
                aria-label="Vista tabla"
                className={vista === 'tabla' ? 'active' : ''}
                onClick={() => setVista('tabla')}
              >
                <LayoutList className="size-4" />
              </button>
              <button
                type="button"
                aria-pressed={vista === 'tarjetas'}
                aria-label="Vista tarjetas"
                className={vista === 'tarjetas' ? 'active' : ''}
                onClick={() => setVista('tarjetas')}
              >
                <LayoutGrid className="size-4" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isAdmin && tipoSeleccionado ? (
        <div className="mb-3 flex min-h-11 flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {tipoSeleccionado.descripcion
              ? `${tipoSeleccionado.descripcion} · `
              : ''}
            {resumenAvisoMantenimiento(
              umbrales[tipoSeleccionado.id]?.tKm ?? DEFAULT_T_KM,
              umbrales[tipoSeleccionado.id]?.tDias ?? DEFAULT_T_DIAS,
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="compact">
              <Link href={`/unidades/nueva?tipoId=${tipoSeleccionado.id}`}>
                Nueva unidad
              </Link>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="compact"
              onClick={() => onEditarTipo(tipoSeleccionado)}
            >
              Editar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="compact"
              onClick={() => onEliminarTipo(tipoSeleccionado)}
            >
              Eliminar
            </Button>
          </div>
        </div>
      ) : null}

      {tipos.length > 0 ? (
        <>
      {vista === 'tarjetas' ? (
        slice.length === 0 ? (
          <div className="empty-state">
            <h2>
              {buscando
                ? 'No hay unidades que coincidan'
                : 'No hay unidades'}
            </h2>
            <p className="muted">
              {buscando
                ? 'Ajuste la búsqueda o los filtros.'
                : 'No hay unidades en este filtro.'}
            </p>
          </div>
        ) : (
          <div className="unidades-cards">
            {slice.map((unidad) => (
              <article
                key={unidad.id}
                className="unidades-card"
                onClick={() => onOpenUnidad(unidad)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onOpenUnidad(unidad);
                  }
                }}
                role="link"
                tabIndex={0}
              >
                <div className="unidades-unidad">
                  <UnidadTipoMark nombre={unidad.tipo.nombre} />
                  <div>
                    <div className="mono">{unidad.numeroInterno}</div>
                    <div className="muted">{etiquetaUnidad(unidad)}</div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className="gap-1 normal-case tracking-normal"
                  >
                    <UnidadTipoIcon nombre={unidad.tipo.nombre} />
                    {unidad.tipo.nombre}
                  </Badge>
                  <StatusBadge
                    estado={unidad.estado}
                    className="normal-case tracking-normal"
                  />
                  <span className="muted">{unidad.placas}</span>
                </div>
                {celdaMantenimiento(unidad)}
                <Button
                  asChild
                  size="compact"
                  variant="outline"
                  className="mt-1 w-full border-navy bg-navy text-white hover:bg-[#1c2040] hover:text-white"
                  onClick={(event) => event.stopPropagation()}
                >
                  <Link href={`/unidades/${unidad.id}`}>
                    Ver ficha
                    <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                </Button>
              </article>
            ))}
          </div>
        )
      ) : (
        <DataTable
          columns={columns}
          data={slice}
          empty={
            buscando ? (
              <>
                No hay unidades que coincidan.{' '}
                <span className="muted">Ajuste la búsqueda o los filtros.</span>
              </>
            ) : (
              'No hay unidades.'
            )
          }
          onRowClick={onOpenUnidad}
        />
      )}

      <div className="unidades-pager">
        <p className="muted">
          {ordenadas.length === 0
            ? 'Ninguna unidad en esta vista'
            : `Mostrando ${from}–${to} de ${ordenadas.length} unidades`}
        </p>
        {pages > 1 ? (
          <div className="unidades-pager__pages">
            <button
              type="button"
              aria-label="Página anterior"
              disabled={pagina <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="size-4" />
            </button>
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                aria-current={n === pagina ? 'page' : undefined}
                className={n === pagina ? 'active' : ''}
                onClick={() => setPage(n)}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              aria-label="Página siguiente"
              disabled={pagina >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        ) : null}
      </div>
        </>
      ) : null}

      {consejo ? (
        <div className="unidades-consejo" role="note">
          <Info className="size-4 shrink-0" aria-hidden />
          <p>
            <strong>Consejo:</strong> puede buscar por número interno, placas,
            marca o modelo para encontrar una unidad más rápido.
          </p>
          <button
            type="button"
            aria-label="Cerrar consejo"
            onClick={() => setConsejo(false)}
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
