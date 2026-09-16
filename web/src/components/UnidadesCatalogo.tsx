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
  etiquetaSituacionAtencion,
  kpisFlota,
  ordenarUnidades,
  pctDelTotal,
  situacionAtencion,
  UNIDADES_PAGE_SIZE,
  type UnidadesSort,
  type UnidadesVista,
} from '@/lib/unidades-catalogo';
import { cn } from '@/lib/utils';
import type { AvisoAndon, TipoVehiculo, Unidad } from '@/lib/types';

function etiquetaUnidad(unidad: Unidad) {
  if (!unidad.marcaModelo) return '—';
  return unidad.anio
    ? `${unidad.marcaModelo} · ${unidad.anio}`
    : unidad.marcaModelo;
}

function EstadoUnidadMark({ unidad }: { unidad: Unidad }) {
  return (
    <div className="unidades-estado">
      <StatusBadge estado={unidad.estado} />
      {unidad.motivoInactivacion === 'ENVIO_ESPECIAL' ? (
        <Badge variant="info" className="normal-case tracking-normal">
          Envío especial
        </Badge>
      ) : null}
    </div>
  );
}

function CeldaAtencion({
  unidad,
  avisos,
}: {
  unidad: Unidad;
  avisos: AvisoAndon[];
}) {
  const aviso = avisoDeUnidad(avisos, unidad.id);
  const situacion = situacionAtencion(aviso);
  const etiqueta = etiquetaSituacionAtencion(situacion);
  if (situacion === 'sin_aviso') {
    return (
      <p className="unidades-atencion unidades-atencion--quiet">{etiqueta}</p>
    );
  }
  return (
    <p
      className={cn(
        'unidades-atencion',
        situacion === 'enterado'
          ? 'unidades-atencion--warn'
          : 'unidades-atencion--alert',
      )}
    >
      <TriangleAlert className="size-3.5 shrink-0" aria-hidden />
      {etiqueta}
    </p>
  );
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

  const columns: ColumnDef<Unidad, unknown>[] = useMemo(
    () => [
      {
        id: 'unidad',
        header: 'Unidad',
        cell: ({ row }) => (
          <div className="unidades-unidad">
            <UnidadTipoMark
              nombre={row.original.tipo.nombre}
              icono={row.original.tipo.icono}
            />
            <div>
              <div className="unidades-interno">{row.original.numeroInterno}</div>
              <div className="unidades-modelo">{etiquetaUnidad(row.original)}</div>
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
            className="gap-1 font-normal normal-case tracking-normal"
          >
            <UnidadTipoIcon
              nombre={row.original.tipo.nombre}
              icono={row.original.tipo.icono}
            />
            {row.original.tipo.nombre}
          </Badge>
        ),
      },
      {
        accessorKey: 'placas',
        header: 'Placas',
        cell: ({ row }) => (
          <span className="unidades-placas">{row.original.placas}</span>
        ),
      },
      {
        accessorKey: 'estado',
        header: 'Estado',
        cell: ({ row }) => <EstadoUnidadMark unidad={row.original} />,
      },
      {
        id: 'atencion',
        header: 'Atención',
        cell: ({ row }) => (
          <CeldaAtencion unidad={row.original} avisos={avisos} />
        ),
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
    [avisos],
  );

  const from = ordenadas.length === 0 ? 0 : (pagina - 1) * UNIDADES_PAGE_SIZE + 1;
  const to = Math.min(pagina * UNIDADES_PAGE_SIZE, ordenadas.length);

  return (
    <div className="unidades-page">
      <div className="unidades-hero">
        <div className="min-w-0 flex-1">
          <h1>Unidades</h1>
          <p className="lede">
            Busque y abra la unidad que necesita atención.
          </p>
          {actions ? (
            <div className="mt-2 flex flex-wrap gap-2">{actions}</div>
          ) : null}
        </div>
        <aside className="unidades-hero-aside" aria-label="Flota de mantenimiento">
          <span className="unidades-hero-aside__icon" aria-hidden>
            <Truck className="size-4" strokeWidth={1.75} />
          </span>
          <span>
            <strong>Flota de mantenimiento</strong>
            <span>Abra una ficha para visitas y avisos.</span>
          </span>
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
                  <UnidadTipoIcon nombre={tipo.nombre} icono={tipo.icono} />
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
        <div className="unidades-tipo-bar">
          <div className="min-w-0">
            <p className="unidades-tipo-bar__title">
              Tipo {tipoSeleccionado.nombre}
            </p>
            <p className="muted">
              {tipoSeleccionado.descripcion
                ? tipoSeleccionado.descripcion
                : 'Editar o eliminar aplica a este tipo, no a una unidad.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="compact"
              onClick={() => onEditarTipo(tipoSeleccionado)}
            >
              Editar tipo
            </Button>
            <Button
              type="button"
              variant="dangerSoft"
              size="compact"
              onClick={() => onEliminarTipo(tipoSeleccionado)}
            >
              Eliminar tipo
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
                className={cn(
                  'unidades-card',
                  avisoDeUnidad(avisos, unidad.id) && 'unidades-card--aviso',
                )}
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
                  <UnidadTipoMark
                    nombre={unidad.tipo.nombre}
                    icono={unidad.tipo.icono}
                  />
                  <div>
                    <div className="unidades-interno">{unidad.numeroInterno}</div>
                    <div className="unidades-modelo">{etiquetaUnidad(unidad)}</div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className="gap-1 font-normal normal-case tracking-normal"
                  >
                    <UnidadTipoIcon
                      nombre={unidad.tipo.nombre}
                      icono={unidad.tipo.icono}
                    />
                    {unidad.tipo.nombre}
                  </Badge>
                  <EstadoUnidadMark unidad={unidad} />
                  <span className="unidades-placas">{unidad.placas}</span>
                </div>
                <CeldaAtencion unidad={unidad} avisos={avisos} />
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
          getRowClassName={(unidad) =>
            avisoDeUnidad(avisos, unidad.id)
              ? 'unidades-row--aviso hover:bg-[#fff3f1]'
              : undefined
          }
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

      {ordenadas.length > 0 ? (
      <div className="unidades-pager">
        <p className="muted">
          {`Mostrando ${from}–${to} de ${ordenadas.length} unidades`}
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
      ) : null}
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
