'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { RoleGate } from '@/components/RoleGate';
import { StatusBadge } from '@/components/StatusBadge';
import { AndonHubCard } from '@/components/AndonHubCard';
import { UnitHealth } from '@/components/UnitHealth';
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
  const { role, userId, isAdmin } = useRole();
  const [hub, setHub] = useState<UnidadHub | null>(null);
  const [health, setHealth] = useState<UnidadHealth | null>(null);
  const [healthOpen, setHealthOpen] = useState(false);
  const [alertaEnCard, setAlertaEnCard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function cargar() {
    const [nextHub, nextHealth] = await Promise.all([
      api<UnidadHub>(`/unidades/${params.id}/hub`, { role: role!, userId }),
      api<UnidadHealth>(`/unidades/${params.id}/health`, {
        role: role!,
        userId,
      }).catch(() => null),
    ]);
    setHub(nextHub);
    setHealth(nextHealth);
  }

  useEffect(() => {
    if (!role || !params.id) return;
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
            Volver al listado
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
  const warn = hub.mensajes.some(
    (m) =>
      /inactiva|administrador|choferes/i.test(m) && !hub.puedeCrearVisita
      || /choferes/i.test(m),
  );

  return (
    <>
      <div className="page-head">
        <div>
          <h1>
            {ficha.numeroInterno} <StatusBadge estado={ficha.estado} />
          </h1>
          <p className="lede">
            {ficha.tipoNombre}
            {ficha.marcaModelo ? ` · ${ficha.marcaModelo}` : ''}
          </p>
        </div>
        <div className="hub-head-aside">
          <Link className="btn btn-secondary" href="/unidades">
            Volver
          </Link>
        </div>
      </div>

      {error ? <p className="alert" style={{ marginBottom: 12 }}>{error}</p> : null}

      <div style={{ marginBottom: 12 }}>
        <AndonHubCard
          unidadId={ficha.id}
          health={health}
          onOpenHealth={() => setHealthOpen(true)}
          onAvisoChange={(aviso) => setAlertaEnCard(aviso != null)}
          puedeCrearVisita={hub.puedeCrearVisita}
          onNuevaVisita={() => void nuevaVisita()}
          creating={creating}
        />
      </div>

      <div className="hub-grid">
        <section className="card panel">
          <h2>Ficha corta</h2>
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
            <dt>Último km (visita cerrada)</dt>
            <dd>
              {ficha.ultimoKm != null
                ? `${ficha.ultimoKm.toLocaleString('es-MX')} km`
                : 'Sin registro'}
            </dd>
          </dl>
          {isAdmin ? (
            <div className="hub-actions">
              <Link
                className="btn btn-secondary"
                href={`/unidades/${ficha.id}/editar`}
              >
                Editar unidad
              </Link>
            </div>
          ) : null}
        </section>

        <section className="card panel">
          <h2>Mantenimiento</h2>
          {!isAdmin ? (
            <>
              <h3 className="subhead">Borradores</h3>
              {hub.borradores.length === 0 ? (
                <p className="muted">No hay visitas en borrador en esta unidad.</p>
              ) : (
                <ul className="visit-list">
                  {hub.borradores.map((visita, index) => (
                    <li key={visita.id}>
                      <div>
                        <strong>{etiquetaTipoVisita(visita.tipo)}</strong>
                        <div className="muted">
                          {formatKm(visita.km)}
                          {visita.choferNombre ? ` · ${visita.choferNombre}` : ''}
                          {' · '}
                          {formatFecha(visita.updatedAt)}
                        </div>
                      </div>
                      <div className="hub-actions" style={{ marginTop: 0 }}>
                        <Link
                          className={
                            index === 0 ? 'btn btn-primary' : 'btn btn-outline'
                          }
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
              <div className="hub-actions">
                <button
                  type="button"
                  className={
                    hub.borradores.length > 0 || alertaEnCard
                      ? 'btn btn-outline'
                      : 'btn btn-primary'
                  }
                  disabled={!hub.puedeCrearVisita || creating}
                  onClick={() => void nuevaVisita()}
                >
                  {creating ? 'Creando…' : 'Nueva visita'}
                </button>
              </div>
            </>
          ) : null}

          <h3 className="subhead">Historial</h3>
          {hub.historialCerrado.length === 0 ? (
            <p className="muted">Aún no hay visitas de mantenimiento registradas.</p>
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

          {hub.mensajes.map((mensaje) => (
            <p
              key={mensaje}
              className={warn ? 'note note-warn' : 'note'}
            >
              {mensaje}
            </p>
          ))}
        </section>
      </div>

      <Sheet open={healthOpen} onOpenChange={setHealthOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Salud de la unidad</SheetTitle>
            <SheetDescription>
              {health?.available
                ? `${health.score}% — ${health.label}`
                : 'Cómo se calcula este indicador.'}
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4 overflow-y-auto">
            {health ? (
              <UnitHealth health={health} variant="detailed" />
            ) : null}
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
