'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, AlertTriangle, List, Package, ReceiptText, Settings, Wrench } from 'lucide-react';
import { ReadStatus } from '@/components/ReadStatus';
import { useReadResource } from '@/lib/use-read-resource';
import { RoleGate } from '@/components/RoleGate';
import { ListFilter } from '@/components/ListFilter';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/field';
import { api } from '@/lib/api';
import { saludoAhora } from '@/lib/format';
import { INBOX_CHANGED } from '@/lib/inbox';
import { useRole } from '@/lib/role';
import { cn } from '@/lib/utils';
import type { AttentionResponse, ActiveAttention } from '@/lib/types';

type Area = 'TODOS' | 'MANTENIMIENTO' | 'INVENTARIO' | 'COMPRAS';

const FILTER_KIND = { MANTENIMIENTO: 'maintenance', INVENTARIO: 'stock', COMPRAS: 'purchase' } as const;
const AREA_LABEL = { MANTENIMIENTO: 'Mantenimiento', INVENTARIO: 'Inventario', COMPRAS: 'Compras' } as const;

export default function InicioPage() {
  return (
    <RoleGate allow={['SUPERVISOR', 'ADMIN_DIRECTIVO']}>
      <Suspense fallback={<p className="muted">Cargando alertas…</p>}>
        <InicioContent />
      </Suspense>
    </RoleGate>
  );
}

function InicioContent() {
  const { role, userId, displayName } = useRole();
  const router = useRouter();
  const params = useSearchParams();
  const rawArea = params.get('area');
  const area: Area = rawArea === 'FLOTA' ? 'MANTENIMIENTO' : rawArea === 'MANTENIMIENTO' || rawArea === 'INVENTARIO' || rawArea === 'COMPRAS' ? rawArea : 'TODOS';
  const [saludo, setSaludo] = useState('Hola');
  const [reload, setReload] = useState(0);
  const read = useReadResource(role ? JSON.stringify([role, userId, reload, 'active-alerts']) : null,
    () => api<AttentionResponse>('/configuracion/alertas/activas', { role: role!, userId }), true);
  const data = read.data;
  useEffect(() => { setSaludo(saludoAhora()); }, []);

  useEffect(() => {
    const refresh = () => setReload((value) => value + 1);
    const visible = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('focus', refresh);
    window.addEventListener(INBOX_CHANGED, refresh);
    document.addEventListener('visibilitychange', visible);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener(INBOX_CHANGED, refresh);
      document.removeEventListener('visibilitychange', visible);
    };
  }, []);

  const failed = data?.sources.filter((source) => source.status === 'error') ?? [];
  const rows = data?.items ?? [];
  const filtered = area === 'TODOS' ? rows : rows.filter((row) => row.kind === FILTER_KIND[area]);
  const critical = filtered.filter((row) => row.severity === 'CRITICAL');
  const followup = filtered.filter((row) => row.severity !== 'CRITICAL');
  const name = displayName.trim().split(/\s+/)[0];
  const allFailed = data && failed.length === data.sources.length;
  const options = [
    { id: 'TODOS' as const, icon: List, label: `Todos (${rows.length})` },
    { id: 'MANTENIMIENTO' as const, icon: Wrench, label: `Mantenimiento (${rows.filter((row) => row.kind === 'maintenance').length})` },
    { id: 'INVENTARIO' as const, icon: Package, label: `Inventario (${rows.filter((row) => row.kind === 'stock').length})` },
    { id: 'COMPRAS' as const, icon: ReceiptText, label: `Compras (${rows.filter((row) => row.kind === 'purchase').length})` },
  ];

  return (
    <>
      <PageHeader title={<>
        Inicio
        <Button asChild variant="secondary" size="icon" className="ml-1 text-muted-foreground" title="Configurar alertas">
          <Link href="/configuracion/alertas" aria-label="Configurar alertas"><Settings aria-hidden /></Link>
        </Button>
      </>}
        lede={<>{name ? `${saludo}, ${name}. ` : `${saludo}. `}{data && !allFailed ? <><strong>{rows.length} {rows.length === 1 ? 'alerta activa' : 'alertas activas'}</strong>{failed.length ? ` ${rows.length === 1 ? 'disponible' : 'disponibles'}. Hay fuentes sin cargar.` : ' que requieren tu atención.'}</> : 'Identifica qué atender primero.'}</>} />
      <ReadStatus loading={read.loading} error={read.error} loadingText={data ? 'Actualizando alertas…' : 'Cargando alertas…'}
        errorText="No se pudieron cargar las alertas." retry={read.retry} />
      {failed.length ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {failed.length ? <p role="alert" className="text-[13px] text-destructive">No se pudo cargar {failed.map((source) => source.name).join(', ')}. Los conteos incluyen sólo las fuentes disponibles.</p> : null}
          <Button variant="outline" onClick={read.retry}>Reintentar</Button>
        </div>
      ) : null}
      {data && !allFailed ? (
        <>
          <ListFilter label="Filtrar alertas por área" value={area} options={options} className="mb-5 grid grid-cols-2 sm:flex" onChange={(next) => {
            const nextParams = new URLSearchParams(params.toString());
            if (next === 'TODOS') nextParams.delete('area'); else nextParams.set('area', next);
            router.replace(`/inicio${nextParams.size ? `?${nextParams}` : ''}`, { scroll: false });
          }} />
          <div className="grid gap-5">
            {critical.length ? <AttentionGroup critical rows={critical} /> : null}
            {followup.length ? <AttentionGroup rows={followup} /> : null}
            {!filtered.length ? <div className="empty-state"><h2>{area === 'TODOS' ? 'Sin alertas activas' : `Sin alertas de ${AREA_LABEL[area]}`}</h2><p className="muted">{failed.length ? 'No hay pendientes en las fuentes disponibles.' : 'Las condiciones revisadas están al día.'}</p></div> : null}
          </div>
        </>
      ) : null}
    </>
  );
}

