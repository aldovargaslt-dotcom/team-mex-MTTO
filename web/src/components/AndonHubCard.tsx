'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FormAlert, Note } from '@/components/ui/field';
import { api, HttpError } from '@/lib/api';
import {
  explicacionAlertaAndon,
  formatFechaHoraCorta,
} from '@/lib/format';
import { useRole } from '@/lib/role';
import type { AvisoAndon } from '@/lib/types';

export function AndonHubCard({
  unidadId,
  puedeCrearVisita,
  onNuevaVisita,
  creating,
  maintenanceHint,
}: {
  unidadId: string;
  puedeCrearVisita?: boolean;
  onNuevaVisita?: () => void;
  creating?: boolean;
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
    setAviso(list[0] ?? null);
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

  const vencido = Boolean(aviso);
  const explicacion = aviso ? explicacionAlertaAndon(aviso) : null;

  return (
    <section className="card panel mb-3">
      <h2>{vencido ? (explicacion?.titulo ?? 'Mantenimiento atrasado') : 'Próximo mantenimiento'}</h2>
      {aviso === undefined ? (
        <p className="muted">Cargando…</p>
      ) : vencido ? (
        <>
          {explicacion?.vencidoHace ? (
            <p className="hub-ops-status">{explicacion.vencidoHace}</p>
          ) : null}
          <div className="grid gap-0.5 text-[13px]">
            {explicacion?.pasados.map((linea) => (
              <p key={linea}>{linea}</p>
            ))}
            {explicacion?.intervalos.map((linea) => (
              <p key={linea} className="muted">
                {linea}
              </p>
            ))}
          </div>
          {(puedeCrearVisita && onNuevaVisita) ||
          (aviso.estado === 'ABIERTO' && !isAdmin) ? (
            <div className="hub-actions">
              {puedeCrearVisita && onNuevaVisita ? (
                <Button
                  type="button"
                  disabled={creating}
                  onClick={() => onNuevaVisita()}
                >
                  {creating ? 'Creando…' : 'Nueva visita'}
                </Button>
              ) : null}
              {aviso.estado === 'ABIERTO' && !isAdmin ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void enterado()}
                >
                  {busy ? 'Marcando…' : 'Marcar como enterado'}
                </Button>
              ) : null}
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
      ) : (
        <p className="muted">{maintenanceHint ?? 'Sin servicio vencido.'}</p>
      )}
      <FormAlert>{error}</FormAlert>
    </section>
  );
}
