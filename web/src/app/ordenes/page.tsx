'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarCheck, ChevronLeft, ChevronRight, History, ClipboardCheck, List, Search, Wrench, type LucideIcon } from 'lucide-react';
import { ReadStatus } from '@/components/ReadStatus';
import { useReadResource } from '@/lib/use-read-resource';
import { OrderSafetyControls } from '@/components/OrderSafetyControls';
import { OrderIdentity } from '@/components/OrderIdentity';
import { OperationalToolbar } from '@/components/OperationalToolbar';
import { OrderDocumentHeader } from '@/components/OrderDocumentHeader';
import { Badge } from '@/components/ui/badge';
import { ListFilter } from '@/components/ListFilter';
import { CheckOrderReadOnly } from '@/components/CheckOrderReadOnly';
import { CHECK_STATUS_LABEL, type CheckOrderStatus, type CheckOrderSummary, type CheckOrderDetail } from '@/lib/order-types';
import { OrdenCaptura } from '@/components/OrdenCaptura';
import { NuevaOrdenDialog } from '@/components/NuevaOrdenDialog';
import { UnidadMarca } from '@/components/UnidadTipoMark';
import { hydratePiezasFromInventario, lineasDesdeVisita, type PiezaLinea } from '@/components/PiezasStep';
import { RoleGate } from '@/components/RoleGate';
import { Button } from '@/components/ui/button';
import { Field, FormAlert, PageHeader } from '@/components/ui/field';
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
  const searchRef = useRef<HTMLInputElement>(null);
  const nuevaOrdenTriggerRef = useRef<HTMLButtonElement>(null);
  const [error, setError] = useState<string | null>(null);
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
  const successful = useRef<{ key: string; units: Unidad[]; rows: Map<string, OrdenRow[]>; checks: OrdenRow[]; failed: string[] } | null>(null);
  const listKey = role ? JSON.stringify([role, userId, 'ordenes']) : null;
  const list = useReadResource(listKey, async () => {
    const cached = successful.current?.key === listKey ? successful.current : null;
    const retryPartial = Boolean(cached?.failed.length);
    const units = retryPartial ? cached!.units : await api<Unidad[]>('/unidades', opts);
    const targets = retryPartial ? units.filter((unit) => cached!.failed.includes(unit.id)) : units;
    const loaded = retryPartial ? new Map(cached!.rows) : new Map<string, OrdenRow[]>();
    const shouldReadChecks = !retryPartial || cached!.failed.includes('CHECK');
    const checksRequest = async (): Promise<OrdenRow[]> => {
      const items: CheckOrderSummary[] = [];
      const seen = new Set<string>();
      let cursor: string | null = null;
      do {
        const page: { items: CheckOrderSummary[]; nextCursor: string | null } = await api(`/checks?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`, opts);
        items.push(...page.items); cursor = page.nextCursor;
        if (cursor && seen.has(cursor)) throw new Error('Cursor repetido');
        if (cursor) seen.add(cursor);
      } while (cursor);
      return items.map((check) => {
        const unit = units.find((item) => item.id === check.unidadId);
        return { id: check.id, tipo: 'CHECK', estado: null, checkStatus: check.status,
          unidadId: check.unidadId, numeroInterno: check.unit.numeroInterno, placas: check.unit.placas,
          fotoDataUrl: unit?.fotoDataUrl ?? null, tipoNombre: unit?.tipo?.nombre ?? '', tipoIcono: unit?.tipo?.icono ?? null,
          createdAt: check.createdAt, updatedAt: check.createdAt, cerradoAt: null,
          km: null, choferId: null, choferNombre: null, createdBy: null, trabajosCount: 0 };
      });
    };
    const [maintenance, checkResult] = await Promise.all([
      Promise.allSettled(targets.map(async (unit) => {
        const visits = await api<VisitaResumen[]>(`/unidades/${unit.id}/visitas`, opts);
        return visits.map((visit) => ({ ...visit, unidadId: unit.id, numeroInterno: unit.numeroInterno, placas: unit.placas,
          fotoDataUrl: unit.fotoDataUrl ?? null, tipoNombre: unit.tipo?.nombre ?? '', tipoIcono: unit.tipo?.icono ?? null }));
      })),
      Promise.allSettled([shouldReadChecks ? checksRequest() : Promise.resolve(cached!.checks)]),
    ]);
    maintenance.forEach((result, index) => { if (result.status === 'fulfilled') loaded.set(targets[index].id, result.value); });
    const failed = maintenance.flatMap((result, index) => result.status === 'rejected' ? [targets[index].id] : []);
    const checks = checkResult[0].status === 'fulfilled' ? checkResult[0].value : cached?.checks ?? [];
    if (checkResult[0].status === 'rejected') failed.push('CHECK');
    successful.current = { key: listKey!, units, rows: loaded, checks, failed };
    if (failed.length === units.length + 1) throw new Error('No se pudieron cargar las órdenes.');
    const rows = [...loaded.values()].flat().concat(checks);
    rows.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    return { rows, failed: failed.map((id) => id === 'CHECK' ? 'revisiones' : units.find((unit) => unit.id === id)?.numeroInterno ?? 'mantenimiento') };
  }, true);
  const rows = list.data?.rows ?? null;
  const selectedCheck = rows?.find((row) => row.id === ordenId)?.tipo === 'CHECK';
  const detailRead = useReadResource(role && ordenId && rows ? JSON.stringify([role, userId, ordenId, selectedCheck]) : null,
    async (): Promise<{ maintenance: VisitaDetalle | null; check: CheckOrderDetail | null }> => selectedCheck
      ? { maintenance: null, check: await api<CheckOrderDetail>(`/checks/${ordenId}`, opts) }
      : { maintenance: await api<VisitaDetalle>(`/visitas/${ordenId}`, opts), check: null });
  const detalle = detailRead.data?.maintenance ?? null;
  const checkDetail = detailRead.data?.check ?? null;
  const setDetalle = (maintenance: VisitaDetalle) => detailRead.setData({ maintenance, check: null });
  const piezaRead = useReadResource(role && detalle ? JSON.stringify([role, userId, detalle.id, detalle.piezas]) : null,
    () => hydratePiezasFromInventario(detalle?.piezas ?? [], opts));
  const piezas = piezaRead.data ?? lineasDesdeVisita(detalle?.piezas ?? []);

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
        <PageHeader
          title={cola === 'abiertas' ? 'Órdenes abiertas' : cola === 'borradores' ? 'Borradores' : 'Historial de cerradas'}
          lede={isAdmin || cola === 'cerradas' ? 'Consulta el registro y la evidencia de cada orden.' : 'Localiza una orden y continúa su atención.'}
          actions={<>
            {!isAdmin ? <Button type="button" variant="secondary" aria-pressed={cola === 'cerradas'}
              onClick={() => setParams({ cola: cola === 'cerradas' ? null : 'cerradas', orden: null })}>
              <History className="size-4" aria-hidden />{cola === 'cerradas' ? 'Volver a abiertas' : 'Historial'}
            </Button> : null}
            {isAdmin ? null : <Button variant={borradorSeleccionado ? 'outline' : 'default'}
              type="button" ref={nuevaOrdenTriggerRef} onClick={() => setNuevaOrdenOpen(true)}>
              + Nueva orden
            </Button>}
          </>}
        />
      </header>
      )}
      {!soloDetalle ? <OperationalToolbar className="ordenes-query" label="Filtros de órdenes">
        <Field label="Buscar orden" htmlFor="ordenes-query">
          <div className="ordenes-head__search">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input id="ordenes-query" ref={searchRef} value={q}
              onChange={(event) => setParams({ q: event.target.value.trim() ? event.target.value : null })}
              placeholder="Unidad, placas o chofer…" aria-label="Buscar órdenes" className="pl-9" />
          </div>
        </Field>
        <div className="ordenes-query__types">
          <span className="ordenes-query__label" aria-hidden>Tipo de orden</span>
          <ListFilter label="Tipo de orden" value={tipo} options={typeOptions}
            onChange={(next) => setParams({ tipo: next === 'todos' ? null : next, orden: null })} />
        </div>
      </OperationalToolbar> : null}
      <FormAlert>{error}</FormAlert>
      <ReadStatus loading={list.loading} error={list.error || (list.data?.failed.length ? new Error('Consulta parcial') : null)}
        loadingText={list.data ? 'Actualizando órdenes; se muestran los datos de la consulta anterior…' : 'Cargando órdenes…'}
        errorText={list.data?.failed.length ? `Consulta parcial. Falta consultar: ${list.data.failed.join(', ')}.` : 'No se pudieron cargar las órdenes.'} retry={list.retry} />
      {!isAdmin && detalle?.estado === 'BORRADOR' && !detalle.openedAt ? <Button type="button" variant="secondary" className="mb-3" onClick={async () => {
        try {
          const opened = await api<{ openedAt: string; openedBy: string }>(`/mantenimiento-ordenes/${detalle.id}/abrir`, { role: role!, userId, method: 'POST' });
          if (successful.current?.key === listKey) {
            successful.current.rows.forEach((items, key) => successful.current!.rows.set(key,
              items.map((row) => row.id === detalle.id ? { ...row, ...opened } : row)));
          }
          setDetalle({ ...detalle, ...opened }); list.setData((current) => current ? { ...current, rows: current.rows.map((row) => row.id === detalle.id ? { ...row, ...opened } : row) } : null);
          setParams({ cola: null, orden: detalle.id });
        } catch (err) { setError(err instanceof HttpError ? err.message : 'No se pudo abrir la orden.'); }
      }}>Abrir orden</Button> : null}
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
            </div>
            <p className="ordenes-list__summary"><span>{filtered.length} {filtered.length === 1 ? 'orden' : 'órdenes'}</span><span>En esta vista</span></p>
            {filtered.length === 0 ? (
              <div className="empty-state">
                <h2>{list.data?.failed.length ? 'Consulta parcial sin coincidencias cargadas.' : emptyTitle}</h2>
                <p className="muted">{list.data?.failed.length ? 'Recupera las consultas que faltan.' : emptyLede}</p>
                {q.trim() || tipo !== 'todos' ? <Button type="button" variant="secondary" onClick={() => { setParams({ q: null, tipo: null, orden: null }); searchRef.current?.focus(); }}>Quitar filtros</Button> : null}
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
                      <span className="ordenes-row__object">
                        <UnidadMarca foto={row.fotoDataUrl} nombre={row.tipoNombre} icono={row.tipoIcono} size="md" className="shrink-0" />
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
            {ordenId && filtered.length > 0 ? <ReadStatus key={ordenId} loading={detailRead.loading} error={detailRead.error}
              loadingText="Cargando la orden…" errorText="No se pudo abrir la orden." retry={detailRead.retry} /> : null}
            {filtered.length === 0 ? null : checkDetail && checkDetail.id === ordenId ? (
              <CheckOrderReadOnly detail={checkDetail} mobile={mobileMode === true} />
            ) : detalle && detalle.id === ordenId ? (
              <OrdenDetalle
                mobile={mobileMode === true}
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
  mobile,
  detalle,
  piezas,
  piezaRead,
  continuar,
  marca,
  role,
  userId,
  onVisita,
}: {
  mobile: boolean;
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
  const Heading = mobile ? 'h1' : 'h2';
  return (
    <>
      <OrderDocumentHeader id={detalle.id} className="ordenes-detail__document"
        stateLabel={detalle.estado === 'BORRADOR' ? (detalle.openedAt ? 'Abierta' : 'Borrador') : 'Cerrada'} />
      <div className="ordenes-detail__head">
        <div className="ordenes-detail__identity">
          <MarcaUnidad
            foto={marca?.fotoDataUrl ?? null}
            tipoNombre={marca?.tipoNombre ?? detalle.tipoVehiculoNombre ?? ''}
            tipoIcono={marca?.tipoIcono ?? null}
          />
          <div>
            <Heading className="ordenes-detail__title">{detalle.unidadNumeroInterno}</Heading>
            <p className="ordenes-detail__meta">{marca?.placas || detalle.tipoVehiculoNombre || 'Unidad de mantenimiento'}</p>
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
      <OrderSafetyControls key={detalle.id} unitId={detalle.unidadId} orderId={detalle.id} closed={detalle.estado === 'CERRADO'} />
      <dl className="ordenes-facts">
        <div>
          <dt>Fecha de creación</dt>
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
        <ReadStatus loading={piezaRead.loading && detalle.piezas.length > 0} error={piezaRead.error}
          loadingText="Cargando datos de las piezas…" errorText="No se pudieron cargar los nombres de las piezas. Se conservan cantidades y origen."
          retry={piezaRead.retry} retryLabel="Reintentar piezas" />
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
