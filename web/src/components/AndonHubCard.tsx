'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Check, ChevronRight, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Note } from '@/components/ui/field';
import { api, HttpError } from '@/lib/api';
import {
  explicacionAlertaAndon,
  formatFechaCorta,
  formatFechaHoraCorta,
  formatKm,
  fraseCuenta,
  etiquetaIntervaloMantenimiento,
} from '@/lib/format';
import { useRole } from '@/lib/role';
import { cn } from '@/lib/utils';
import type { AvisoAndon, UmbralAndon, UnidadHealth } from '@/lib/types';

export function AndonHubCard({
  unidadId,
  tipoId,
  onAvisoChange,
  ultimoServicioAt,
  ultimoServicioKm,
  health,
}: {
  unidadId: string;
  tipoId: string;
  onAvisoChange?: (aviso: AvisoAndon | null) => void;
  ultimoServicioAt?: string | null;
  ultimoServicioKm?: number | null;
  health?: UnidadHealth | null;
}) {
  const { role, userId, isAdmin } = useRole();
  const [aviso, setAviso] = useState<AvisoAndon | null | undefined>(undefined);
  const [umbral, setUmbral] = useState<UmbralAndon | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function cargar() {
    const list = await api<AvisoAndon[]>(
      `/andon/avisos?unidadId=${encodeURIComponent(unidadId)}`,
      { role: role!, userId },
    );
    const next = list[0] ?? null;
    setAviso(next);
    onAvisoChange?.(next);
  }

  useEffect(() => {
    if (!role || !unidadId) return;
    void cargar().catch((err) => {
      setError(
        err instanceof HttpError
          ? err.message
          : 'No se pudo cargar la alerta.',
      );
      setAviso(null);
      onAvisoChange?.(null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, userId, unidadId]);

  useEffect(() => {
    if (!role || !tipoId) return;
    void api<UmbralAndon[]>('/andon/umbrales', { role, userId })
      .then((list) => {
        setUmbral(list.find((item) => item.tipoVehiculoId === tipoId) ?? null);
      })
      .catch(() => {
        setUmbral(null);
      });
  }, [role, userId, tipoId]);

  async function enterado() {
    if (!aviso) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/andon/avisos/${aviso.id}/enterado`, {
        role: role!,
        userId,
        method: 'POST',
      });
      await cargar();
    } catch (err) {
      setError(
        err instanceof HttpError ? err.message : 'No se pudo marcar enterado.',
      );
    } finally {
      setBusy(false);
    }
  }

  const servicioAt = aviso?.lastClosedAt ?? ultimoServicioAt ?? null;
  const servicioKm =
    aviso?.lastClosedKm != null ? aviso.lastClosedKm : ultimoServicioKm;
  const vencido = Boolean(aviso);
  const explicacion = aviso ? explicacionAlertaAndon(aviso) : null;
  const dueDriver = health?.drivers.find(
    (d) => d.type === 'MAINTENANCE_DUE' || d.type === 'MAINTENANCE_OVERDUE',
  );
  const hayHistorial = Boolean(servicioAt || servicioKm != null);
  const mttoTone = vencido || dueDriver?.type === 'MAINTENANCE_OVERDUE'
    ? 'is-overdue'
    : dueDriver?.type === 'MAINTENANCE_DUE'
      ? 'is-due'
      : hayHistorial
        ? 'is-ok'
        : '';
  const intervalo =
    umbral != null
      ? etiquetaIntervaloMantenimiento(umbral.tKm, umbral.tDias)
      : aviso
        ? etiquetaIntervaloMantenimiento(aviso.umbralKm, aviso.umbralDias)
        : null;
  const mttoHref = `/unidades/${unidadId}?vista=mantenimiento`;

  return (
    <div className="hub-ops-grid">
      <section className={cn('card panel hub-ops-card', mttoTone)}>
        <div className="hub-ops-card__head">
          <h2>Próximo mantenimiento</h2>
          <Link
            href={mttoHref}
            className="hub-ops-go"
            aria-label="Ver mantenimiento"
          >
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        </div>
        <p className="hub-ops-title">Servicio preventivo</p>
        {aviso === undefined ? (
          <p className="muted">Cargando…</p>
        ) : !hayHistorial && !vencido ? (
          <p className="hub-ops-status">Sin mantenimiento programado</p>
        ) : vencido ? (
          <p className="hub-ops-status">{explicacion?.vencidoHace}</p>
        ) : (
          <p className="hub-ops-status">
            {dueDriver?.message ?? 'Al corriente'}
          </p>
        )}
        {intervalo ? (
          <p className="muted">Intervalo: {intervalo}</p>
        ) : null}
        {aviso && aviso.kmAlAbrir > 0 && aviso.umbralKm > 0 ? (
          <p className="hub-ops-progress">
            <span className="mono">
              {formatKm(aviso.kmAlAbrir)} / {formatKm(aviso.umbralKm)}
            </span>
            <span className="hub-ops-bar" aria-hidden>
              <span
                className="hub-ops-bar__fill"
                style={{
                  width: `${Math.min(100, Math.round((aviso.kmAlAbrir / aviso.umbralKm) * 100))}%`,
                }}
              />
            </span>
          </p>
        ) : null}
        <dl className="hub-ops-dl">
          <dt>Último servicio</dt>
          <dd>
            {formatFechaCorta(servicioAt)}
            {servicioKm != null ? ` · ${formatKm(servicioKm)}` : ''}
          </dd>
        </dl>
      </section>

      <section className={cn('card panel hub-ops-card', vencido && 'is-overdue')}>
        <div className="hub-ops-card__head">
          <h2>Últimas alertas</h2>
          {aviso ? (
            <span className="hub-ops-count">
              {fraseCuenta(1, 'alerta activa', 'alertas activas')}
            </span>
          ) : null}
          <Link href="/andon" className="hub-ops-go" aria-label="Ver alertas">
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        </div>
        {aviso === undefined ? (
          <p className="muted">Cargando alerta…</p>
        ) : aviso == null ? (
          <div className="hub-ops-empty">
            <p className="hub-ops-empty__title">
              <Check className="size-4" aria-hidden />
              Sin alertas activas
            </p>
            <p className="muted">
              La unidad no requiere atención actualmente.
            </p>
          </div>
        ) : (
          <>
            <p className="hub-ops-title">
              <TriangleAlert className="size-3.5" aria-hidden />
              {explicacion?.titulo}
            </p>
            <div className="mt-1.5 grid gap-0.5 text-[13px]">
              {explicacion?.pasados.map((linea) => (
                <p key={linea}>{linea}</p>
              ))}
              {explicacion?.intervalos.map((linea) => (
                <p key={linea} className="muted">
                  {linea}
                </p>
              ))}
            </div>
            {explicacion?.vencido ? (
              <p className="hub-ops-status mt-1.5">{explicacion.vencido}</p>
            ) : null}
            {aviso.estado === 'ABIERTO' && !isAdmin ? (
              <div className="hub-actions">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void enterado()}
                >
                  {busy ? 'Marcando…' : 'Marcar como enterado'}
                </Button>
              </div>
            ) : null}
            {aviso.estado === 'ENTERADO' ? (
              <Note>
                Enterado
                {aviso.enteradoAt
                  ? ` · ${formatFechaHoraCorta(aviso.enteradoAt)}`
                  : ''}
                . La alerta sigue activa; la visita cerrada resuelve.
              </Note>
            ) : null}
          </>
        )}
        {error ? (
          <p className="alert" style={{ marginTop: 8 }}>
            {error}
          </p>
        ) : null}
      </section>
    </div>
  );
}
