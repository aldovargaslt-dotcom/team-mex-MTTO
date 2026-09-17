'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Note } from '@/components/ui/field';
import { UnitHealth } from '@/components/UnitHealth';
import { api, HttpError } from '@/lib/api';
import { etiquetaEstadoAviso, formatFecha, lineasCausaAvisoAndon } from '@/lib/format';
import { useRole } from '@/lib/role';
import type { AvisoAndon, UnidadHealth } from '@/lib/types';

export function AndonHubCard({
  unidadId,
  health,
  onOpenHealth,
  onAvisoChange,
  puedeCrearVisita,
  onNuevaVisita,
  creating,
}: {
  unidadId: string;
  health?: UnidadHealth | null;
  onOpenHealth?: () => void;
  onAvisoChange?: (aviso: AvisoAndon | null) => void;
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

  return (
    <section className="card panel hub-salud-alerta">
      <div className="hub-salud-alerta__head">
        <h2>Salud de la unidad</h2>
        {health ? (
          <UnitHealth
            health={health}
            variant="embedded"
            onOpen={onOpenHealth}
          />
        ) : null}
      </div>
      <h3 className="subhead">Alerta</h3>
      {aviso === undefined ? (
        <p className="muted">Cargando alerta…</p>
      ) : aviso == null ? (
        <p className="muted">Sin alerta de mantenimiento vencido.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={aviso.estado === 'ABIERTO' ? 'warning' : 'muted'}>
              {etiquetaEstadoAviso(aviso.estado)}
            </Badge>
            {aviso.tipoNombre ? (
              <span className="text-[13px]">{aviso.tipoNombre}</span>
            ) : null}
          </div>
          <div className="mt-1.5 grid gap-0.5 text-[13px]">
            {lineasCausaAvisoAndon(aviso).map((linea) => (
              <p key={linea}>{linea}</p>
            ))}
          </div>
          <p className="muted" style={{ marginTop: 6 }}>
            Último cierre:{' '}
            {aviso.lastClosedKm != null
              ? `${aviso.lastClosedKm.toLocaleString('es-MX')} km`
              : 'sin km'}
            {aviso.lastClosedAt ? ` · ${formatFecha(aviso.lastClosedAt)}` : ''}
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
              Enterado: la alerta queda vista in-app. La visita cerrada
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
