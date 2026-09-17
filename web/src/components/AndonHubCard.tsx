'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Note } from '@/components/ui/field';
import { api, HttpError } from '@/lib/api';
import {
  explicacionAlertaAndon,
  formatFechaCorta,
  formatFechaHoraCorta,
  formatKm,
} from '@/lib/format';
import { useRole } from '@/lib/role';
import type { AvisoAndon } from '@/lib/types';

export function AndonHubCard({
  unidadId,
  onAvisoChange,
  puedeCrearVisita,
  onNuevaVisita,
  creating,
  ultimoServicioAt,
  ultimoServicioKm,
  maintenanceHint,
}: {
  unidadId: string;
  onAvisoChange?: (aviso: AvisoAndon | null) => void;
  puedeCrearVisita?: boolean;
  onNuevaVisita?: () => void;
  creating?: boolean;
  ultimoServicioAt?: string | null;
  ultimoServicioKm?: number | null;
  maintenanceHint?: string | null;
}) {
  const { role, userId, isAdmin } = useRole();
  const [aviso, setAviso] = useState<AvisoAndon | null | undefined>(undefined);
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

  return (
    <div className="hub-ops-grid">
      <section className="card panel">
        <h2>Próximo mantenimiento</h2>
        <p className="hub-ops-title">Servicio preventivo</p>
        {aviso === undefined ? (
          <p className="muted">Cargando…</p>
        ) : vencido ? (
          <p className="hub-ops-status">{explicacion?.vencidoHace}</p>
        ) : (
          <p className="muted">
            {maintenanceHint ?? 'Sin servicio vencido.'}
          </p>
        )}
        <dl className="hub-ops-dl">
          <dt>Último servicio</dt>
          <dd>{formatFechaCorta(servicioAt)}</dd>
          <dt>Odómetro registrado</dt>
          <dd>{servicioKm != null ? formatKm(servicioKm) : 'Sin registro'}</dd>
        </dl>
        {puedeCrearVisita && onNuevaVisita && vencido ? (
          <div className="hub-actions">
            <Button
              type="button"
              disabled={creating}
              onClick={() => onNuevaVisita()}
            >
              {creating ? 'Creando…' : 'Nueva visita'}
            </Button>
          </div>
        ) : null}
      </section>

      <section className="card panel">
        <h2>Últimas alertas</h2>
        {aviso === undefined ? (
          <p className="muted">Cargando alerta…</p>
        ) : aviso == null ? (
          <p className="muted">Sin alerta de mantenimiento vencido.</p>
        ) : (
          <>
            <p className="hub-ops-title">{explicacion?.titulo}</p>
            {explicacion?.vencido ? (
              <p className="hub-ops-status">{explicacion.vencido}</p>
            ) : null}
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
            <div className="hub-actions">
              {aviso.estado === 'ABIERTO' && !isAdmin ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 min-h-11 min-w-[44px] md:h-11 md:min-h-11"
                  disabled={busy}
                  onClick={() => void enterado()}
                >
                  {busy ? 'Marcando…' : 'Marcar como enterado'}
                </Button>
              ) : null}
            </div>
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
