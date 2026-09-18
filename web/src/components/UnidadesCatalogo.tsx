'use client';

import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  LayoutList,
  RotateCcw,
  Search,
  TriangleAlert,
} from 'lucide-react';
import { ListFilter } from '@/components/ListFilter';
import { StatusBadge } from '@/components/StatusBadge';
import { UnidadTipoIcon, UnidadTipoMark } from '@/components/UnidadTipoMark';
import { UnidadesTipoMenu } from '@/components/UnidadesTipoMenu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { ListChrome } from '@/components/ui/field';
import { Input, NativeSelect } from '@/components/ui/input';
import {
  avisoDeUnidad,
  etiquetaSituacionAtencion,
  kpisFlota,
  ordenarUnidades,
  situacionAtencion,
  unidadesConAtencion,
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

type EstadoChip = 'TODOS' | 'ACTIVA' | 'INACTIVA' | 'ATENCION';

export function UnidadesCatalogo({
  unidades,
  flota,
  tipos,
  avisos,
  q,
  tipoFiltro,
  estadoFiltro,
  atencionFiltro,
  buscando,
  isAdmin,
  actions,
  onQ,
  onTipoFiltro,
  onEstadoFiltro,
  onAtencionFiltro,
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
  atencionFiltro: boolean;
  buscando: boolean;
  isAdmin: boolean;
  actions?: ReactNode;
  onQ: (value: string) => void;
  onTipoFiltro: (value: string) => void;
  onEstadoFiltro: (value: string) => void;
  onAtencionFiltro: (value: boolean) => void;
  onSearch: (event: FormEvent) => void;
  onOpenUnidad: (unidad: Unidad) => void;
  onEditarTipo: (tipo: TipoVehiculo) => void;
  onEliminarTipo: (tipo: TipoVehiculo) => void;
}) {
  const [sort, setSort] = useState<UnidadesSort>('interno-asc');
  const [vista, setVista] = useState<UnidadesVista>('tabla');
  const [page, setPage] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  const kpis = useMemo(() => kpisFlota(flota, avisos), [flota, avisos]);
  const tipoSeleccionado = tipos.find((t) => t.id === tipoFiltro) ?? null;
  const estadoChip: EstadoChip = atencionFiltro
    ? 'ATENCION'
    : estadoFiltro === 'ACTIVA' || estadoFiltro === 'INACTIVA'
      ? estadoFiltro
      : 'TODOS';

  const visibles = useMemo(
    () =>
      atencionFiltro ? unidadesConAtencion(unidades, avisos) : unidades,
    [unidades, avisos, atencionFiltro],
  );
  const ordenadas = useMemo(
    () => ordenarUnidades(visibles, sort),
    [visibles, sort],
  );
  const pages = Math.max(1, Math.ceil(ordenadas.length / UNIDADES_PAGE_SIZE));
  const pagina = Math.min(page, pages);
  const slice = useMemo(() => {
    const start = (pagina - 1) * UNIDADES_PAGE_SIZE;
    return ordenadas.slice(start, start + UNIDADES_PAGE_SIZE);
  }, [ordenadas, pagina]);

  useEffect(() => {
    setPage(1);
  }, [visibles, sort]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    function apply() {
      setIsMobile(mq.matches);
      if (mq.matches) setVista('tarjetas');
    }
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  function aplicarEstado(value: EstadoChip) {
    if (value === 'TODOS') {
      onEstadoFiltro('');
      onAtencionFiltro(false);
      return;
    }
    if (value === 'ATENCION') {
      onEstadoFiltro('');
      onAtencionFiltro(true);
      return;
    }
    onAtencionFiltro(false);
    onEstadoFiltro(value);
  }

  function limpiarFiltros() {
    onQ('');
    onTipoFiltro('');
    aplicarEstado('TODOS');
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
        header: 'Alerta',
        cell: ({ row }) => (
          <CeldaAtencion unidad={row.original} avisos={avisos} />
        ),
      },
    ],
    [avisos],
  );

  const from = ordenadas.length === 0 ? 0 : (pagina - 1) * UNIDADES_PAGE_SIZE + 1;
  const to = Math.min(pagina * UNIDADES_PAGE_SIZE, ordenadas.length);

  return (
    <div className="unidades-page">
      <form onSubmit={onSearch}>
        <ListChrome
          title="Unidades"
          count={ordenadas.length}
          filters={
            <>
              <div className="list-chrome__search">
                <Search
                  className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <Input
                  value={q}
                  onChange={(e) => onQ(e.target.value)}
                  placeholder="Interno, placas, marca…"
                  aria-label="Buscar unidad"
                  className="pl-9"
                />
              </div>
              <ListFilter
                label="Estado"
                value={estadoChip}
                options={[
                  { id: 'TODOS', label: `Todas (${kpis.total})` },
                  { id: 'ACTIVA', label: `Activas (${kpis.activas})` },
                  { id: 'INACTIVA', label: `Inactivas (${kpis.inactivas})` },
                  { id: 'ATENCION', label: `Alertas (${kpis.conAviso})` },
                ]}
                onChange={aplicarEstado}
              />
              {buscando ? (
                <Button
                  type="button"
                  variant="quiet"
                  size="compact"
                  onClick={limpiarFiltros}
                >
                  <RotateCcw className="size-3.5" aria-hidden />
                  Limpiar
                </Button>
              ) : null}
            </>
          }
          actions={actions}
        />
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
              const activo = tipoFiltro === tipo.id;
              return (
                <span key={tipo.id} className="unidades-tipo-chip">
                  <button
                    type="button"
                    aria-pressed={activo}
                    className={activo ? 'active' : ''}
                    onClick={() => onTipoFiltro(activo ? '' : tipo.id)}
                  >
                    <UnidadTipoIcon nombre={tipo.nombre} icono={tipo.icono} />
                    {tipo.nombre} ({n})
                  </button>
                  {isAdmin && activo && isMobile ? (
                    <UnidadesTipoMenu
                      tipoNombre={tipo.nombre}
                      onEditar={() => onEditarTipo(tipo)}
                      onEliminar={() => onEliminarTipo(tipo)}
                    />
                  ) : null}
                </span>
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
                        <div className="unidades-interno">
                          {unidad.numeroInterno}
                        </div>
                        <div className="unidades-modelo">
                          {etiquetaUnidad(unidad)}
                        </div>
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
                  ? 'unidades-row--aviso'
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
              rowAffordance
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
    </div>
  );
}
