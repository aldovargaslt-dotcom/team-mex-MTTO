'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { api, HttpError } from '@/lib/api';
import {
  combinarAvisosUnidad,
  conteoCategorias,
  fraseDeltaVsCada,
  intervalosCadencia,
  mixTipoVisitas,
  recurrenciaTrabajos,
  resumenAndonUnidad,
  topRefacciones,
  type RecurrenciaTrabajo,
  type TopRefaccion,
} from '@/lib/conducta';
import {
  etiquetaEstadoAviso,
  etiquetaOrigenPieza,
  etiquetaTipoVisita,
  etiquetaUom,
  formatFecha,
  fraseCuenta,
  fraseDemoraAviso,
  lineasOvershootAvisoAndon,
} from '@/lib/format';
import { useRole } from '@/lib/role';
import type {
  AvisoAndon,
  ItemInventario,
  UmbralAndon,
  VisitaResumen,
} from '@/lib/types';

export function HubConducta({
  unidadId,
  tipoId,
  historial,
}: {
  unidadId: string;
  tipoId: string;
  historial: VisitaResumen[];
}) {
  const { role, userId } = useRole();
  const [umbral, setUmbral] = useState<UmbralAndon | null>(null);
  const [avisos, setAvisos] = useState<AvisoAndon[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [labels, setLabels] = useState<
    Record<string, { sku: string; nombre: string; uom?: string }>
  >({});

  const intervalos = useMemo(
    () =>
      intervalosCadencia(
        historial,
        umbral ? { tKm: umbral.tKm, tDias: umbral.tDias } : null,
      ),
    [historial, umbral],
  );
  const mix = useMemo(() => mixTipoVisitas(historial), [historial]);
  const trabajos = useMemo(() => recurrenciaTrabajos(historial), [historial]);
  const categorias = useMemo(() => conteoCategorias(trabajos), [trabajos]);
  const refacciones = useMemo(() => topRefacciones(historial), [historial]);
  const andon = useMemo(
    () => resumenAndonUnidad(avisos ?? []),
    [avisos],
  );

  const idsKey = refacciones
    .map((row) => row.itemId)
    .sort()
    .join(',');

  useEffect(() => {
    if (!role || !unidadId) return;
    let cancelled = false;
    void (async () => {
      try {
        const [umbrales, pendientes, resueltos] = await Promise.all([
          api<UmbralAndon[]>('/andon/umbrales', { role, userId }),
          api<AvisoAndon[]>(
            `/andon/avisos?unidadId=${encodeURIComponent(unidadId)}`,
            { role, userId },
          ),
          api<AvisoAndon[]>(
            `/andon/avisos?unidadId=${encodeURIComponent(unidadId)}&estado=RESUELTO`,
            { role, userId },
          ),
        ]);
        if (cancelled) return;
        setUmbral(umbrales.find((u) => u.tipoVehiculoId === tipoId) ?? null);
        setAvisos(combinarAvisosUnidad(pendientes, resueltos));
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof HttpError
            ? err.message
            : 'No se pudo cargar la conducta de la unidad.',
        );
        setAvisos([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [role, userId, unidadId, tipoId]);

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

  const trabajoColumns: ColumnDef<RecurrenciaTrabajo, unknown>[] = useMemo(
    () => [
      {
        accessorKey: 'categoria',
        header: 'Cat.',
        cell: ({ row }) => (
          <span className="mono font-medium">{row.original.categoria}</span>
        ),
      },
      {
        accessorKey: 'item',
        header: 'Trabajo',
      },
      {
        accessorKey: 'veces',
        header: 'Veces',
        cell: ({ row }) => (
          <span className="mono">{row.original.veces}</span>
        ),
      },
    ],
    [],
  );

  const refaccionColumns: ColumnDef<TopRefaccion, unknown>[] = useMemo(
    () => [
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
        id: 'origen',
        header: 'Origen',
        cell: ({ row }) =>
          row.original.origenes.map(etiquetaOrigenPieza).join(' · '),
      },
    ],
    [labels],
  );

  return (
    <section className="card panel" style={{ marginTop: 12 }}>
      <h2>Conducta</h2>
      {error ? (
        <p className="alert" style={{ marginBottom: 8 }}>
          {error}
        </p>
      ) : null}

      <h3 className="subhead" style={{ marginTop: 4 }}>
        Cadencia
      </h3>
      {umbral ? (
        <p className="muted" style={{ marginBottom: 8 }}>
          {`Intervalo del tipo: cada ${umbral.tKm.toLocaleString('es-MX')} km · cada ${umbral.tDias.toLocaleString('es-MX')} días`}
        </p>
      ) : null}
      {intervalos.length === 0 ? (
        <p className="muted">
          Se necesitan al menos dos visitas cerradas para ver la cadencia.
        </p>
      ) : (
        <ul className="visit-list">
          {intervalos.map((row) => {
            const km = fraseDeltaVsCada(row.deltaKm, row.tKm, 'km');
            const dias = fraseDeltaVsCada(row.deltaDias, row.tDias, 'días');
            const rebaso = km.rebaso === true || dias.rebaso === true;
            return (
              <li key={row.key}>
                <Link href={`/unidades/${unidadId}/visitas/${row.visitaId}`}>
                  <strong>
                    {etiquetaTipoVisita(row.tipo)} · {formatFecha(row.cerradoAt)}
                  </strong>
                  <div className="muted">{km.texto}</div>
                  <div className="muted">{dias.texto}</div>
                </Link>
                {km.rebaso != null || dias.rebaso != null ? (
                  <Badge variant={rebaso ? 'warning' : 'success'}>
                    {rebaso ? 'Rebasó' : 'Dentro'}
                  </Badge>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <h3 className="subhead">Mix</h3>
      {mix.total === 0 ? (
        <p className="muted">Aún no hay visitas cerradas.</p>
      ) : (
        <p className="text-[14px]">
          {fraseCuenta(mix.predictivo, 'predictivo', 'predictivos')}
          {' · '}
          {fraseCuenta(mix.correctivo, 'correctivo', 'correctivos')}
          {mix.sinTipo > 0
            ? ` · ${fraseCuenta(mix.sinTipo, 'sin tipo', 'sin tipo')}`
            : null}
        </p>
      )}

      <h3 className="subhead">Trabajos</h3>
      {categorias.length > 0 ? (
        <p className="muted" style={{ marginBottom: 8 }}>
          {categorias
            .map((c) => `${c.categoria} ${c.veces}`)
            .join(' · ')}
        </p>
      ) : null}
      {trabajos.length === 0 ? (
        <p className="muted">Aún no hay trabajos en visitas cerradas.</p>
      ) : (
        <DataTable columns={trabajoColumns} data={trabajos} />
      )}

      <h3 className="subhead">Top refacciones</h3>
      {refacciones.length === 0 ? (
        <p className="muted">Aún no hay refacciones en visitas cerradas.</p>
      ) : (
        <DataTable columns={refaccionColumns} data={refacciones} />
      )}

      <h3 className="subhead">Andon</h3>
      {avisos == null ? (
        <p className="muted">Cargando avisos…</p>
      ) : andon.total === 0 ? (
        <p className="muted">Sin avisos Andon en esta unidad.</p>
      ) : (
        <div className="grid gap-1.5 text-[14px]">
          <p>
            {fraseCuenta(andon.total, 'aviso', 'avisos')}
            {' · '}
            {andon.abiertos > 0
              ? fraseCuenta(andon.abiertos, 'abierto', 'abiertos')
              : 'ninguno abierto'}
            {andon.resueltos > 0
              ? ` · ${fraseCuenta(andon.resueltos, 'resuelto', 'resueltos')}`
              : null}
          </p>
          {andon.vigente ? (
            <VigenteAndon aviso={andon.vigente} />
          ) : (
            <p className="muted">Ningún aviso abierto.</p>
          )}
          {andon.resueltosConDemora.slice(0, 3).map((aviso) => {
            const demora = fraseDemoraAviso(aviso);
            return (
              <p key={aviso.id} className="muted">
                {demora ?? 'Resuelto'}
                {aviso.resueltoAt ? ` · ${formatFecha(aviso.resueltoAt)}` : ''}
              </p>
            );
          })}
        </div>
      )}
    </section>
  );
}

function VigenteAndon({ aviso }: { aviso: AvisoAndon }) {
  const overshoot = lineasOvershootAvisoAndon(aviso);
  return (
    <>
      <p>
        <Badge variant={aviso.estado === 'ABIERTO' ? 'warning' : 'muted'}>
          {etiquetaEstadoAviso(aviso.estado)}
        </Badge>
      </p>
      {overshoot.map((linea) => (
        <p key={linea} className="text-[13px]">
          {linea}
        </p>
      ))}
      {overshoot.length === 0 ? (
        <p className="muted">Abrió al cumplir el intervalo.</p>
      ) : null}
    </>
  );
}
