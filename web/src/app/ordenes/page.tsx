'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { ArrowUpDown, Check, Inbox, ListFilter, Pause, Search } from 'lucide-react';
import { OrdenCaptura } from '@/components/OrdenCaptura';
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

type Cola = 'abiertas' | 'cerradas';
type TipoFiltro = 'todos' | TipoVisita;

type OrdenRow = VisitaResumen & {
  unidadId: string;
  numeroInterno: string;
  placas: string;
  fotoDataUrl: string | null;
};

const COLAS: { id: Cola; label: string }[] = [
  { id: 'abiertas', label: 'Abiertas' },
  { id: 'cerradas', label: 'Cerradas' },
];

const TIPOS: { id: TipoFiltro; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'PREDICTIVO', label: 'Predictivo' },
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
  const [rows, setRows] = useState<OrdenRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<VisitaDetalle | null>(null);
  const [detalleError, setDetalleError] = useState<string | null>(null);
  const [piezas, setPiezas] = useState<PiezaLinea[]>([]);
  const [filtroAbierto, setFiltroAbierto] = useState(false);

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
                })),
            ),
          ),
        );
        const next = settled.flatMap((item) =>
          item.status === 'fulfilled' ? item.value : [],
        );
        const failed = settled.filter((item) => item.status === 'rejected').length;
        if (failed === settled.length && unidades.length > 0) {
          const first = settled[0];
          setRows([]);
          setError(
            first?.status === 'rejected' && first.reason instanceof HttpError
              ? first.reason.message
              : 'No se pudieron cargar las órdenes.',
          );
          return;
        }
        if (failed > 0) {
          setError('Algunas unidades no pudieron listar sus órdenes.');
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
    if (rows == null) return;
    if (filtered.length === 0) {
      if (ordenId) setParams({ orden: null });
      return;
    }
    if (!ordenId || !filtered.some((row) => row.id === ordenId)) {
      setParams({ orden: filtered[0].id });
    }
    // setParams identity changes with the URL; the guard stops the loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, filtered, ordenId]);

  useEffect(() => {
    if (!role || !ordenId) {
      setDetalle(null);
      setPiezas([]);
      setDetalleError(null);
      return;
    }
    const opts = { role, userId };
    let cancelled = false;
    setDetalleError(null);
    void (async () => {
      try {
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
  }, [role, userId, ordenId]);

  const borradorSeleccionado =
    !isAdmin && detalle?.estado === 'BORRADOR' && detalle.id === ordenId;
  const emptyTitle =
    cola === 'abiertas' ? 'No hay órdenes abiertas.' : 'No hay órdenes cerradas.';
  const emptyLede = q.trim()
    ? 'Pruebe otro texto o quite el filtro de tipo.'
    : cola === 'abiertas'
      ? 'Un borrador nace en la unidad. Desde ahí se capturan trabajos, fotos y piezas.'
      : isAdmin
        ? 'El administrador ve las visitas ya cerradas.'
        : 'Al cerrar una visita pasa a esta lista.';

  return (
    <>
      <header className="ordenes-head">
        <h1>Órdenes de trabajo</h1>
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
            asChild
            variant={borradorSeleccionado ? 'outline' : 'default'}
            className={borradorSeleccionado ? undefined : 'ordenes-primary'}
          >
            <Link href="/unidades">+ Nueva orden</Link>
          </Button>
        )}
      </header>
      <FormAlert>{error}</FormAlert>
      {rows == null ? (
        <p className="muted">Cargando órdenes…</p>
      ) : (
        <div className="ordenes-desk">
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
                      {option.id === 'abiertas' ? 'Por hacer' : 'Hechas'}
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
                <h2>{emptyTitle}</h2>
                <p className="muted">{emptyLede}</p>
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
                      className={[
                        'ordenes-row',
                        row.fotoDataUrl ? 'has-foto' : '',
                        selected ? 'is-selected' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => setParams({ orden: row.id })}
                    >
                      {row.fotoDataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          className="ordenes-unidad-foto"
                          src={row.fotoDataUrl}
                          alt=""
                        />
                      ) : null}
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
            <FormAlert>{detalleError}</FormAlert>
            {filtered.length === 0 ? null : detalle && detalle.id === ordenId ? (
              <OrdenDetalle
                detalle={detalle}
                piezas={piezas}
                continuar={Boolean(borradorSeleccionado)}
                fotoUnidad={rows?.find((row) => row.id === ordenId)?.fotoDataUrl ?? null}
                role={role!}
                userId={userId}
                onVisita={(next) => {
                  setDetalle(next);
                  void hydratePiezasFromInventario(next.piezas ?? [], {
                    role: role!,
                    userId,
                  }).then(setPiezas);
                }}
                onFotoUnidad={(foto) =>
                  setRows((current) =>
                    current
                      ? current.map((row) =>
                          row.unidadId === detalle.unidadId
                            ? { ...row, fotoDataUrl: foto }
                            : row,
                        )
                      : current,
                  )
                }
              />
            ) : detalleError ? null : (
              <p className="muted">Cargando la orden…</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function OrdenDetalle({
  detalle,
  piezas,
  continuar,
  fotoUnidad,
  role,
  userId,
  onVisita,
  onFotoUnidad,
}: {
  detalle: VisitaDetalle;
  piezas: PiezaLinea[];
  continuar: boolean;
  fotoUnidad: string | null;
  role: string;
  userId?: string;
  onVisita: (visita: VisitaDetalle) => void;
  onFotoUnidad: (foto: string | null) => void;
}) {
  return (
    <>
      <div className="ordenes-detail__head">
        <div>
          <h2 className="ordenes-detail__title">{detalle.unidadNumeroInterno}</h2>
          <p className="ordenes-folio">{numeroOrden(detalle.id)}</p>
        </div>
        <div className="ordenes-actions">
          <Button asChild variant="outline" size="compact">
            <a href="#orden-comentarios">Comentarios</a>
          </Button>
          <Button
            asChild
            variant={continuar ? 'default' : 'outline'}
            size="compact"
            className={continuar ? 'ordenes-primary' : undefined}
          >
            <Link href={`/unidades/${detalle.unidadId}/visitas/${detalle.id}`}>
              {continuar ? 'Editar' : 'Abrir'}
            </Link>
          </Button>
        </div>
      </div>
      <OrdenCaptura
        key={detalle.id}
        role={role}
        userId={userId}
        editable={continuar}
        detalle={detalle}
        fotoUnidad={fotoUnidad}
        onVisita={onVisita}
        onFotoUnidad={onFotoUnidad}
      />
      <div className="ordenes-status" aria-label="Estado de la orden">
        <span className={detalle.estado === 'BORRADOR' ? 'is-on' : ''}>
          <Inbox className="size-5" aria-hidden />
          Abierta
        </span>
        <span className="is-off">
          <Pause className="size-4" aria-hidden />
          Pausada
        </span>
        <span className="is-off">
          <ArrowUpDown className="size-4" aria-hidden />
          En progreso
        </span>
        <span className={detalle.estado === 'CERRADO' ? 'is-on' : ''}>
          <Check className="size-4" aria-hidden />
          Hecha
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
