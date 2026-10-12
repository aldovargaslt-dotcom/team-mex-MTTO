'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { CalendarCheck, ChevronLeft, ChevronRight, History, ClipboardCheck, List, Search, Wrench, type LucideIcon } from 'lucide-react';
import { OrderIdentity } from '@/components/OrderIdentity';
import { Badge } from '@/components/ui/badge';
import { ListFilter } from '@/components/ListFilter';
import { CheckOrderReadOnly } from '@/components/CheckOrderReadOnly';
import { CHECK_STATUS_LABEL, type CheckOrderStatus, type CheckOrderSummary, type CheckOrderDetail } from '@/lib/order-types';
import { OrdenCaptura } from '@/components/OrdenCaptura';
import { NuevaOrdenDialog } from '@/components/NuevaOrdenDialog';
import { UnidadMarca } from '@/components/UnidadTipoMark';
import { hydratePiezasFromInventario, type PiezaLinea } from '@/components/PiezasStep';
import { RoleGate } from '@/components/RoleGate';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api, HttpError } from '@/lib/api';
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

type Cola = 'abiertas' | 'borradores' | 'cerradas';
type TipoFiltro = 'todos' | TipoVisita | 'CHECK';

type OrdenRow = Omit<VisitaResumen, 'tipo' | 'estado'> & {
  tipo: TipoVisita | 'CHECK' | null;
  estado: VisitaResumen['estado'] | null;
  checkStatus?: CheckOrderStatus;
  unidadId: string;
  numeroInterno: string;
  placas: string;
  fotoDataUrl: string | null;
  tipoNombre: string;
  tipoIcono: string | null;
};

const COLAS: { id: Cola; label: string }[] = [
  { id: 'abiertas', label: 'Abiertas' },
  { id: 'borradores', label: 'Borradores' },
];

const TIPOS: { id: TipoFiltro; label: string; icon: LucideIcon }[] = [
  { id: 'todos', label: 'Todos', icon: List },
  { id: 'CORRECTIVO', label: 'Correctivo', icon: Wrench },
  { id: 'PREDICTIVO', label: 'Preventivo', icon: CalendarCheck },
  { id: 'CHECK', label: 'Revisión', icon: ClipboardCheck },
];

function parseCola(value: string | null, admin: boolean): Cola {
  if (admin) return 'cerradas';
  return value === 'cerradas' || value === 'borradores' ? value : 'abiertas';
}

