'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { RoleGate } from '@/components/RoleGate';
import { StatusBadge } from '@/components/StatusBadge';
import { AndonHubCard } from '@/components/AndonHubCard';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { FormAlert, Note, PageHeader } from '@/components/ui/field';
import { api, HttpError } from '@/lib/api';
import {
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
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function cargar() {
    setHub(
      await api<UnidadHub>(`/unidades/${params.id}/hub`, { role: role!, userId }),
    );
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

  const historialColumns = useMemo<ColumnDef<VisitaResumen, unknown>[]>(
    () => [
      {
        id: 'tipo',
        header: 'Visita',
        cell: ({ row }) => (
          <span className="font-medium text-navy">
            {etiquetaTipoVisita(row.original.tipo)}
          </span>
        ),
      },
      {
        id: 'km',
        header: 'Km',
        cell: ({ row }) => formatKm(row.original.km),
      },
      {
        id: 'chofer',
        header: 'Chofer',
        cell: ({ row }) => row.original.choferNombre ?? '—',
      },
      {
        id: 'cerrada',
        header: 'Cerrada',
        cell: ({ row }) => (
          <span className="text-[12px] text-muted-foreground">
            {formatFecha(row.original.cerradoAt)}
          </span>
        ),
      },
    ],
    [],
  );

  if (notFound) {
    return (
      <div className="empty-state">
        <h2>No se encontró la unidad.</h2>
        <Button asChild variant="outline">
          <Link href="/unidades">Volver al listado</Link>
        </Button>
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
  const primerBorrador = hub.borradores[0];
  const ultimaCerrada = hub.historialCerrado[0];
  const lede = [
    ficha.tipoNombre,
    ficha.marcaModelo,
    ficha.anio ? String(ficha.anio) : null,
    ficha.placas,
  ]
    .filter(Boolean)
    .join(' · ');
  const bloqueos = hub.mensajes.filter((mensaje) =>
    /inactiva|choferes/i.test(mensaje),
  );

  return (
    <>
      <PageHeader
        title={
          <>
            {ficha.numeroInterno} <StatusBadge estado={ficha.estado} />
          </>
        }
        lede={lede}
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href="/unidades">Volver</Link>
            </Button>
            {isAdmin ? (
              <Button asChild variant="outline">
                <Link href={`/unidades/${ficha.id}/editar`}>Editar unidad</Link>
              </Button>
            ) : primerBorrador ? (
              <Button asChild>
                <Link href={`/unidades/${ficha.id}/visitas/${primerBorrador.id}`}>
                  Continuar
                </Link>
              </Button>
            ) : hub.puedeCrearVisita ? (
              <Button
                type="button"
                disabled={creating}
                onClick={() => void nuevaVisita()}
              >
                {creating ? 'Creando…' : 'Nueva visita'}
              </Button>
            ) : null}
          </>
        }
      />

      <FormAlert>{error}</FormAlert>

      <dl className="hub-facts card">
        {ficha.vin ? (
          <div className="hub-fact">
            <dt>VIN</dt>
            <dd className="mono">{ficha.vin}</dd>
          </div>
        ) : null}
        <div className="hub-fact">
          <dt>Último km</dt>
          <dd>
            {ficha.ultimoKm != null
              ? `${ficha.ultimoKm.toLocaleString('es-MX')} km`
              : 'Sin registro'}
          </dd>
        </div>
        <div className="hub-fact">
          <dt>Última visita</dt>
          <dd>
            {ultimaCerrada
              ? `${etiquetaTipoVisita(ultimaCerrada.tipo)} · ${formatFecha(ultimaCerrada.cerradoAt)}`
              : 'Sin visitas cerradas'}
          </dd>
        </div>
        {ficha.motivoInactivacion === 'ENVIO_ESPECIAL' ? (
          <div className="hub-fact">
            <dt>Motivo</dt>
            <dd>Envío especial</dd>
          </div>
        ) : null}
      </dl>

      <AndonHubCard unidadId={ficha.id} />

      {bloqueos.map((mensaje) => (
        <Note key={mensaje} variant="warn">
          {mensaje}
        </Note>
      ))}

      {!isAdmin && hub.borradores.length > 0 ? (
        <section className="card panel mb-3" aria-labelledby="hub-borradores">
          <h2 id="hub-borradores">Borradores</h2>
          <ul className="visit-list">
            {hub.borradores.map((visita) => (
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
                  <Button asChild variant="outline" size="compact">
                    <Link href={`/unidades/${ficha.id}/visitas/${visita.id}`}>
                      Continuar
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant="dangerSoft"
                    size="compact"
                    disabled={busyId === visita.id}
                    onClick={() => void eliminar(visita.id)}
                  >
                    Eliminar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          {hub.puedeCrearVisita ? (
            <div className="hub-actions">
              <Button
                type="button"
                variant="outline"
                disabled={creating}
                onClick={() => void nuevaVisita()}
              >
                {creating ? 'Creando…' : 'Nueva visita'}
              </Button>
            </div>
          ) : null}
        </section>
      ) : null}

      <section aria-labelledby="hub-historial">
        <h2
          id="hub-historial"
          className="mb-1 text-sm font-semibold text-navy"
        >
          Historial
        </h2>
        {hub.historialCerrado.length === 0 ? (
          <p className="muted">
            Aún no hay visitas de mantenimiento registradas.
          </p>
        ) : (
          <DataTable
            columns={historialColumns}
            data={hub.historialCerrado}
            empty="Aún no hay visitas de mantenimiento registradas."
            onRowClick={(visita) =>
              router.push(`/unidades/${ficha.id}/visitas/${visita.id}`)
            }
          />
        )}
      </section>

      <HubRefacciones
        unidadId={ficha.id}
        historial={hub.historialCerrado}
      />
    </>
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
    <section className="mt-4" aria-labelledby="hub-refacciones">
      <h2
        id="hub-refacciones"
        className="mb-1 text-sm font-semibold text-navy"
      >
        Refacciones
      </h2>
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
    </section>
  );
}
