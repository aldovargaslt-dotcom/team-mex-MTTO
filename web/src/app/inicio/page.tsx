'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { HeartPulse, Package, ShoppingCart, Wrench } from 'lucide-react';
import { RoleGate } from '@/components/RoleGate';
import { FormAlert, PageHeader } from '@/components/ui/field';
import { api, HttpError } from '@/lib/api';
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
  status: 'ok' | 'error';
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
  const [sources, setSources] = useState<SourceState[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSaludo(saludoAhora());
  }, []);

  useEffect(() => {
    if (!role) return;
    const opts = { role, userId };
    void (async () => {
      setError(null);
      const settled = await Promise.allSettled([
        api<AvisoAndon[]>('/andon/avisos', opts),
        api<StockRow[]>('/inventario/stock', opts),
        api<PendienteComprobante[]>('/inventario/pendientes-comprobante', opts),
        api<InboxItem[]>('/notifications?filter=all', opts),
      ]);
      const avisos = settled[0].status === 'fulfilled' ? settled[0].value : [];
      const stock = settled[1].status === 'fulfilled' ? settled[1].value : [];
      const compras = settled[2].status === 'fulfilled' ? settled[2].value : [];
      const inbox = settled[3].status === 'fulfilled' ? settled[3].value : [];
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
      setSources([
        {
          id: 'andon',
          name: 'mantenimiento vencido',
          status: settled[0].status === 'fulfilled' ? 'ok' : 'error',
          rows: andonRows,
        },
        {
          id: 'stock',
          name: 'existencias',
          status: settled[1].status === 'fulfilled' ? 'ok' : 'error',
          rows: stockRows,
        },
        {
          id: 'compras',
          name: 'por recibir',
          status: settled[2].status === 'fulfilled' ? 'ok' : 'error',
          rows: compraRows,
        },
        {
          id: 'salud',
          name: 'salud de unidad',
          status: settled[3].status === 'fulfilled' ? 'ok' : 'error',
          rows: saludRows,
        },
      ]);
      if (settled.every((item) => item.status === 'rejected')) {
        const first = settled[0];
        setError(
          first.status === 'rejected' && first.reason instanceof HttpError
            ? first.reason.message
            : 'No se pudo cargar lo que requiere atención.',
        );
      }
    })();
  }, [role, userId]);

  return (
    <>
      <PageHeader
        title={saludo}
        lede="Qué hay que revisar. Cada fila abre la lista."
      />
      <FormAlert>{error}</FormAlert>
      {sources == null ? (
        <p className="muted">Cargando excepciones…</p>
      ) : sources.every((source) => source.status === 'ok' && source.rows.length === 0) ? (
        <div className="empty-state">
          <h2>Nada requiere atención</h2>
          <p className="muted">
            Mantenimiento vencido, existencias, por recibir y salud están al día.
          </p>
        </div>
      ) : (
        <section aria-labelledby="requiere-atencion">
          <h2
            id="requiere-atencion"
            className="mb-1 text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground"
          >
            Requiere atención
          </h2>
          <ul className="inbox-list">
            {sources.flatMap((source) =>
              source.status === 'error'
                ? [
                    <li key={source.id}>
                      <p className="inbox-row">
                        <span className="inbox-copy">
                          <span className="inbox-title">
                            No se pudo cargar {source.name}.
                          </span>
                        </span>
                      </p>
                    </li>,
                  ]
                : source.rows.map((row) => (
                    <li key={row.href}>
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
                  )),
            )}
          </ul>
        </section>
      )}
    </>
  );
}