function parseTipo(value: string | null): TipoFiltro {
  if (value === 'PREDICTIVO' || value === 'CORRECTIVO' || value === 'CHECK') return value;
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
  const [rows, setRows] = useState<OrdenRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkDetail, setCheckDetail] = useState<CheckOrderDetail | null>(null);
  const [detalle, setDetalle] = useState<VisitaDetalle | null>(null);
  const [detalleError, setDetalleError] = useState<string | null>(null);
  const [piezas, setPiezas] = useState<PiezaLinea[]>([]);
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

  useEffect(() => {
    if (!role) return;
    const opts = { role, userId };
    void (async () => {
      setError(null);
      try {
        const unidades = await api<Unidad[]>('/unidades', opts);
        const checksRequest = (async () => {
          const items: CheckOrderSummary[] = [];
          let cursor: string | null = null;
          const seen = new Set<string>();
          do {
            const page: { items: CheckOrderSummary[]; nextCursor: string | null } = await api(`/checks?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`, opts);
            items.push(...page.items);
            cursor = page.nextCursor;
            if (cursor && seen.has(cursor)) throw new Error('Cursor repetido');
            if (cursor) seen.add(cursor);
          } while (cursor);
          return items.map((check): OrdenRow => {
            const unit = unidades.find((item) => item.id === check.unidadId);
            return { id: check.id, tipo: 'CHECK', estado: null, checkStatus: check.status,
              unidadId: check.unidadId, numeroInterno: check.unit.numeroInterno, placas: check.unit.placas,
              fotoDataUrl: unit?.fotoDataUrl ?? null, tipoNombre: unit?.tipo?.nombre ?? '', tipoIcono: unit?.tipo?.icono ?? null,
              createdAt: check.createdAt, updatedAt: check.createdAt, cerradoAt: null,
              km: null, choferId: null, choferNombre: null, createdBy: null, trabajosCount: 0 };
          });
        })();
        const checksSettled = Promise.allSettled([checksRequest]);
        const settled = await Promise.allSettled(
          unidades.map((unidad) =>
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
        const checkResult = (await checksSettled)[0];
        const next: OrdenRow[] = settled.flatMap((item) =>
          item.status === 'fulfilled' ? item.value : [],
        );
        const failed = settled.filter((item) => item.status === 'rejected').length;
        if (failed === settled.length && unidades.length > 0 && checkResult.status === 'rejected') {
          const first = settled[0];
          setRows([]);
          setError(
            first?.status === 'rejected' && first.reason instanceof HttpError
              ? first.reason.message
              : 'No se pudieron cargar las órdenes.',
          );
          return;
        }
        if (checkResult.status === 'fulfilled') next.push(...checkResult.value);
        if (failed > 0 || checkResult.status === 'rejected') {
          setError([failed > 0 ? 'Algunas unidades no pudieron listar sus órdenes de mantenimiento.' : '', checkResult.status === 'rejected' ? 'No se pudieron cargar las revisiones. Se muestran las órdenes disponibles.' : ''].filter(Boolean).join(' '));
        }
        next.sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        );
        setRows(next);
      } catch (err) {
        setRows([]);
        setError(
          err instanceof HttpError ? err.message : 'No se pudieron cargar las órdenes.',
        );
      }
    })();
  }, [role, userId]);

  const queueRows = useMemo(() => {
    if (!rows) return [];
    const needle = q.trim().toLowerCase();
    return rows.filter((row) => {
      if (row.tipo === 'CHECK') {
        if (cola === 'borradores') return false;
        if (cola === 'abiertas' && !['PENDING', 'ASSIGNED', 'IN_PROGRESS'].includes(row.checkStatus ?? '')) return false;
        if (cola === 'cerradas' && row.checkStatus !== 'COMPLETED') return false;
      } else {
        if (cola !== 'cerradas' && row.estado !== 'BORRADOR') return false;
        if (cola === 'abiertas' && !row.openedAt) return false;
        if (cola === 'borradores' && row.openedAt) return false;
        if (cola === 'cerradas' && row.estado !== 'CERRADO') return false;
      }
      if (!needle) return true;
      const hay = `${row.numeroInterno} ${row.placas} ${row.choferNombre ?? ''}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [rows, cola, q]);
  const filtered = useMemo(() => queueRows.filter((row) => tipo === 'todos' || row.tipo === tipo), [queueRows, tipo]);
  const typeOptions = TIPOS.map((option) => ({ ...option,
    label: rows ? `${option.label} (${queueRows.filter((row) => option.id === 'todos' || row.tipo === option.id).length})` : option.label,
  }));

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

  useEffect(() => {
    if (!role || !ordenId) {
      setDetalle(null);
      setCheckDetail(null);
      setPiezas([]);
      setDetalleError(null);
      return;
    }
    const opts = { role, userId };
    let cancelled = false;
    setDetalleError(null);
    setCheckDetail(null);
    setDetalle(null);
    void (async () => {
      try {
        const selected = rows?.find((row) => row.id === ordenId);
        if (selected?.tipo === 'CHECK') {
          const check = await api<CheckOrderDetail>(`/checks/${ordenId}`, opts);
          if (!cancelled) { setCheckDetail(check); setPiezas([]); }
          return;
        }
        const next = await api<VisitaDetalle>(`/visitas/${ordenId}`, opts);
        if (cancelled) return;
        setDetalle(next);
        const lineas = await hydratePiezasFromInventario(next.piezas ?? [], opts);
        if (!cancelled) setPiezas(lineas);
      } catch (err) {
        if (cancelled) return;
        setDetalle(null);
        setPiezas([]);
        setDetalleError(
          err instanceof HttpError ? err.message : 'No se pudo abrir la orden.',
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [role, userId, ordenId, rows]);

  const borradorSeleccionado =
    !isAdmin && detalle?.estado === 'BORRADOR' && detalle.id === ordenId;
  const emptyTitle = cola === 'borradores' ? 'No hay órdenes en borrador.' : error ? 'Sin resultados disponibles para este filtro.' : tipo === 'CHECK' ? (cola === 'abiertas' ? 'No hay revisiones en curso.' : 'No hay revisiones concluidas.') : (cola === 'abiertas' ? 'No hay órdenes abiertas.' : 'No hay órdenes cerradas.');
  const emptyLede = tipo === 'CHECK' ? 'Los chequeos se consultan dentro de tu patio autorizado.' : q.trim()
    ? 'Pruebe otro texto o quite el filtro de tipo.'
    : cola === 'abiertas'
      ? 'Crea una orden aquí para comenzar la captura.'
      : isAdmin
        ? 'El administrador ve las visitas ya cerradas.'
        : 'Al cerrar una visita pasa a esta lista.';

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
        <div className="flex items-center justify-between gap-2">
          <h1>{cola === 'abiertas' ? 'Órdenes abiertas' : cola === 'borradores' ? 'Borradores' : 'Historial de cerradas'}</h1>
          {!isAdmin ? <Button type="button" variant="secondary" aria-pressed={cola === 'cerradas'}
            onClick={() => setParams({ cola: cola === 'cerradas' ? null : 'cerradas', orden: null })}>
            <History className="size-4" aria-hidden />{cola === 'cerradas' ? 'Volver a abiertas' : 'Historial'}
          </Button> : null}
        </div>
        <div className="ordenes-head__search">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
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
            onClick={() => setNuevaOrdenOpen(true)}
          >
            + Nueva orden
          </Button>
        )}
      </header>
      )}
      {!soloDetalle ? <ListFilter label="Tipo de orden" value={tipo} options={typeOptions}
        className="mb-3 grid grid-cols-2 sm:flex"
        onChange={(next) => setParams({ tipo: next === 'todos' ? null : next, orden: null })} /> : null}
      <FormAlert>{error}</FormAlert>
      {!isAdmin && detalle?.estado === 'BORRADOR' && !detalle.openedAt ? <Button type="button" variant="secondary" className="mb-3" onClick={async () => {
        try {
          const opened = await api<{ openedAt: string; openedBy: string }>(`/mantenimiento-ordenes/${detalle.id}/abrir`, { role: role!, userId, method: 'POST' });
          setDetalle({ ...detalle, ...opened }); setRows((current) => current?.map((row) => row.id === detalle.id ? { ...row, ...opened } : row) ?? null);
          setParams({ cola: null, orden: detalle.id });
        } catch (err) { setError(err instanceof HttpError ? err.message : 'No se pudo abrir la orden.'); }
      }}>Abrir orden</Button> : null}
      {rows == null ? (
        <p className="muted">Cargando órdenes…</p>
      ) : (
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
            </div>
            {filtered.length === 0 ? (
              <div className="empty-state">
                <h2>{emptyTitle}</h2>
                <p className="muted">{emptyLede}</p>
              </div>
            ) : (
              <div className="ordenes-list__scroll" role="listbox" aria-label="Órdenes">
                {filtered.map((row) => {
                  const selected = row.id === ordenId;
                  return (
                    <button
                      key={row.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={['ordenes-row ordenes-row--document', selected ? 'is-selected' : '']
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => setParams({ orden: row.id })}
                    >
                      <OrderIdentity id={row.id} check={row.tipo === 'CHECK'} />
                      <span className="mt-3 flex w-full items-center gap-3">
                        <UnidadMarca foto={row.fotoDataUrl} nombre={row.tipoNombre} icono={row.tipoIcono} size="lg" className="shrink-0" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-navy">{row.numeroInterno}</span>
                          <span className="mt-1 block text-xs text-muted-foreground">{row.placas}</span>
                          <span className="mt-2 flex flex-wrap items-center gap-2">
                            <Badge variant={row.tipo === 'CORRECTIVO' ? 'danger' : row.tipo === 'CHECK' ? 'secondary' : 'info'}>
                              {row.tipo === 'CHECK' ? 'Revisión' : etiquetaTipoVisita(row.tipo)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{row.tipo === 'CHECK' && row.checkStatus ? CHECK_STATUS_LABEL[row.checkStatus] : cola === 'borradores' ? 'Borrador' : cola === 'abiertas' ? 'Abierta' : 'Cerrada'}</span>
                          </span>
                        </span>
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="ordenes-detail">
            <FormAlert>{detalleError}</FormAlert>
            {filtered.length === 0 ? null : checkDetail && checkDetail.id === ordenId ? (
              <CheckOrderReadOnly detail={checkDetail} mobile={mobileMode === true} />
            ) : detalle && detalle.id === ordenId ? (
              <OrdenDetalle
                detalle={detalle}
                piezas={piezas}
                continuar={Boolean(borradorSeleccionado)}
                marca={rows?.find((row) => row.id === ordenId) ?? null}
                role={role!}
                userId={userId}
                onVisita={(next) => {
                  setDetalle(next);
                  void hydratePiezasFromInventario(next.piezas ?? [], {
                    role: role!,
                    userId,
                  }).then(setPiezas);
                }}
              />
            ) : detalleError ? null : (
              <p className="muted">Cargando la orden…</p>
            )}
          </div>
        </div>
      )}
      {!isAdmin && role ? (
        <NuevaOrdenDialog
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
  continuar,
  marca,
  role,
  userId,
  onVisita,
}: {
  detalle: VisitaDetalle;
  piezas: PiezaLinea[];
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
          {detalle.estado === 'BORRADOR' ? (detalle.openedAt ? 'Abierta' : 'Borrador') : 'Cerrada'}
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
