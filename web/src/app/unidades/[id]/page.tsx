'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { HubFichaNav, parseHubVista } from '@/components/HubFichaNav';
import {
  HubIdentityHeader,
  HubMasAcciones,
} from '@/components/HubIdentityHeader';
import { HubResumen } from '@/components/HubResumen';
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
  etiquetaEstadoVisita,
  etiquetaOrigenPieza,
  etiquetaTipoVisita,
  etiquetaUom,
  formatFecha,
  formatKm,
} from '@/lib/format';
import { useRole } from '@/lib/role';
import type {
  ItemInventario,
  OrigenPieza,
  Unidad,
  UnidadHub,
  UnidadHealth,
  VisitaDetalle,
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
  const [creating, setCreating] = useState(false);
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

  async function nuevaVisita() {
    if (!hub?.puedeCrearVisita) return;
    setCreating(true);
    setError(null);
    try {
      const created = await api<VisitaDetalle>(
        `/unidades/${params.id}/visitas`,
        { role: role!, userId, method: 'POST' },
      );
      router.push(`/unidades/${params.id}/visitas/${created.id}`);
    } catch (err) {
      setError(
        err instanceof HttpError
          ? err.message
          : 'No se pudo crear la visita.',
      );
    } finally {
      setCreating(false);
    }
  }

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
        <Link className="btn btn-outline" href="/unidades">
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
  const masAcciones =
    borrador && hub.puedeCrearVisita ? (
      <HubMasAcciones
        items={
          <button
            type="button"
            role="menuitem"
            disabled={creating}
            onClick={() => void nuevaVisita()}
          >
            {creating ? 'Creando…' : 'Registrar mantenimiento'}
          </button>
        }
      />
    ) : null;

  const actions = (
    <>
      {isAdmin ? (
        <Button variant="secondary" asChild>
          <Link href={`/unidades/${ficha.id}/editar`}>Editar</Link>
        </Button>
      ) : null}
      {borrador ? (
        <Button asChild>
          <Link href={`/unidades/${ficha.id}/visitas/${borrador.id}`}>
            Continuar
          </Link>
        </Button>
      ) : hub.puedeCrearVisita ? (
        <Button
          type="button"
          disabled={creating}
          onClick={() => void nuevaVisita()}
        >
          {creating ? 'Creando…' : 'Registrar mantenimiento'}
        </Button>
      ) : null}
      {masAcciones}
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
        placas={ficha.placas}
        vin={ficha.vin}
        updatedAt={unidad?.updatedAt}
        health={health}
        healthState={healthState}
        onOpenHealth={() => setHealthOpen(true)}
        actions={actions}
      />

      <div className="hub-ficha">
        <HubFichaNav unidadId={ficha.id} vista={vista} />
        <div className="hub-ficha-main">
          {error ? (
            <p className="alert" style={{ marginBottom: 12 }}>
              {error}
            </p>
          ) : null}

          {vista === 'resumen' ? (
            <HubResumen hub={hub} health={health} />
          ) : null}

          {vista === 'tecnica' ? (
            <section className="card panel">
              <h2>Información técnica</h2>
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
                              href={`/unidades/${ficha.id}/visitas/${visita.id}`}
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
                  Aún no hay visitas de mantenimiento registradas.
                </p>
              ) : (
                <ul className="visit-list">
                  {hub.historialCerrado.map((visita) => (
                    <HistorialItem
                      key={visita.id}
                      unidadId={ficha.id}
                      visita={visita}
                    />
                  ))}
                </ul>
              )}
              <HubRefacciones
                unidadId={ficha.id}
                historial={hub.historialCerrado}
              />
            </section>
          ) : null}
        </div>
      </div>

      <Sheet open={healthOpen} onOpenChange={setHealthOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>
              {health?.available && health.score != null
                ? `Salud de la unidad — ${health.score}%`
                : 'Salud de la unidad'}
            </SheetTitle>
            <SheetDescription>
              {health?.available
                ? `${health.score}% — ${health.label}`
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
    </>
  );
}

function HistorialItem({
  unidadId,
  visita,
}: {
  unidadId: string;
  visita: VisitaResumen;
}) {
  return (
    <li>
      <Link href={`/unidades/${unidadId}/visitas/${visita.id}`}>
        <strong>
          {etiquetaTipoVisita(visita.tipo)} · {etiquetaEstadoVisita(visita.estado)}
        </strong>
        <div className="muted">
          {formatKm(visita.km)}
          {visita.choferNombre ? ` · ${visita.choferNombre}` : ''}
          {' · '}
          {formatFecha(visita.cerradoAt)}
        </div>
      </Link>
    </li>
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
}: {
  unidadId: string;
  historial: VisitaResumen[];
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
            href={`/unidades/${unidadId}/visitas/${row.original.visitaId}`}
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
    [labels, unidadId],
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
            router.push(`/unidades/${unidadId}/visitas/${row.visitaId}`)
          }
        />
      )}
    </>
  );
}
