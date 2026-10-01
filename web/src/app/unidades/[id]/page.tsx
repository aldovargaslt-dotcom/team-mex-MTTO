'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { HubFichaNav, parseHubVista } from '@/components/HubFichaNav';
import { HubIdentityHeader } from '@/components/HubIdentityHeader';
import { HubResumen } from '@/components/HubResumen';
import { NuevaOrdenDialog } from '@/components/NuevaOrdenDialog';
import { RoleGate } from '@/components/RoleGate';
import { StatusBadge } from '@/components/StatusBadge';
import { UnitHealth } from '@/components/UnitHealth';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { api, HttpError } from '@/lib/api';
import {
  etiquetaOrigenPieza,
  etiquetaTipoVisita,
  etiquetaUom,
  formatFecha,
  formatKm,
} from '@/lib/format';
import { useRole } from '@/lib/role';
import {
  safeUnidadesReturnTo,
  withUnidadesReturnTo,
} from '@/lib/unidades-return';
import type {
  ItemInventario,
  OrigenPieza,
  Unidad,
  UnidadHub,
  UnidadHealth,
  VisitaResumen,
} from '@/lib/types';

export default function HubPage() {
  return (
    <RoleGate allow={['SUPERVISOR', 'ADMIN_DIRECTIVO']}>
      <HubContent />
    </RoleGate>
  );
}

function HubContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const vista = parseHubVista(searchParams.get('vista'));
  const returnTo = safeUnidadesReturnTo(searchParams.get('returnTo'));
  const { role, userId, isAdmin } = useRole();
  const [hub, setHub] = useState<UnidadHub | null>(null);
  const [unidad, setUnidad] = useState<Unidad | null>(null);
  const [health, setHealth] = useState<UnidadHealth | null>(null);
  const [healthState, setHealthState] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [healthOpen, setHealthOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [nuevaOrdenOpen, setNuevaOrdenOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function cargar() {
    const [nextHub, nextHealth, nextUnidad] = await Promise.all([
      api<UnidadHub>(`/unidades/${params.id}/hub`, { role: role!, userId }),
      api<UnidadHealth>(`/unidades/${params.id}/health`, {
        role: role!,
        userId,
      })
        .then((value) => {
          setHealthState('ready');
          return value;
        })
        .catch(() => {
          setHealthState('error');
          return null;
        }),
      api<Unidad>(`/unidades/${params.id}`, { role: role!, userId }).catch(
        () => null,
      ),
    ]);
    setHub(nextHub);
    setHealth(nextHealth);
    setUnidad(nextUnidad);
  }

  useEffect(() => {
    if (!role || !params.id) return;
    setHealthState('loading');
    void (async () => {
      try {
        await cargar();
      } catch (err) {
        if (err instanceof HttpError && err.status === 404) {
          setNotFound(true);
        } else {
          setError(
            err instanceof HttpError
              ? err.message
              : 'No se pudo cargar el hub de la unidad.',
          );
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, role, userId]);

  async function eliminar(id: string) {
    if (
      !window.confirm(
        '¿Eliminar este borrador? Esta acción no se puede deshacer.',
      )
    ) {
      return;
    }
    setBusyId(id);
    setError(null);
    try {
      await api(`/visitas/${id}`, { role: role!, userId, method: 'DELETE' });
      await cargar();
    } catch (err) {
      setError(
        err instanceof HttpError
          ? err.message
          : 'No se pudo eliminar el borrador.',
      );
    } finally {
      setBusyId(null);
    }
  }

  if (notFound) {
    return (
      <div className="empty-state">
        <h2>No se encontró la unidad.</h2>
        <Link className="btn btn-outline" href={returnTo}>
          Volver a unidades
        </Link>
      </div>
    );
  }

  if (!hub && error) {
    return (
      <div className="error-state">
        <h2>No se pudo abrir el hub</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!hub) {
    return <p className="muted">Cargando ficha de la unidad…</p>;
  }

  const ficha = hub.fichaCorta;
  const borrador = hub.borradores[0];
  const actions = (
    <>
      {isAdmin ? (
        <Button asChild>
          <Link href={`/unidades/${ficha.id}/editar`}>Editar datos</Link>
        </Button>
      ) : null}
      {isAdmin ? (
        <Button variant="outline" asChild>
          <Link href={`/unidades/${ficha.id}/editar#foto-unidad`}>Cambiar foto</Link>
        </Button>
      ) : null}
      {borrador ? (
        <Button asChild>
          <Link
            href={withUnidadesReturnTo(
              `/unidades/${ficha.id}/visitas/${borrador.id}`,
              returnTo,
            )}
          >
            Continuar orden
          </Link>
        </Button>
      ) : hub.puedeCrearVisita ? (
        <Button
          type="button"
          onClick={() => setNuevaOrdenOpen(true)}
        >
          Nueva orden
        </Button>
      ) : null}
    </>
  );

  return (
    <>
      <HubIdentityHeader
        numeroInterno={ficha.numeroInterno}
        estado={ficha.estado}
        motivoInactivacion={ficha.motivoInactivacion}
        marcaModelo={ficha.marcaModelo}
        anio={ficha.anio}
        tipoNombre={ficha.tipoNombre}
        tipoDescripcion={unidad?.tipo.descripcion}
        tipoIcono={unidad?.tipo.icono}
        fotoDataUrl={unidad?.fotoDataUrl}
        placas={ficha.placas}
        vin={ficha.vin}
        updatedAt={unidad?.updatedAt}
        health={health}
        healthState={healthState}
        onOpenHealth={() => setHealthOpen(true)}
        actions={actions}
        backHref={returnTo}
      />

      <div className="hub-ficha">
        <HubFichaNav unidadId={ficha.id} vista={vista} returnTo={returnTo} />
        <div className="hub-ficha-main">
          {error ? (
            <p className="alert" style={{ marginBottom: 12 }}>
              {error}
            </p>
          ) : null}

          {vista === 'resumen' ? (
            <HubResumen hub={hub} health={health} returnTo={returnTo} />
          ) : null}

          {vista === 'tecnica' ? (
            <section className="card panel">
              <h2>Datos de unidad</h2>
              <dl className="dl">
                <dt>Número interno</dt>
                <dd className="mono">{ficha.numeroInterno}</dd>
                <dt>Placas</dt>
                <dd>{ficha.placas}</dd>
                {ficha.vin ? (
                  <>
                    <dt>VIN</dt>
                    <dd className="mono">{ficha.vin}</dd>
                  </>
                ) : null}
                <dt>Tipo</dt>
                <dd>{ficha.tipoNombre}</dd>
                {unidad?.tipo.descripcion ? (
                  <>
                    <dt>Descripción</dt>
                    <dd>{unidad.tipo.descripcion}</dd>
                  </>
                ) : null}
                <dt>Estado</dt>
                <dd>
                  <StatusBadge estado={ficha.estado} />
                  {ficha.motivoInactivacion === 'ENVIO_ESPECIAL' ? (
                    <span className="ml-2 text-[12px] text-muted-foreground">
                      Envío especial
                    </span>
                  ) : null}
                </dd>
                <dt>Marca / modelo</dt>
                <dd>{ficha.marcaModelo || 'Sin marca / modelo'}</dd>
                <dt>Año</dt>
                <dd>{ficha.anio ?? 'Sin año registrado'}</dd>
                <dt>Odómetro registrado</dt>
                <dd>
                  {ficha.ultimoKm != null
                    ? formatKm(ficha.ultimoKm)
                    : 'Sin registro'}
                </dd>
              </dl>
            </section>
          ) : null}

          {vista === 'mantenimiento' ? (
            <section className="card panel">
              <h2>Mantenimiento</h2>
              {health?.drivers.some((d) => d.type === 'MAINTENANCE_OVERDUE') ? (
                <p className="hub-ops-status text-destructive">
                  {health.drivers.find((d) => d.type === 'MAINTENANCE_OVERDUE')
                    ?.message}
                </p>
              ) : null}
              {!isAdmin ? (
                <>
                  <h3 className="subhead">Visitas abiertas</h3>
                  {hub.borradores.length === 0 ? (
                    <p className="muted">
                      No hay visitas en borrador en esta unidad.
                    </p>
                  ) : (
                    <ul className="visit-list">
                      {hub.borradores.map((visita) => (
                        <li key={visita.id}>
                          <div>
                            <strong>{etiquetaTipoVisita(visita.tipo)}</strong>
                            <div className="muted">
                              {formatKm(visita.km)}
                              {visita.choferNombre
                                ? ` · ${visita.choferNombre}`
                                : ''}
                              {' · '}
                              {formatFecha(visita.updatedAt)}
                            </div>
                          </div>
                          <div className="hub-actions" style={{ marginTop: 0 }}>
                            <Link
                              className="btn btn-outline"
                              href={withUnidadesReturnTo(
                                `/unidades/${ficha.id}/visitas/${visita.id}`,
                                returnTo,
                              )}
                            >
                              Continuar
                            </Link>
                            <button
                              type="button"
                              className="btn btn-danger"
                              disabled={busyId === visita.id}
                              onClick={() => void eliminar(visita.id)}
                            >
                              Eliminar
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <p className="muted">
                  El historial de servicios está en Historial.
                </p>
              )}
            </section>
          ) : null}

          {vista === 'historial' ? (
            <section className="card panel">
              <h2>Historial de servicios</h2>
              {hub.historialCerrado.length === 0 ? (
                <p className="muted">
                  Aún no hay órdenes de mantenimiento cerradas.
                </p>
              ) : (
                <>
                <HistorialComparativa historial={hub.historialCerrado} />
                <h3 className="subhead">Cadencia entre servicios</h3>
                <ul className="visit-list visit-timeline">
                  {hub.historialCerrado.map((visita, index) => (
                    <HistorialItem
                      key={visita.id}
                      unidadId={ficha.id}
                      visita={visita}
                      anterior={hub.historialCerrado[index + 1] ?? null}
                      returnTo={returnTo}
                    />
                  ))}
                </ul>
                </>
              )}
              <HubRefacciones
                unidadId={ficha.id}
                historial={hub.historialCerrado}
                returnTo={returnTo}
              />
            </section>
          ) : null}
        </div>
      </div>

      <Sheet open={healthOpen} onOpenChange={setHealthOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Salud de la unidad</SheetTitle>
            <SheetDescription>
              {health?.available
                ? health.label
                : 'Cómo se calcula este indicador.'}
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4 overflow-y-auto">
            {health ? (
              <UnitHealth health={health} variant="detailed" />
            ) : (
              <p className="muted">Health no disponible</p>
            )}
          </div>
        </SheetContent>
      </Sheet>
      {!isAdmin && role ? (
        <NuevaOrdenDialog
          open={nuevaOrdenOpen}
          onOpenChange={setNuevaOrdenOpen}
          role={role}
          userId={userId}
          preselectedUnitId={ficha.id}
          onContinue={(visita) => {
            setNuevaOrdenOpen(false);
            router.push(
              withUnidadesReturnTo(
                `/unidades/${ficha.id}/visitas/${visita.id}`,
                returnTo,
              ),
            );
          }}
        />
      ) : null}
    </>
  );
}

function HistorialItem({
  unidadId,
  visita,
  anterior,
  returnTo,
}: {
  unidadId: string;
  visita: VisitaResumen;
  anterior: VisitaResumen | null;
  returnTo: string;
}) {
  const trabajos = visita.trabajos ?? [];
  const extraTrabajos = Math.max(0, trabajos.length - 2);
  const piezas = (visita.piezas ?? []).reduce((sum, pieza) => sum + pieza.qty, 0);
  const days = anterior?.cerradoAt && visita.cerradoAt
    ? Math.max(0, Math.round((new Date(visita.cerradoAt).getTime() - new Date(anterior.cerradoAt).getTime()) / 86_400_000))
    : null;
  const deltaKm = anterior?.km != null && visita.km != null ? Math.max(0, visita.km - anterior.km) : null;
  return (
    <li>
      <Link
        href={withUnidadesReturnTo(
          `/unidades/${unidadId}/visitas/${visita.id}`,
          returnTo,
        )}
      >
        {anterior ? <span className="visit-timeline__interval">+{deltaKm?.toLocaleString('es-MX') ?? '—'} km · {days ?? '—'} días</span> : null}
        <span className="visit-timeline__main">
          <span><strong>{formatFecha(visita.cerradoAt)} · {etiquetaTipoVisita(visita.tipo)}</strong>
          <span className="muted">{formatKm(visita.km)}{visita.choferNombre ? ` · ${visita.choferNombre}` : ''}</span>
          <span className="muted">{trabajos.slice(0, 2).map((t) => t.item).join(' · ') || 'Sin trabajos detallados'}{extraTrabajos ? ` · ${extraTrabajos} más` : ''} · {piezas} {piezas === 1 ? 'pieza' : 'piezas'}</span></span>
          <span className="visit-timeline__go">Ver orden <span aria-hidden>›</span></span>
        </span>
      </Link>
    </li>
  );
}

function HistorialComparativa({ historial }: { historial: VisitaResumen[] }) {
  const preventivos = historial.filter((visita) => visita.tipo === 'PREDICTIVO').length;
  const correctivos = historial.filter((visita) => visita.tipo === 'CORRECTIVO').length;
  const total = preventivos + correctivos;
  const preventivoPct = total ? Math.round((preventivos / total) * 100) : 0;
  const correctivoPct = 100 - preventivoPct;
  return (
    <div className="history-mix" aria-label={`Preventivo ${preventivos}, ${preventivoPct} por ciento. Correctivo ${correctivos}, ${correctivoPct} por ciento.`}>
      <h3>Preventivo y correctivo</h3>
      <div className="history-mix__bar" aria-hidden>
        <span className="is-preventivo" style={{ width: `${preventivoPct}%` }} />
        <span className="is-correctivo" style={{ width: `${correctivoPct}%` }} />
      </div>
      <div className="history-mix__labels">
        <span><i className="is-preventivo" />Preventivo · {preventivos} · {preventivoPct}%</span>
        <span><i className="is-correctivo" />Correctivo · {correctivos} · {correctivoPct}%</span>
      </div>
      {total === 1 ? <p className="muted">Hay una orden cerrada. Todavía no hay suficiente historial para mostrar una tendencia.</p> : null}
    </div>
  );
}

type HubPiezaRow = {
  key: string;
  visitaId: string;
  cerradoAt: string | null;
  itemId: string;
  qty: number;
  origen: OrigenPieza;
};

function HubRefacciones({
  unidadId,
  historial,
  returnTo,
}: {
  unidadId: string;
  historial: VisitaResumen[];
  returnTo: string;
}) {
  const { role, userId } = useRole();
  const router = useRouter();
  const [labels, setLabels] = useState<
    Record<string, { sku: string; nombre: string; uom?: string }>
  >({});

  const rows: HubPiezaRow[] = useMemo(
    () =>
      historial.flatMap((visita) =>
        (visita.piezas ?? []).map((pieza, index) => ({
          key: `${visita.id}:${pieza.itemId}:${index}`,
          visitaId: visita.id,
          cerradoAt: visita.cerradoAt,
          itemId: pieza.itemId,
          qty: pieza.qty,
          origen: pieza.origen,
        })),
      ),
    [historial],
  );

  const idsKey = rows
    .map((row) => row.itemId)
    .filter((id, i, all) => all.indexOf(id) === i)
    .sort()
    .join(',');

  useEffect(() => {
    if (!role || !idsKey) {
      setLabels({});
      return;
    }
    void api<ItemInventario[]>(`/inventario/items?ids=${idsKey}`, {
      role,
      userId,
    })
      .then((items) => {
        setLabels(
          Object.fromEntries(
            items.map((item) => [
              item.id,
              { sku: item.sku, nombre: item.nombre, uom: item.uom },
            ]),
          ),
        );
      })
      .catch(() => {
        /* SKU se muestra como Refacción si Inventario no responde */
      });
  }, [role, userId, idsKey]);

  const columns: ColumnDef<HubPiezaRow, unknown>[] = useMemo(
    () => [
      {
        accessorKey: 'cerradoAt',
        header: 'Fecha cierre',
        cell: ({ row }) => formatFecha(row.original.cerradoAt),
      },
      {
        id: 'visita',
        header: 'Visita',
        cell: ({ row }) => (
          <Link
            href={withUnidadesReturnTo(
              `/unidades/${unidadId}/visitas/${row.original.visitaId}`,
              returnTo,
            )}
            className="font-medium text-navy underline-offset-2 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            Ver visita
          </Link>
        ),
      },
      {
        id: 'refaccion',
        header: 'Refacción',
        cell: ({ row }) => {
          const item = labels[row.original.itemId];
          return item ? (
            <span>
              <span className="mono">{item.sku}</span>
              {` · ${item.nombre}`}
            </span>
          ) : (
            'Refacción'
          );
        },
      },
      {
        accessorKey: 'qty',
        header: 'Cant.',
        cell: ({ row }) => (
          <span className="mono">
            {row.original.qty}{' '}
            {etiquetaUom(labels[row.original.itemId]?.uom)}
          </span>
        ),
      },
      {
        accessorKey: 'origen',
        header: 'Origen',
        cell: ({ row }) => etiquetaOrigenPieza(row.original.origen),
      },
    ],
    [labels, returnTo, unidadId],
  );

  return (
    <>
      <h3 className="subhead">Refacciones</h3>
      {rows.length === 0 ? (
        <p className="muted">Aún no hay refacciones en visitas cerradas.</p>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          onRowClick={(row) =>
            router.push(
              withUnidadesReturnTo(
                `/unidades/${unidadId}/visitas/${row.visitaId}`,
                returnTo,
              ),
            )
          }
        />
      )}
    </>
  );
}
