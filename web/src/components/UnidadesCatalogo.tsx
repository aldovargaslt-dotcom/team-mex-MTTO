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
  SlidersHorizontal,
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  avisoDeUnidad,
  contarFiltrosSecundarios,
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

function fichaHref(unidad: Unidad) {
  return `/unidades/${unidad.id}`;
}

function UnidadIdentidad({ unidad }: { unidad: Unidad }) {
  return (
    <Link
      href={fichaHref(unidad)}
      className="unidades-unidad unidades-unidad--link"
      onClick={(event) => event.stopPropagation()}
    >
      <UnidadTipoMark nombre={unidad.tipo.nombre} icono={unidad.tipo.icono} />
      <span className="unidades-unidad__copy">
        <span className="unidades-interno">{unidad.numeroInterno}</span>
        <span className="unidades-modelo">{etiquetaUnidad(unidad)}</span>
      </span>
    </Link>
  );
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

function UnidadesVacio({
  buscando,
  onLimpiar,
}: {
  buscando: boolean;
  onLimpiar: () => void;
}) {
  return (
    <div className="empty-state">
      <div>
        <h2>
          {buscando
            ? 'No encontramos unidades con estos filtros.'
            : 'No hay unidades'}
        </h2>
        <p className="muted">
          {buscando
            ? 'Ajuste la búsqueda o los filtros.'
            : 'No hay unidades en este filtro.'}
        </p>
      </div>
      {buscando ? (
        <Button type="button" variant="secondary" size="compact" onClick={onLimpiar}>
          Limpiar filtros
        </Button>
      ) : null}
    </div>
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
  const [filtrosOpen, setFiltrosOpen] = useState(false);
  const [draftEstado, setDraftEstado] = useState(estadoFiltro);
  const [draftTipo, setDraftTipo] = useState(tipoFiltro);

  const kpis = useMemo(() => kpisFlota(flota, avisos), [flota, avisos]);
  const tipoSeleccionado = tipos.find((t) => t.id === tipoFiltro) ?? null;
  const filtrosActivos = contarFiltrosSecundarios(estadoFiltro, tipoFiltro);

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

  useEffect(() => {
    if (!filtrosOpen) return;
    setDraftEstado(estadoFiltro);
    setDraftTipo(tipoFiltro);
  }, [filtrosOpen, estadoFiltro, tipoFiltro]);

  function limpiarFiltros() {
    onQ('');
    onTipoFiltro('');
    onEstadoFiltro('');
  }

  function aplicarFiltrosMovil() {
    onEstadoFiltro(draftEstado);
    onTipoFiltro(draftTipo);
    setFiltrosOpen(false);
  }

  function limpiarFiltrosMovil() {
    setDraftEstado('');
    setDraftTipo('');
    onEstadoFiltro('');
    onTipoFiltro('');
    setFiltrosOpen(false);
  }

  const columns: ColumnDef<Unidad, unknown>[] = useMemo(
    () => [
      {
        id: 'unidad',
        header: 'Unidad',
        cell: ({ row }) => <UnidadIdentidad unidad={row.original} />,
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
              <Link href={fichaHref(row.original)}>
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
        <div className="unidades-hero__copy">
          <h1>Unidades</h1>
          <p className="lede">
            Busque y abra la unidad que necesita atención.
          </p>
        </div>
        {actions ? (
          <div className="unidades-hero__actions">{actions}</div>
        ) : null}
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
          <Field
            label="Estado"
            htmlFor="unidadEstado"
            className="max-[800px]:hidden"
          >
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
              variant="secondary"
              className={cn(
                'hidden w-full max-[800px]:inline-flex',
                filtrosActivos > 0 && 'border-navy',
              )}
              aria-expanded={filtrosOpen}
              aria-controls="unidades-filtros-sheet"
              onClick={() => setFiltrosOpen(true)}
            >
              <SlidersHorizontal className="size-3.5" aria-hidden />
              {filtrosActivos > 0 ? `Filtros (${filtrosActivos})` : 'Filtros'}
            </Button>
            <Button
              type="button"
              variant="quiet"
              size="compact"
              className="max-[800px]:hidden"
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

      <Sheet open={filtrosOpen} onOpenChange={setFiltrosOpen}>
        <SheetContent
          side="bottom"
          id="unidades-filtros-sheet"
          className="sm:max-w-none"
        >
          <SheetHeader>
            <SheetTitle>Filtros</SheetTitle>
            <SheetDescription>
              Refine la lista por estado y tipo. La búsqueda permanece visible.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-3 px-4">
            <Field label="Estado" htmlFor="unidadEstadoSheet">
              <NativeSelect
                id="unidadEstadoSheet"
                value={draftEstado}
                onChange={(e) => setDraftEstado(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="ACTIVA">Activa</option>
                <option value="INACTIVA">Inactiva</option>
              </NativeSelect>
            </Field>
            {tipos.length > 0 ? (
              <Field label="Tipo" htmlFor="unidadTipoSheet">
                <NativeSelect
                  id="unidadTipoSheet"
                  value={draftTipo}
                  onChange={(e) => setDraftTipo(e.target.value)}
                >
                  <option value="">Todos</option>
                  {tipos.map((tipo) => (
                    <option key={tipo.id} value={tipo.id}>
                      {tipo.nombre}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            ) : null}
          </div>
          <SheetFooter className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="quiet"
              onClick={limpiarFiltrosMovil}
            >
              Limpiar filtros
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-navy bg-navy text-white hover:bg-[#1c2040] hover:text-white"
              onClick={aplicarFiltrosMovil}
            >
              Aplicar filtros
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

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
            <div className="unidades-vista max-md:hidden" role="group" aria-label="Vista">
              <button
                type="button"
                aria-pressed={vista === 'tabla'}
                aria-label="Vista lista"
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
          {slice.length === 0 ? (
            <UnidadesVacio buscando={buscando} onLimpiar={limpiarFiltros} />
          ) : (
            <div
              className={cn(
                'unidades-results',
                vista === 'tarjetas' && 'is-cards',
              )}
            >
              <div
                className={cn(
                  'unidades-results__table max-md:hidden',
                  vista === 'tarjetas' && 'hidden',
                )}
              >
                <DataTable
                  columns={columns}
                  data={slice}
                  getRowClassName={(unidad) =>
                    avisoDeUnidad(avisos, unidad.id)
                      ? 'unidades-row--aviso hover:bg-[#fff3f1]'
                      : undefined
                  }
                  onRowClick={onOpenUnidad}
                />
              </div>
              <div
                className={cn(
                  'unidades-results__cards hidden max-md:block',
                  vista === 'tarjetas' && 'block',
                )}
              >
                <div className="unidades-cards">
                  {slice.map((unidad) => (
                    <article
                      key={unidad.id}
                      className={cn(
                        'unidades-card',
                        avisoDeUnidad(avisos, unidad.id) &&
                          'unidades-card--aviso',
                      )}
                    >
                      <UnidadIdentidad unidad={unidad} />
                      <div className="unidades-card__meta">
                        <span>{unidad.tipo.nombre}</span>
                        <span className="unidades-card__dot" aria-hidden>
                          ·
                        </span>
                        <EstadoUnidadMark unidad={unidad} />
                        <span className="unidades-card__dot" aria-hidden>
                          ·
                        </span>
                        <span className="unidades-placas">{unidad.placas}</span>
                      </div>
                      <CeldaAtencion unidad={unidad} avisos={avisos} />
                      <Button
                        asChild
                        size="compact"
                        variant="outline"
                        className="mt-1 w-full border-navy bg-navy text-white hover:bg-[#1c2040] hover:text-white"
                      >
                        <Link href={fichaHref(unidad)}>
                          Ver ficha
                          <ArrowRight className="size-3.5" aria-hidden />
                        </Link>
                      </Button>
                    </article>
                  ))}
                </div>
              </div>
            </div>
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
