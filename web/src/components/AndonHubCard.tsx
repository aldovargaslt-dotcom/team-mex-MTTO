'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Note } from '@/components/ui/field';
import { api, HttpError } from '@/lib/api';
import { etiquetaEstadoAviso, formatFecha, lineasCausaAvisoAndon } from '@/lib/format';
import { useRole } from '@/lib/role';
import type { AvisoAndon } from '@/lib/types';

export function AndonHubCard({ unidadId }: { unidadId: string }) {
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

  if (aviso === undefined) {
    return <p className="muted mb-3">Cargando aviso…</p>;
  }

  if (aviso == null) {
    return (
      <>
        <p className="muted mb-3">Sin aviso de mantenimiento vencido.</p>
        {error ? <p className="alert mb-3">{error}</p> : null}
      </>
    );
  }

  return (
    <section className="card panel mb-3">
      <h2>Andon</h2>
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
      {aviso.estado === 'ABIERTO' && !isAdmin ? (
        <div className="hub-actions">
          <Button
            type="button"
            variant="outline"
            className="h-11 min-h-11 min-w-[44px] md:h-11 md:min-h-11"
            disabled={busy}
            onClick={() => void enterado()}
          >
            {busy ? 'Marcando…' : 'Enterado'}
          </Button>
        </div>
      ) : null}
      {aviso.estado === 'ENTERADO' ? (
        <Note>
          Enterado: el aviso queda visto in-app. La visita cerrada resuelve.
        </Note>
      ) : null}
      {error ? (
        <p className="alert" style={{ marginTop: 8 }}>
          {error}
        </p>
      ) : null}
    </section>
  );
}
