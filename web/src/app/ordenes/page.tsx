'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ListFilter, Search } from 'lucide-react';
import { ReadStatus } from '@/components/ReadStatus';
import { useReadResource } from '@/lib/use-read-resource';
import { OrdenCaptura } from '@/components/OrdenCaptura';
import { NuevaOrdenDialog } from '@/components/NuevaOrdenDialog';
import { UnidadMarca } from '@/components/UnidadTipoMark';
import { hydratePiezasFromInventario, lineasDesdeVisita, type PiezaLinea } from '@/components/PiezasStep';
import { RoleGate } from '@/components/RoleGate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api } from '@/lib/api';
import {
  etiquetaOrigenPieza,
  etiquetaTipoVisita,
  etiquetaUom,
  formatFecha,
  formatTiempoCerrado,
  numeroOrden,
} from '@/lib/format';
import { useRole } from '@/lib/role';
import type { TipoVisita, Unidad, VisitaDetalle, VisitaResumen } from '@/lib/types';

type Cola = 'abiertas' | 'cerradas';
type TipoFiltro = 'todos' | TipoVisita;

type OrdenRow = VisitaResumen & {
  unidadId: string;
  numeroInterno: string;
  placas: string;
  fotoDataUrl: string | null;
  tipoNombre: string;
  tipoIcono: string | null;
};

const COLAS: { id: Cola; label: string }[] = [
  { id: 'abiertas', label: 'Borradores' },
  { id: 'cerradas', label: 'Cerradas' },
];

const TIPOS: { id: TipoFiltro; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'PREDICTIVO', label: 'Preventivo' },
  { id: 'CORRECTIVO', label: 'Correctivo' },
];

function parseCola(value: string | null, admin: boolean): Cola {
  if (admin) return 'cerradas';
  return value === 'cerradas' ? 'cerradas' : 'abiertas';
}

function parseTipo(value: string | null): TipoFiltro {
  if (value === 'PREDICTIVO' || value === 'CORRECTIVO') return value;
  return 'todos';
}

export default function OrdenesPage() {
  return (
    <RoleGate allow={['SUPERVISOR', 'ADMIN_DIRECTIVO']}>
      <Suspense fallback={<p className="muted">Cargando órdenes…</p>}>
        <OrdenesContent />
      </Suspense>
    </RoleGate>
  );
}

function OrdenesContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { role, userId, isAdmin } = useRole();
  const cola = parseCola(searchParams.get('cola'), isAdmin);
  const tipo = parseTipo(searchParams.get('tipo'));
  const q = searchParams.get('q') ?? '';
  const ordenId = searchParams.get('orden');
  const searchRef = useRef<HTMLInputElement>(null);
  const nuevaOrdenTriggerRef = useRef<HTMLButtonElement>(null);

  const [filtroAbierto, setFiltroAbierto] = useState(false);
  const [mobileMode, setMobileMode] = useState<boolean | null>(null);
  const [nuevaOrdenOpen, setNuevaOrdenOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 800px)');
    const apply = () => setMobileMode(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  function setParams(patch: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value == null || value === '') params.delete(key);
      else params.set(key, value);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const opts = { role: role!, userId };
  const successful = useRef<{ key: string; units: Unidad[]; rows: Map<string, OrdenRow[]>; failed: string[] } | null>(null);
  const listKey = role ? JSON.stringify([role, userId, 'ordenes']) : null;
  const list = useReadResource(listKey, async () => {
        const cached = successful.current?.key === listKey ? successful.current : null;
        const unidades = cached && cached.failed.length ? cached.units : await api<Unidad[]>('/unidades', opts);
        const targets = cached && cached.failed.length ? unidades.filter((unit) => cached.failed.includes(unit.id)) : unidades;
        const loaded = cached && cached.failed.length ? new Map(cached.rows) : new Map<string, OrdenRow[]>();
        const settled = await Promise.allSettled(
          targets.map((unidad) =>
            api<VisitaResumen[]>(`/unidades/${unidad.id}/visitas`, opts).then(
              (visitas) =>
                visitas.map((visita) => ({
                  ...visita,
                  unidadId: unidad.id,
                  numeroInterno: unidad.numeroInterno,
                  placas: unidad.placas,
                  fotoDataUrl: unidad.fotoDataUrl ?? null,
                  tipoNombre: unidad.tipo?.nombre ?? '',
                  tipoIcono: unidad.tipo?.icono ?? null,
                })),
            ),
          ),
        );
    settled.forEach((result, index) => { if (result.status === 'fulfilled') loaded.set(targets[index].id, result.value); });
    const failedIds = settled.flatMap((item, index) => item.status === 'rejected' ? [targets[index].id] : []);
    successful.current = { key: listKey!, units: unidades, rows: loaded, failed: failedIds };
    const next = [...loaded.values()].flat();
    const failed = unidades.filter((unit) => failedIds.includes(unit.id)).map((unit) => unit.numeroInterno);
    if (failed.length === unidades.length && unidades.length > 0) throw new Error('No se pudieron cargar las órdenes.');
    next.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return { rows: next, failed };
  }, true);
  const rows = list.data?.rows ?? null;
  const detailRead = useReadResource(role && ordenId ? JSON.stringify([role, userId, ordenId]) : null,
    () => api<VisitaDetalle>(`/visitas/${ordenId}`, opts));
  const detalle = detailRead.data;
  const setDetalle = detailRead.setData;
  const piezaRead = useReadResource(role && detalle ? JSON.stringify([role, userId, detalle.id, detalle.piezas]) : null,
    () => hydratePiezasFromInventario(detalle?.piezas ?? [], opts));
  const piezas = piezaRead.data ?? lineasDesdeVisita(detalle?.piezas ?? []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const needle = q.trim().toLowerCase();
    return rows.filter((row) => {
      if (cola === 'abiertas' && row.estado !== 'BORRADOR') return false;
      if (cola === 'cerradas' && row.estado !== 'CERRADO') return false;
      if (tipo !== 'todos' && row.tipo !== tipo) return false;
      if (!needle) return true;
      const hay = `${row.numeroInterno} ${row.placas} ${row.choferNombre ?? ''}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [rows, cola, tipo, q]);

  useEffect(() => {
    if (rows == null || mobileMode === null) return;
    if (filtered.length === 0) {
      if (ordenId) setParams({ orden: null });
      return;
    }
    if (mobileMode && ordenId && !filtered.some((row) => row.id === ordenId)) {
      setParams({ orden: null });
      return;
    }
    if (
      mobileMode === false &&
      (!ordenId || !filtered.some((row) => row.id === ordenId))
    ) {
      setParams({ orden: filtered[0].id });
    }
    // setParams identity changes with the URL; the guard stops the loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, filtered, ordenId, mobileMode]);

  const borradorSeleccionado =
    !isAdmin && detalle?.estado === 'BORRADOR' && detalle.id === ordenId;
  const colaRows = (rows ?? []).filter((row) => cola === 'abiertas' ? row.estado === 'BORRADOR' : row.estado === 'CERRADO');
  const filteredEmpty = Boolean(q.trim() || tipo !== 'todos') && colaRows.length > 0;
  const otherCola = !isAdmin && (rows ?? []).some((row) => cola === 'abiertas' ? row.estado === 'CERRADO' : row.estado === 'BORRADOR');
  const emptyTitle = filteredEmpty ? 'Sin coincidencias con estos filtros.'
    : cola === 'abiertas' ? 'No hay órdenes en borrador.' : 'No hay órdenes cerradas.';
  const emptyLede = filteredEmpty ? 'Quita los filtros para recuperar las órdenes de esta cola.'
    : otherCola ? 'Hay órdenes disponibles en la otra cola.'
      : cola === 'abiertas' ? 'Crea una orden aquí para comenzar la captura.' : 'Las órdenes aparecen aquí después de cerrarlas.';

  const detalleAbierto = Boolean(ordenId);
  const soloDetalle = mobileMode === true && detalleAbierto;

  return (
    <>
      {soloDetalle ? (
        <Button
          type="button"
          variant="quiet"
          className="ordenes-back"
          onClick={() => setParams({ orden: null })}
        >
          <ChevronLeft className="size-5" aria-hidden />
          Órdenes
        </Button>
      ) : (
      <header className="ordenes-head">
        <h1>Órdenes</h1>
        <div className="ordenes-head__search">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
              ref={searchRef}
            value={q}
            onChange={(event) =>
              setParams({ q: event.target.value.trim() ? event.target.value : null })
            }
            placeholder="Buscar órdenes"
            aria-label="Buscar órdenes"
            className="pl-9"
          />
        </div>
        {isAdmin ? null : (
          <Button
            variant={borradorSeleccionado ? 'outline' : 'default'}
            className={borradorSeleccionado ? undefined : 'ordenes-primary'}
            type="button"
            ref={nuevaOrdenTriggerRef}
            onClick={() => setNuevaOrdenOpen(true)}
          >
            + Nueva orden
          </Button>
        )}
      </header>
      )}
      <ReadStatus loading={list.loading} error={list.error || (list.data?.failed.length ? new Error('Consulta parcial') : null)} loadingText={list.data ? "Actualizando órdenes; se muestran los datos de la consulta anterior…" : "Cargando órdenes…"} errorText={list.data?.failed.length ? `Consulta parcial. Falta consultar: ${list.data.failed.join(', ')}.` : "No se pudieron cargar las órdenes."} retry={list.retry} />
      {rows == null ? null : (
        <div className={soloDetalle ? 'ordenes-desk has-mobile-detail is-detail' : 'ordenes-desk'}>
          <div className="ordenes-list">
            <div className="ordenes-tabs">
              {isAdmin ? null : (
                <div className="ordenes-tabs__cola" role="tablist" aria-label="Cola">
                  {COLAS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      role="tab"
                      aria-selected={cola === option.id}
                      className={cola === option.id ? 'is-on' : ''}
                      onClick={() =>
                        setParams({
                          cola: option.id === 'abiertas' ? null : option.id,
                          orden: null,
                        })
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
              <button
                type="button"
                className={
                  filtroAbierto || tipo !== 'todos'
                    ? 'ordenes-tabs__filter is-on'
                    : 'ordenes-tabs__filter'
                }
                aria-label="Filtros"
                aria-expanded={filtroAbierto}
                onClick={() => setFiltroAbierto((open) => !open)}
              >
                <ListFilter className="size-5" aria-hidden />
              </button>
              {filtroAbierto ? (
                <div className="ordenes-filter-menu" role="group" aria-label="Tipo de mantenimiento">
                  <p>Tipo de mantenimiento</p>
                  {TIPOS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={tipo === option.id}
                      className={tipo === option.id ? 'is-on' : ''}
                      onClick={() => {
                        setParams({
                          tipo: option.id === 'todos' ? null : option.id,
                          orden: null,
                        });
                        setFiltroAbierto(false);
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            {filtered.length === 0 ? (
              <div className="empty-state">
                <h2>{list.data?.failed.length ? 'Consulta parcial sin coincidencias cargadas.' : emptyTitle}</h2>
                <p className="muted">{list.data?.failed.length ? 'La consulta es parcial; recupera las unidades que faltan.' : emptyLede}</p>
                {q.trim() || tipo !== 'todos' ? <Button type="button" variant="secondary" onClick={() => { setParams({ q: null, tipo: null, orden: null }); searchRef.current?.focus(); }}>Quitar filtros</Button> : null}
                {otherCola ? <Button type="button" variant="secondary" onClick={() => setParams({ cola: cola === 'abiertas' ? 'cerradas' : null, orden: null })}>Ver {cola === 'abiertas' ? 'cerradas' : 'borradores'}</Button> : null}
              </div>
            ) : (
              <div className="ordenes-list__scroll" role="listbox" aria-label="Órdenes">
                {filtered.map((row) => {
                  const selected = row.id === ordenId;
                  const tipoClass =
                    row.tipo === 'CORRECTIVO'
                      ? 'is-correctivo'
                      : row.tipo === 'PREDICTIVO'
                        ? 'is-predictivo'
                        : '';
                  return (
                    <button
                      key={row.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={['ordenes-row', selected ? 'is-selected' : '']
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => setParams({ orden: row.id })}
                    >
                      <MarcaUnidad
                        foto={row.fotoDataUrl}
                        tipoNombre={row.tipoNombre}
                        tipoIcono={row.tipoIcono}
                      />
                      <span className="ordenes-row__copy">
                        <span className="ordenes-row__title">{row.numeroInterno}</span>
                        <span className="ordenes-row__sub">{numeroOrden(row.id)}</span>
                      </span>
                      <span className={`ordenes-tipo ${tipoClass}`}>
                        {etiquetaTipoVisita(row.tipo)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="ordenes-detail">
            {ordenId && filtered.length > 0 ? <ReadStatus key={ordenId} loading={detailRead.loading} error={detailRead.error} loadingText="Cargando la orden…" errorText="No se pudo abrir la orden." retry={detailRead.retry} /> : null}
            {filtered.length === 0 ? null : detalle && detalle.id === ordenId ? (
              <OrdenDetalle
                detalle={detalle}
                piezas={piezas}
                piezaRead={piezaRead}
                continuar={Boolean(borradorSeleccionado)}
                marca={rows?.find((row) => row.id === ordenId) ?? null}
                role={role!}
                userId={userId}
                onVisita={(next) => {
                  setDetalle(next);

                }}
              />
            ) : null}
          </div>
        </div>
      )}
      {!isAdmin && role ? (
        <NuevaOrdenDialog
          returnFocusRef={nuevaOrdenTriggerRef}
          open={nuevaOrdenOpen}
          onOpenChange={setNuevaOrdenOpen}
          role={role}
          userId={userId}
          onContinue={(visita) => {
            setNuevaOrdenOpen(false);
            const current = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
            const query = new URLSearchParams({ returnTo: current });
            router.push(`/unidades/${visita.unidadId}/visitas/${visita.id}?${query.toString()}`);
          }}
        />
      ) : null}
    </>
  );
}

function MarcaUnidad({
  foto,
  tipoNombre,
  tipoIcono,
}: {
  foto: string | null;
  tipoNombre: string;
  tipoIcono: string | null;
}) {
  return (
    <UnidadMarca
      foto={foto}
      nombre={tipoNombre}
      icono={tipoIcono}
      className="ordenes-unidad-marca"
    />
  );
}

function OrdenDetalle({
  detalle,
  piezas,
  piezaRead,
  continuar,
  marca,
  role,
  userId,
  onVisita,
}: {
  detalle: VisitaDetalle;
  piezas: PiezaLinea[];
  piezaRead: { loading: boolean; error: unknown; retry: () => void };
  continuar: boolean;
  marca: OrdenRow | null;
  role: string;
  userId?: string;
  onVisita: (visita: VisitaDetalle) => void;
}) {
  const [capturando, setCapturando] = useState(false);
  const editarPrimario = continuar && !capturando;
  return (
    <>
      <div className="ordenes-detail__head">
        <div className="ordenes-detail__identity">
          <MarcaUnidad
            foto={marca?.fotoDataUrl ?? null}
            tipoNombre={marca?.tipoNombre ?? detalle.tipoVehiculoNombre ?? ''}
            tipoIcono={marca?.tipoIcono ?? null}
          />
          <div>
            <h2 className="ordenes-detail__title">{detalle.unidadNumeroInterno}</h2>
            <p className="ordenes-folio">{numeroOrden(detalle.id)}</p>
          </div>
        </div>
        <div className="ordenes-actions">
          <Button asChild variant="outline" size="compact">
            <a href="#orden-comentarios">Comentarios</a>
          </Button>
          <Button
            asChild
            variant={editarPrimario ? 'default' : 'outline'}
            size="compact"
            className={editarPrimario ? 'ordenes-primary' : undefined}
          >
            <Link href={`/unidades/${detalle.unidadId}/visitas/${detalle.id}`}>
              {continuar ? 'Continuar' : 'Ver detalle'}
            </Link>
          </Button>
        </div>
      </div>
      <OrdenCaptura
        key={detalle.id}
        onCaptura={setCapturando}
        role={role}
        userId={userId}
        editable={continuar}
        detalle={detalle}
        onVisita={onVisita}
      />
      <div className="ordenes-status" aria-label="Estado de la orden">
        <span className="is-on">
          {detalle.estado === 'BORRADOR' ? 'Borrador' : 'Cerrada'}
        </span>
      </div>
      <dl className="ordenes-facts">
        <div>
          <dt>Fecha de apertura</dt>
          <dd>{formatFecha(detalle.createdAt)}</dd>
        </div>
        <div>
          <dt>Fecha de cierre</dt>
          <dd>{detalle.cerradoAt ? formatFecha(detalle.cerradoAt) : 'Sin cerrar'}</dd>
        </div>
        <div>
          <dt>Tiempo de cerrado</dt>
          <dd>{formatTiempoCerrado(detalle.createdAt, detalle.cerradoAt)}</dd>
        </div>
      </dl>
      <section className="ordenes-section">
        <h2>Tipo de mantenimiento</h2>
        <p className={`ordenes-tipo ${detalle.tipo === 'CORRECTIVO' ? 'is-correctivo' : 'is-predictivo'}`}>
          <span className="ordenes-dot" aria-hidden />
          {etiquetaTipoVisita(detalle.tipo)}
        </p>
      </section>
      {detalle.trabajos.length > 0 ? (
        <section className="ordenes-section" aria-labelledby="orden-trabajos">
          <h2 id="orden-trabajos">Trabajos</h2>
          <ul className="plain-list">
            {detalle.trabajos.map((trabajo) => (
              <li key={trabajo.id}>
                {trabajo.categoria} · {trabajo.item}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section className="ordenes-section" aria-labelledby="orden-imagenes">
        <h2 id="orden-imagenes">Imágenes</h2>
        {detalle.fotos.length === 0 ? (
          <p className="muted">Sin imágenes.</p>
        ) : (
          <div className="ordenes-fotos">
            {detalle.fotos.map((foto) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={foto.id} src={foto.dataUrl} alt="Foto de la orden" />
            ))}
          </div>
        )}
      </section>
      <section className="ordenes-section" aria-labelledby="orden-comentarios">
        <h2 id="orden-comentarios">Comentarios</h2>
        {detalle.observaciones?.trim() ? (
          <p>{detalle.observaciones}</p>
        ) : (
          <p className="muted">Sin comentarios.</p>
        )}
      </section>
      <section className="ordenes-section" aria-labelledby="orden-piezas">
        <h2 id="orden-piezas">SKU</h2>
        <ReadStatus loading={piezaRead.loading && detalle.piezas.length > 0} error={piezaRead.error} loadingText="Cargando datos de las piezas…" errorText="No se pudieron cargar los nombres de las piezas. Se conservan cantidades y origen." retry={piezaRead.retry} retryLabel="Reintentar piezas" />
        {piezas.length === 0 ? (
          <p className="muted">Sin piezas en esta orden.</p>
        ) : (
          <div className="ordenes-piezas">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Origen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {piezas.map((pieza) => (
                  <TableRow key={pieza.itemId}>
                    <TableCell className="mono">{pieza.sku}</TableCell>
                    <TableCell>{pieza.nombre}</TableCell>
                    <TableCell>
                      {pieza.qty} {etiquetaUom(pieza.uom)}
                    </TableCell>
                    <TableCell>{etiquetaOrigenPieza(pieza.origen)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </>
  );
}
