'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AndonHubCard } from '@/components/AndonHubCard';
import { StatusBadge } from '@/components/StatusBadge';
import { Note } from '@/components/ui/field';
import {
  etiquetaEstadoVisita,
  etiquetaTipoVisita,
  formatFechaCorta,
  formatFechaHoraCorta,
  formatKm,
} from '@/lib/format';
import type { AvisoAndon, UnidadHealth, UnidadHub } from '@/lib/types';

const MENSAJE_PUEDE_REGISTRAR =
  'Puede registrar una nueva visita de mantenimiento.';
const MENSAJE_ADMIN_SIN_VISITA =
  'El administrador directivo no puede crear visitas de mantenimiento.';

type ActivityItem = {
  key: string;
  at: string;
  title: string;
  detail: string;
  href?: string;
};

function activityItems(
  hub: UnidadHub,
  aviso: AvisoAndon | null,
): ActivityItem[] {
  const items: ActivityItem[] = [];
  if (aviso) {
    items.push({
      key: `aviso-${aviso.id}`,
      at: aviso.abiertaAt,
      title: 'Alerta de mantenimiento',
      detail: 'Mantenimiento atrasado',
      href: '/andon',
    });
  }
  for (const visita of hub.historialCerrado) {
    items.push({
      key: `cerrada-${visita.id}`,
      at: visita.cerradoAt ?? visita.updatedAt,
      title: 'Visita de mantenimiento',
      detail: `${etiquetaTipoVisita(visita.tipo)} · ${etiquetaEstadoVisita(visita.estado)}`,
      href: `/unidades/${hub.fichaCorta.id}/visitas/${visita.id}`,
    });
  }
  for (const visita of hub.borradores) {
    items.push({
      key: `borrador-${visita.id}`,
      at: visita.updatedAt,
      title: 'Visita de mantenimiento',
      detail: `Borrador · ${etiquetaTipoVisita(visita.tipo)}`,
      href: `/unidades/${hub.fichaCorta.id}/visitas/${visita.id}`,
    });
  }
  return items
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 5);
}

export function HubResumen({
  hub,
  health,
}: {
  hub: UnidadHub;
  health: UnidadHealth | null;
}) {
  const [aviso, setAviso] = useState<AvisoAndon | null>(null);
  const ficha = hub.fichaCorta;
  const ultimoServicioAt = hub.historialCerrado[0]?.cerradoAt ?? null;
  const mensajes = hub.mensajes.filter(
    (m) => m !== MENSAJE_PUEDE_REGISTRAR && m !== MENSAJE_ADMIN_SIN_VISITA,
  );
  const warn = mensajes.some(
    (m) => /inactiva/i.test(m) || /choferes/i.test(m),
  );
  const recent = activityItems(hub, aviso);

  return (
    <>
      <AndonHubCard
        unidadId={ficha.id}
        tipoId={ficha.tipoId}
        onAvisoChange={setAviso}
        ultimoServicioAt={ultimoServicioAt}
        ultimoServicioKm={ficha.ultimoKm}
        health={health}
      />

      <section className="card panel" style={{ marginBottom: 12 }}>
        <h2>Estado y operación</h2>
        <div className="hub-facts">
          <div>
            <p className="hub-facts__kicker">Estado</p>
            <div className="hub-facts__value">
              <StatusBadge estado={ficha.estado} />
            </div>
            {ficha.motivoInactivacion === 'ENVIO_ESPECIAL' ? (
              <p className="hub-facts__meta">Envío especial</p>
            ) : null}
          </div>
          <div>
            <p className="hub-facts__kicker">Último kilometraje</p>
            <p className="hub-facts__value">
              {ficha.ultimoKm != null ? formatKm(ficha.ultimoKm) : 'Sin registro'}
            </p>
            <p className="hub-facts__meta">
              {ultimoServicioAt
                ? `Registrado: ${formatFechaCorta(ultimoServicioAt)}`
                : 'Sin visita cerrada'}
            </p>
          </div>
        </div>
      </section>

      <div className="hub-resumen-lower">
        <section className="card panel">
          <h2>Información técnica</h2>
          <dl className="dl">
            <dt>Marca / modelo</dt>
            <dd>{ficha.marcaModelo || 'Sin marca / modelo'}</dd>
            <dt>Año</dt>
            <dd>{ficha.anio ?? 'Sin año registrado'}</dd>
            <dt>Tipo</dt>
            <dd>{ficha.tipoNombre}</dd>
            {ficha.vin ? (
              <>
                <dt>VIN</dt>
                <dd className="mono">{ficha.vin}</dd>
              </>
            ) : null}
          </dl>
        </section>
        <section className="card panel">
          <div className="hub-ops-card__head">
            <h2>Actividad reciente</h2>
            <Link
              href={`/unidades/${ficha.id}?vista=historial`}
              className="hub-ops-go text-[12px] font-medium"
            >
              Ver historial
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="muted">Aún no hay actividad registrada.</p>
          ) : (
            <ul className="hub-activity">
              {recent.map((item) => (
                <li key={item.key}>
                  {item.href ? (
                    <Link href={item.href}>
                      <strong>{item.title}</strong>
                      <div className="muted">
                        {formatFechaHoraCorta(item.at)}
                        {' · '}
                        {item.detail}
                      </div>
                    </Link>
                  ) : (
                    <>
                      <strong>{item.title}</strong>
                      <div className="muted">
                        {formatFechaHoraCorta(item.at)}
                        {' · '}
                        {item.detail}
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {mensajes.map((mensaje) => (
        <Note key={mensaje} variant={warn ? 'warn' : 'default'}>
          {mensaje}
        </Note>
      ))}
    </>
  );
}
