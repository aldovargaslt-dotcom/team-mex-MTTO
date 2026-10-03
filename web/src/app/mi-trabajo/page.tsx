'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api, HttpError } from '@/lib/api';
import { useRole } from '@/lib/role';

type Check = { id: string; folio: string; unidadId: string; status: string; version: number; assignedActor: string | null; startedAt: string | null };
type Queue = { items: Check[]; counts: { total: number; active: number } };

export default function MiTrabajoPage() {
  const { role, userId } = useRole();
  const [queue, setQueue] = useState<Queue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const cargar = useCallback(async () => {
    if (!role) return;
    try { setQueue(await api<Queue>('/checks?scope=mine-or-eligible', { role, userId })); setError(null); }
    catch (err) { setError(err instanceof HttpError ? err.message : 'No se pudo cargar Mi trabajo.'); }
  }, [role, userId]);
  useEffect(() => { void cargar(); }, [cargar]);

  async function command(check: Check, action: 'claim' | 'start') {
    setBusy(check.id); setError(null);
    try { await api(`/checks/${check.id}/${action}`, { role: role!, userId, method: 'POST', body: JSON.stringify({ expectedVersion: check.version }) }); await cargar(); }
    catch (err) { setError(err instanceof HttpError ? err.message : 'No se pudo actualizar el CHECK.'); }
    finally { setBusy(null); }
  }

  return <main className="mx-auto max-w-3xl space-y-4 p-4 pb-20">
    <header><p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Mecánico</p><h1 className="text-2xl font-semibold text-navy">Mi trabajo</h1><p className="text-sm text-muted-foreground">Toma un CHECK elegible o continúa uno asignado. Reclamar no inicia la captura.</p></header>
    {error ? <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{error}</p> : null}
    <div className="grid grid-cols-2 gap-3"><div className="rounded-lg border bg-card p-4"><p className="text-xs text-muted-foreground">CHECK visibles</p><p className="text-2xl font-semibold">{queue?.counts.total ?? '—'}</p></div><div className="rounded-lg border bg-card p-4"><p className="text-xs text-muted-foreground">Activos</p><p className="text-2xl font-semibold">{queue?.counts.active ?? '—'}</p></div></div>
    <section aria-labelledby="checks-title" className="space-y-3"><h2 id="checks-title" className="text-sm font-semibold text-navy">Chequeos</h2>{queue?.items.length ? <ul className="grid gap-3">{queue.items.map((check) => <li key={check.id} className="rounded-lg border bg-card p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-navy">{check.folio}</p><p className="text-sm text-muted-foreground">Unidad {check.unidadId}</p></div><Badge>{check.status}</Badge></div><div className="mt-3 flex flex-wrap gap-2">{check.status === 'PENDING' && !check.assignedActor ? <Button className="min-h-11" disabled={busy === check.id} onClick={() => void command(check, 'claim')}>{busy === check.id ? 'Tomando…' : 'Tomar CHECK'}</Button> : null}{check.status === 'ASSIGNED' && check.assignedActor === userId ? <Button className="min-h-11" disabled={busy === check.id} onClick={() => void command(check, 'start')}>{busy === check.id ? 'Iniciando…' : 'Iniciar captura'}</Button> : null}{check.status === 'IN_PROGRESS' && check.assignedActor === userId ? <Button asChild className="min-h-11"><Link href={`/checks/${check.id}`}>Continuar</Link></Button> : null}</div></li>)}</ul> : <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">No hay CHECK elegibles o asignados.</div>}</section>
  </main>;
}