function AttentionGroup({ rows, critical = false }: { rows: ActiveAttention[]; critical?: boolean }) {
  const heading = critical ? 'atencion-inmediata' : 'seguimiento';
  return (
    <section aria-labelledby={heading} className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={heading} className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.02em] text-navy">
          <span className={cn('size-2 shrink-0 rounded-full', critical ? 'bg-destructive' : 'bg-[#8a4b12]')} aria-hidden />
          {critical ? 'Requiere atención inmediata' : 'Requiere seguimiento'} ({rows.length})
        </h2>
        <span className={cn('rounded-sm px-2 py-0.5 text-[11px] font-medium uppercase', critical ? 'bg-[#fcecea] text-destructive' : 'bg-[#fff4e8] text-[#8a4b12]')}>{critical ? 'Crítico' : 'Pendiente'}</span>
      </div>
      <ul className="grid gap-2">
        {rows.map((row, index) => (
          <li key={row.id} className={cn('rounded-md border border-border bg-card p-3 sm:flex sm:items-center sm:gap-4', critical && 'border-l-[3px] border-l-destructive')}>
            <div className="flex min-w-0 flex-1 items-center gap-3">
              {row.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={row.photo} alt="" className="h-12 w-16 shrink-0 rounded-sm object-cover" />
              ) : <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-sm border border-border bg-muted text-muted-foreground">{row.kind === 'maintenance' ? <Wrench className="size-5" /> : row.kind === 'purchase' ? <ReceiptText className="size-5" /> : <Package className="size-5" />}</span>}
              <div className="min-w-0">
                <h3 className="break-words text-[14px] font-semibold text-navy">{row.title}</h3>
                {row.reference ? <p className="text-[11px] text-muted-foreground">{row.reference}</p> : null}
                <p className={cn('mt-1 flex items-start gap-1.5 text-[13px]', critical ? 'text-destructive' : 'text-[#8a4b12]')}><AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0" /><span>{row.detail}</span></p>
              </div>
            </div>
            <Button asChild variant={critical && index === 0 ? 'default' : 'outline'} className="mt-3 w-full sm:mt-0 sm:w-56">
              <Link href={row.href}>{row.action}<ArrowRight aria-hidden /></Link>
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
