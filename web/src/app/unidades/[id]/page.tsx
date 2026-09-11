'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { RoleGate } from '@/components/RoleGate';
import { StatusBadge } from '@/components/StatusBadge';
import { api, HttpError } from '@/lib/api';
import { useRole } from '@/lib/role';
import type { UnidadHub } from '@/lib/types';

export default function HubPage() {
  return (
    <RoleGate>
      <HubContent />
    </RoleGate>
  );
}

function HubContent() {
  const params = useParams<{ id: string }>();
  const { role, userId, isAdmin } = useRole();
  const [hub, setHub] = useState<UnidadHub | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [soon, setSoon] = useState(false);

  useEffect(() => {
    if (!role || !params.id) return;
    void (async () => {
      try {
        setHub(
          await api<UnidadHub>(`/unidades/${params.id}/hub`, { role, userId }),
        );
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
  }, [params.id, role, userId]);

  if (notFound) {
    return (
      <div className="empty-state">
        <h2>No se encontró la unidad</h2>
        <p className="muted">
          Es posible que el identificador sea incorrecto o que la unidad ya no
          exista en el catálogo.
        </p>
        <Link className="btn btn-primary" href="/unidades">
          Volver al listado
        </Link>
      </div>
    );
  }

  if (error) {
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

  return (
    <>
      <div className="page-head">
        <div>
          <p className="muted">Hub de unidad</p>
          <h1>
            {ficha.numeroInterno}{' '}
            <StatusBadge estado={ficha.estado} />
          </h1>
          <p className="lede">
            {ficha.tipoNombre}
            {ficha.marcaModelo ? ` · ${ficha.marcaModelo}` : ''}
          </p>
        </div>
        <Link className="btn btn-secondary" href="/unidades">
          Volver
        </Link>
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
          <p>{hub.mantenimiento.mensajeHistorial}</p>
          <p className="note">{hub.mantenimiento.mensajeResumen}</p>
          <p className="muted" style={{ marginTop: 12 }}>
            Última visita:{' '}
            {hub.mantenimiento.ultimaVisita
              ? hub.mantenimiento.ultimaVisita
              : 'sin registros todavía'}
          </p>
          <div className="hub-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!hub.puedeCrearVisita}
              onClick={() => setSoon(true)}
            >
              Nueva visita
            </button>
          </div>
          {!hub.puedeCrearVisita ? (
            <p className="note note-warn">{hub.mensaje}</p>
          ) : (
            <p className="note">{hub.mensaje}</p>
          )}
          {soon ? (
            <p className="soon">
              Próximamente. El registro de visitas de mantenimiento estará
              disponible en una siguiente entrega.
            </p>
          ) : null}
        </section>
      </div>
    </>
  );
}
