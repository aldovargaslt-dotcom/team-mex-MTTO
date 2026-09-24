'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { ListFilter } from '@/components/ListFilter';
import { hydratePiezasFromInventario, type PiezaLinea } from '@/components/PiezasStep';
import { RoleGate } from '@/components/RoleGate';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormAlert, PageHeader } from '@/components/ui/field';
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
  etiquetaEstadoVisita,
  etiquetaOrigenPieza,
  etiquetaTipoVisita,
  etiquetaUom,
  formatFecha,
  formatKm,
  formatTiempoCerrado,
} from '@/lib/format';
import { useRole } from '@/lib/role';
import type { TipoVisita, Unidad, VisitaDetalle, VisitaResumen } from '@/lib/types';

type Cola = 'abiertas' | 'cerradas';
type TipoFiltro = 'todos' | TipoVisita;

type OrdenRow = VisitaResumen & {
  unidadId: string;
  numeroInterno: string;
  placas: string;
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
      <PageHeader
        title="Órdenes de trabajo"
        lede="Lo abierto y lo ya cerrado. La captura sigue en la unidad."
        actions={
          isAdmin ? null : (
            <Button asChild variant={borradorSeleccionado ? 'outline' : 'default'}>
              <Link href="/unidades">Nueva orden</Link>
            </Button>
          )
        }
      />
      <div className="ordenes-toolbar">
        {isAdmin ? null : (
          <ListFilter
            label="Cola"
            value={cola}
            options={COLAS}
            onChange={(next) =>
              setParams({ cola: next === 'abiertas' ? null : next, orden: null })
            }
          />
        )}
        <ListFilter
          label="Tipo de mantenimiento"
          value={tipo}
          options={TIPOS}
          onChange={(next) =>
            setParams({ tipo: next === 'todos' ? null : next, orden: null })
          }
        />
        <div className="unidades-search">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={q}
            onChange={(event) =>
              setParams({ q: event.target.value.trim() ? event.target.value : null })
            }
            placeholder="Unidad, placas o chofer"
            aria-label="Buscar órdenes"
            className="pl-9"
          />
        </div>
      </div>
      <FormAlert>{error}</FormAlert>
      {rows == null ? (
        <p className="muted">Cargando órdenes…</p>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <h2>{emptyTitle}</h2>
          <p className="muted">{emptyLede}</p>
        </div>
      ) : (
        <div className="ordenes-desk">
          <div className="ordenes-list">
            <div className="ordenes-list__scroll" role="listbox" aria-label="Órdenes">
              {filtered.map((row) => {
                const selected = row.id === ordenId;
                return (
                  <button
                    key={row.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={selected ? 'ordenes-row is-selected' : 'ordenes-row'}
                    onClick={() => setParams({ orden: row.id })}
                  >
                    <span className="ordenes-row__top">
                      <span className="ordenes-row__title">{row.numeroInterno}</span>
                      <Badge variant={row.estado === 'CERRADO' ? 'success' : 'warning'}>
                        {etiquetaEstadoVisita(row.estado)}
                      </Badge>
                    </span>
                    <span className="ordenes-row__sub">
                      {row.placas}
                      {row.choferNombre ? ` · ${row.choferNombre}` : ' · Sin chofer'}
                    </span>
                    <span className="ordenes-row__meta">
                      <span className="ordenes-row__tipo">{etiquetaTipoVisita(row.tipo)}</span>
                      <span className="ordenes-row__tipo">
                        {row.trabajosCount === 1
                          ? '1 trabajo'
                          : `${row.trabajosCount} trabajos`}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="ordenes-detail">
            <FormAlert>{detalleError}</FormAlert>
            {detalle && detalle.id === ordenId ? (
              <OrdenDetalle
                detalle={detalle}
                piezas={piezas}
                continuar={Boolean(borradorSeleccionado)}
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
}: {
  detalle: VisitaDetalle;
  piezas: PiezaLinea[];
  continuar: boolean;
}) {
  return (
    <>
      <div className="ordenes-detail__head">
        <div>
          <h2 className="ordenes-detail__title">
            {detalle.unidadNumeroInterno}
            <Badge variant={detalle.estado === 'CERRADO' ? 'success' : 'warning'}>
              {etiquetaEstadoVisita(detalle.estado)}
            </Badge>
          </h2>
          <p className="muted mt-1">
            {detalle.chofer?.nombre ?? 'Sin chofer'}
            {detalle.km != null ? ` · ${formatKm(detalle.km)}` : ''}
          </p>
        </div>
        {continuar ? (
          <Button asChild>
            <Link href={`/unidades/${detalle.unidadId}/visitas/${detalle.id}`}>
              Continuar
            </Link>
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link href={`/unidades/${detalle.unidadId}/visitas/${detalle.id}`}>
              Abrir orden
            </Link>
          </Button>
        )}
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
        <div>
          <dt>Tipo de mantenimiento</dt>
          <dd>{etiquetaTipoVisita(detalle.tipo)}</dd>
        </div>
      </dl>
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
        <h2 id="orden-piezas">Piezas</h2>
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
