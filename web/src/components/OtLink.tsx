'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, HttpError } from '@/lib/api';
import type { VisitaDetalle } from '@/lib/types';
import { Button } from '@/components/ui/button';

type OtState = { status: 'loading' } | { status: 'available'; unidadId: string; numeroInterno: string }
  | { status: 'unavailable' | 'forbidden' | 'error' };
type OtLabels = { entries: Record<string, OtState>; retry: (id: string) => void };

export function useOtLabels(visitaIds: Array<string | null | undefined>, opts: { role?: string | null; userId?: string }): OtLabels {
  const idsKey = [...new Set(visitaIds.filter(Boolean))].sort().join(',');
  const key = JSON.stringify([opts.role, opts.userId, idsKey]);
  const [state, setState] = useState<{ key: string; entries: Record<string, OtState> }>({ key: '', entries: {} });
  const [retry, setRetry] = useState<{ id: string; attempt: number; key: string } | null>(null);
  useEffect(() => {
    let cancelled = false;
    const ids = !opts.role || !idsKey ? [] : idsKey.split(',');
    setState((current) => ({ key, entries: {
      ...(current.key === key ? current.entries : {}),
      ...Object.fromEntries(ids.map((id) => [id, { status: 'loading' } as OtState])),
    } }));
    for (const id of ids) {
      void api<VisitaDetalle>(`/visitas/${id}`, { role: opts.role!, userId: opts.userId }).then(
        (visit) => ({ status: 'available', unidadId: visit.unidadId, numeroInterno: visit.unidadNumeroInterno } as OtState),
        (error: unknown) => ({ status: error instanceof HttpError && error.status === 404 ? 'unavailable'
          : error instanceof HttpError && error.status === 403 ? 'forbidden' : 'error' } as OtState),
      ).then((entry) => { if (!cancelled) setState((current) => ({ key, entries: { ...current.entries, [id]: entry } })); });
    }
    return () => { cancelled = true; };
  }, [key, idsKey, opts.role, opts.userId]);
  useEffect(() => {
    if (!retry || retry.key !== key || !opts.role) return;
    let cancelled = false;
    const id = retry.id;
    setState((current) => ({ key, entries: { ...current.entries, [id]: { status: 'loading' } } }));
    void api<VisitaDetalle>(`/visitas/${id}`, { role: opts.role, userId: opts.userId }).then(
      (visit) => ({ status: 'available', unidadId: visit.unidadId, numeroInterno: visit.unidadNumeroInterno } as OtState),
      (error: unknown) => ({ status: error instanceof HttpError && error.status === 404 ? 'unavailable'
        : error instanceof HttpError && error.status === 403 ? 'forbidden' : 'error' } as OtState),
    ).then((entry) => { if (!cancelled) setState((current) => ({ key, entries: { ...current.entries, [id]: entry } })); });
    return () => { cancelled = true; };
  }, [retry, key, opts.role, opts.userId]);
  return { entries: state.key === key ? state.entries : {},
    retry: (id) => setRetry((current) => ({ key, id, attempt: (current?.attempt ?? 0) + 1 })) };
}

export function OtLink({ visitaId, labels }: { visitaId: string | null | undefined; labels: OtLabels }) {
  const [retried, setRetried] = useState(false);
  if (!visitaId) return <span className="text-muted-foreground">—</span>;
  const state = labels.entries[visitaId];
  const retryButton = <Button type="button" variant="outline" size="compact" aria-disabled={!state || state.status === 'loading'} onClick={(e) => { e.stopPropagation(); if (!state || state.status === 'loading') return; setRetried(true); labels.retry(visitaId); }}>Reintentar referencia</Button>;
  if (state?.status === 'available') return (<span className="ot-reference">
    <Link href={`/unidades/${state.unidadId}/visitas/${visitaId}`} className="font-medium text-navy underline-offset-2 hover:underline" onClick={(e) => e.stopPropagation()}>
      OT · {state.numeroInterno}
    </Link>{retried ? retryButton : null}</span>
  );
  const loading = !state || state.status === 'loading';
  return (
    <span className="ot-reference" aria-busy={loading}>
      <span role="status">{loading ? 'Cargando referencia…' : state.status === 'unavailable'
        ? 'Referencia de visita no disponible para este acceso.' : state.status === 'forbidden'
          ? 'No tienes acceso a esta visita.' : 'No se pudo consultar la referencia de visita.'}</span>{' '}
      <span className="ot-reference-id">ID: {visitaId}</span>{' '}
      {retried || state?.status === 'error' ? retryButton : null}
    </span>
  );
}
