'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api, HttpError } from '@/lib/api';
import { useRole } from '@/lib/role';

type Check = { id: string; folio: string; unidadId: string; status: string; version: number; assignedActor: string | null; startedAt: string | null };
type Queue = { items: Check[]; counts: { total: number; active: number } };
type UnitIdentity = { numeroInterno: string; placas: string };

export default function MiTrabajoPage() {
  const { role, userId } = useRole();
  const [queue, setQueue] = useState<Queue | null>(null);
  const [units, setUnits] = useState<Record<string, UnitIdentity>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const cargar = useCallback(async () => {
    if (!role) return;
    try {
      const next = await api<Queue>('/checks?scope=mine-or-eligible', { role, userId });
      const identities = await Promise.all([...new Set(next.items.map((check) => check.unidadId))].map(async (unidadId) => {
        const identity = await api<UnitIdentity>(`/unidades/${unidadId}`, { role, userId }).catch(() => null);
        return identity ? [unidadId, identity] as const : null;
      }));
      setUnits(Object.fromEntries(identities.filter((entry): entry is readonly [string, UnitIdentity] => entry !== null)));
      setQueue(next); setError(null);
    }
    catch (err) {
      setQueue(null);
      setUnits({});
      setError(err instanceof HttpError ? err.message : 'No se pudo cargar Mi trabajo.');
    }
  }, [role, userId]);
  useEffect(() => { void cargar(); }, [cargar]);

  async function command(check: Check, action: 'claim' | 'start') {
    setBusy(check.id); setError(null);
    try { await api(`/checks/${check.id}/${action}`, { role: role!, userId, method: 'POST', body: JSON.stringify({ expectedVersion: check.version }) }); await cargar(); }
    catch (err) { setError(err instanceof HttpError ? err.message : 'No se pudo actualizar el CHECK.'); }
    finally { setBusy(null); }
  }

  return <main className="mx-auto min-h-[calc(100dvh-4rem)] w-full max-w-[1040px] space-y-4 px-3 py-4 pb-24 sm:px-4">
    <header className="border-b pb-3">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mecánico · Mi turno</p><h1 className="mt-1 text-[20px] font-semibold leading-6 text-navy">Mi bandeja de trabajo</h1><p className="mt-1 text-sm text-muted-foreground">Chequeos operativos asignados y disponibles en tu patio.</p></div>
        <Badge variant="secondary">{queue?.counts.active ?? '—'} activos</Badge>
      </div>
    </header>
    {error ? <div role="alert" className="flex items-center justify-between gap-3 rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900"><p>{error}</p><Button type="button" variant="secondary" className="min-h-10 shrink-0" onClick={() => void cargar()}>Reintentar</Button></div> : null}
    <section aria-labelledby="checks-title" className="space-y-3"><div className="flex items-center justify-between border-b pb-2"><h2 id="checks-title" className="text-sm font-semibold text-navy">Cola de chequeos</h2><span className="text-xs text-muted-foreground">{queue?.counts.total ?? '—'} visibles</span></div>{!queue && !error ? <p aria-live="polite" className="py-4 text-sm text-muted-foreground">Cargando chequeos…</p> : queue?.items.length ? <ul className="grid gap-3 lg:grid-cols-2">{queue.items.map((check) => {
      const own = check.assignedActor === userId;
      const inProgress = check.status === 'IN_PROGRESS';
      const identity = units[check.unidadId];
      const compactFolio = check.folio.replace(/^(CHK-[0-9a-f]{8})-[0-9a-f-]+$/i, '$1…');
      const statusLabel = check.status === 'IN_PROGRESS' ? 'En progreso' : check.status === 'ASSIGNED' ? 'Asignado' : check.status === 'PENDING' ? 'Pendiente' : check.status;
      const action = check.status === 'PENDING' && !check.assignedActor ? 'claim' : check.status === 'ASSIGNED' && own ? 'start' : null;
      return <li key={check.id} className={`rounded-md border bg-card p-3 ${inProgress && own ? 'border-2 border-primary' : ''}`}>
        <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Badge variant={inProgress ? 'success' : check.status === 'PENDING' ? 'warning' : 'secondary'}>{statusLabel}</Badge>{inProgress && check.startedAt ? <span className="text-xs text-muted-foreground">Iniciado {new Date(check.startedAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span> : null}</div><span className="max-w-32 truncate font-mono text-xs text-muted-foreground" title={check.folio}>{compactFolio}</span></div>
        <div className="mt-2 flex items-start justify-between gap-3 border-b pb-2"><div><h3 className="text-lg font-semibold text-navy">{identity?.numeroInterno ?? 'Unidad'}</h3><p className="text-sm text-muted-foreground">{identity?.placas ?? 'Identificando unidad'} · Chequeo operativo</p></div></div>
        <div className="mt-2 flex items-center justify-between bg-muted/40 px-3 py-2 text-sm"><span className="text-xs text-muted-foreground">Siguiente acción</span><span className="font-medium">{inProgress ? 'Continuar captura' : action === 'claim' ? 'Tomar chequeo' : action === 'start' ? 'Iniciar captura' : 'En espera'}</span></div>
        <div className="mt-3">{action === 'claim' ? <Button className="min-h-11 w-full" disabled={busy === check.id} onClick={() => void command(check, 'claim')}>{busy === check.id ? 'Tomando…' : 'Tomar chequeo'}</Button> : null}{action === 'start' ? <Button className="min-h-11 w-full" disabled={busy === check.id} onClick={() => void command(check, 'start')}>{busy === check.id ? 'Iniciando…' : 'Iniciar chequeo'}</Button> : null}{inProgress && own ? <Button asChild className="min-h-11 w-full min-w-0"><Link href={`/checks/${check.id}`} className="min-w-0 truncate" title={check.folio}>Continuar chequeo ({compactFolio})</Link></Button> : null}</div>
      </li>;
    })}</ul> : queue ? <p className="py-4 text-sm text-muted-foreground">No hay chequeos elegibles o asignados en este momento.</p> : null}</section>
  </main>;
}
