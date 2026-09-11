'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Note } from '@/components/ui/field';
import { api, HttpError } from '@/lib/api';
import { etiquetaEstadoAviso, formatFecha } from '@/lib/format';
import { useRole } from '@/lib/role';
import type { AvisoAndon } from '@/lib/types';

export function AndonHubCard({
  unidadId,
  puedeCrearVisita,
  onNuevaVisita,
  creating,
}: {
  unidadId: string;
  puedeCrearVisita?: boolean;
  onNuevaVisita?: () => void;
  creating?: boolean;
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
          : 'No se pudo cargar Andon.',
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

  return (
    <section className="card panel">
      <h2>Andon</h2>
      {aviso === undefined ? (
        <p className="muted">Cargando aviso…</p>
      ) : aviso == null ? (
        <p className="muted">Sin aviso de mantenimiento vencido.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={aviso.estado === 'ABIERTO' ? 'warning' : 'muted'}>
              {etiquetaEstadoAviso(aviso.estado)}
            </Badge>
            <span className="text-[13px]">
              {aviso.kmAlAbrir.toLocaleString('es-MX')} km / {aviso.diasAlAbrir} d
              desde la última visita cerrada
            </span>
          </div>
          <p className="muted" style={{ marginTop: 6 }}>
            Último cierre:{' '}
            {aviso.lastClosedKm != null
              ? `${aviso.lastClosedKm.toLocaleString('es-MX')} km`
              : 'sin km'}
            {aviso.lastClosedAt ? ` · ${formatFecha(aviso.lastClosedAt)}` : ''}
          </p>
          <p className="muted">
            Umbral {aviso.umbralKm.toLocaleString('es-MX')} km o {aviso.umbralDias}{' '}
            días · {aviso.tipoNombre}
          </p>
          <div className="hub-actions">
            {aviso.estado === 'ABIERTO' && !isAdmin ? (
              <Button
                type="button"
                variant="outline"
                className="h-11 min-h-11 min-w-[44px] md:h-11 md:min-h-11"
                disabled={busy}
                onClick={() => void enterado()}
              >
                {busy ? 'Marcando…' : 'Enterado'}
              </Button>
            ) : null}
            {puedeCrearVisita && onNuevaVisita ? (
              <Button
                type="button"
                disabled={creating}
                onClick={() => onNuevaVisita()}
              >
                {creating ? 'Creando…' : 'Nueva visita'}
              </Button>
            ) : null}
          </div>
          {aviso.estado === 'ENTERADO' ? (
            <Note>
              Enterado: se detuvieron los recordatorios. La visita cerrada
              resuelve.
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
  );
}
