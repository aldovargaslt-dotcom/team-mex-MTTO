'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { HeartPulse, Package, ShoppingCart, Wrench } from 'lucide-react';
import { ReadStatus } from '@/components/ReadStatus';
import { useReadResource } from '@/lib/use-read-resource';
import { RoleGate } from '@/components/RoleGate';
import { PageHeader } from '@/components/ui/field';
import { api } from '@/lib/api';
import { saludoAhora } from '@/lib/format';
import { useRole } from '@/lib/role';
import type {
  AvisoAndon,
  InboxItem,
  PendienteComprobante,
  StockRow,
} from '@/lib/types';

type AttentionRow = {
  href: string;
  label: string;
  detail: string;
  icon: 'andon' | 'stock' | 'compra' | 'salud';
};

type SourceState = {
  id: string;
  name: string;
  status: 'ok' | 'error' | 'loading';
  loading: boolean; error: unknown; retry: () => void; retried: boolean;
  rows: AttentionRow[];
};

export default function InicioPage() {
  return (
    <RoleGate allow={['SUPERVISOR', 'ADMIN_DIRECTIVO']}>
      <InicioContent />
    </RoleGate>
  );
}

function InicioContent() {
  const { role, userId } = useRole();
  const [saludo, setSaludo] = useState('Hola');
  const opts = { role: role!, userId };
  const andonSource = useReadResource(role ? JSON.stringify([role, userId, '/andon/avisos']) : null, () => api<AvisoAndon[]>('/andon/avisos', opts));
  const stockSource = useReadResource(role ? JSON.stringify([role, userId, '/inventario/stock']) : null, () => api<StockRow[]>('/inventario/stock', opts));
  const comprasSource = useReadResource(role ? JSON.stringify([role, userId, '/inventario/pendientes-comprobante']) : null, () => api<PendienteComprobante[]>('/inventario/pendientes-comprobante', opts));
  const saludSource = useReadResource(role ? JSON.stringify([role, userId, '/notifications?filter=all']) : null, () => api<InboxItem[]>('/notifications?filter=all', opts));
  useEffect(() => { setSaludo(saludoAhora()); }, []);
  const sources = useMemo<SourceState[]>(() => {
    const avisos = andonSource.data ?? [];
    const stock = stockSource.data ?? [];
    const compras = comprasSource.data ?? [];
    const inbox = saludSource.data ?? [];
      const andonRows: AttentionRow[] = [];
      const stockRows: AttentionRow[] = [];
      const compraRows: AttentionRow[] = [];
      const saludRows: AttentionRow[] = [];
      for (const aviso of avisos) {
        andonRows.push({
          href: '/andon',
          icon: 'andon',
          label: aviso.numeroInterno ?? 'Unidad sin nombre',
          detail: `Mantenimiento vencido · ${aviso.estado === 'ENTERADO' ? 'Enterado; sigue activo hasta cerrar una visita' : 'Requiere revisión'}`,
        });
      }
      for (const row of stock.filter((item) => item.alerta === 'BAJO')) {
        stockRows.push({
          href: '/inventario/stock?alerta=BAJO',
          icon: 'stock',
          label: row.nombre,
          detail: `Existencias · ${row.qty} ${row.uom} disponibles; mínimo ${row.minQty ?? 'sin definir'}`,
        });
      }
      for (const row of stock.filter((item) => item.alerta === 'AGOTADO')) {
        stockRows.push({
          href: '/inventario/stock?alerta=AGOTADO',
          icon: 'stock',
          label: row.nombre,
          detail: 'Existencias · Agotado; revise la refacción',
        });
      }
      for (const row of compras.filter((item) => item.estado === 'PENDIENTE')) {
        compraRows.push({
          href: '/inventario/pendientes',
          icon: 'compra',
          label: `${row.sku} · ${row.nombre}`,
          detail: 'Inventario · Evidencia pendiente de compra externa',
        });
      }
      for (const item of inbox.filter((row) => row.sourceModule === 'SALUD')) {
        saludRows.push({
          href: item.deeplinkPath,
          icon: 'salud',
          label: item.title,
          detail: `Salud · ${item.body}`,
        });
      }
    return [
      { id: 'andon', name: 'mantenimiento vencido', ...andonSource, status: andonSource.loading ? 'loading' : andonSource.error ? 'error' : 'ok', rows: andonRows },
      { id: 'stock', name: 'existencias', ...stockSource, status: stockSource.loading ? 'loading' : stockSource.error ? 'error' : 'ok', rows: stockRows },
      { id: 'compras', name: 'por recibir', ...comprasSource, status: comprasSource.loading ? 'loading' : comprasSource.error ? 'error' : 'ok', rows: compraRows },
      { id: 'salud', name: 'salud de unidad', ...saludSource, status: saludSource.loading ? 'loading' : saludSource.error ? 'error' : 'ok', rows: saludRows },
    ];
  }, [andonSource, stockSource, comprasSource, saludSource]);

  return (
    <>
      <PageHeader
        title={saludo}
        lede="Qué hay que revisar. Cada fila abre la lista."
      />
      <div aria-label="Estado de consultas">
        {sources.map((source) => (
          <ReadStatus key={source.id} className="inbox-source-state" loading={source.loading} error={source.error}
            loadingText={`Cargando ${source.name}…`} errorText={`No se pudo cargar ${source.name}.`}
            retry={source.retry} retryLabel={`Reintentar ${source.name}`} />
        ))}
      </div>
      {sources.every((source) => source.status === 'ok' && source.rows.length === 0) ? (
        <div className="empty-state">
          <h2>Nada requiere atención</h2>
          <p className="muted">Mantenimiento vencido, existencias, por recibir y salud están al día.</p>
        </div>
      ) : sources.some((source) => source.status === 'ok' && source.rows.length > 0) ? (
        <section aria-labelledby="requiere-atencion">
          <h2 id="requiere-atencion" className="mb-1 text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">Requiere atención</h2>
          <ul className="inbox-list">
            {sources.flatMap((source) => source.status === 'ok' ? source.rows.map((row) => (
                    <li key={`${source.id}:${row.href}:${row.label}`}>
                      <Link href={row.href} className="inbox-row unread">
                        <span className="inbox-icon" aria-hidden>
                          {row.icon === 'andon' ? (
                            <Wrench className="size-4" />
                          ) : row.icon === 'compra' ? (
                            <ShoppingCart className="size-4" />
                          ) : row.icon === 'salud' ? (
                            <HeartPulse className="size-4" />
                          ) : (
                            <Package className="size-4" />
                          )}
                        </span>
                        <span className="inbox-copy">
                          <span className="inbox-title">{row.label}</span>
                          <span className="inbox-body">{row.detail}</span>
                        </span>
                      </Link>
                    </li>
                  )) : [])}
          </ul>
        </section>
      ) : null}
    </>
  );
}
