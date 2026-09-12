'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, ShoppingCart, Wrench } from 'lucide-react';
import { RoleGate } from '@/components/RoleGate';
import { FormAlert, PageHeader } from '@/components/ui/field';
import { api, HttpError } from '@/lib/api';
import { fraseCuenta, saludoAhora } from '@/lib/format';
import { useRole } from '@/lib/role';
import type { AvisoAndon, PendienteComprobante, StockRow } from '@/lib/types';

type AttentionRow = {
  href: string;
  label: string;
  icon: 'andon' | 'stock' | 'compra';
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
  const [rows, setRows] = useState<AttentionRow[] | null>(null);
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
      ]);
      const avisos = settled[0].status === 'fulfilled' ? settled[0].value : [];
      const stock = settled[1].status === 'fulfilled' ? settled[1].value : [];
      const compras = settled[2].status === 'fulfilled' ? settled[2].value : [];
      const failed = settled.filter((item) => item.status === 'rejected').length;
      if (failed === settled.length) {
        const first = settled[0];
        setRows([]);
        setError(
          first.status === 'rejected' && first.reason instanceof HttpError
            ? first.reason.message
            : 'No se pudo cargar lo que requiere atención.',
        );
        return;
      }
      if (failed > 0) {
        setError('Algunas excepciones no se pudieron cargar.');
      }
      const vencidos = avisos.length;
      const bajo = stock.filter((row) => row.alerta === 'BAJO').length;
      const agotadas = stock.filter((row) => row.alerta === 'AGOTADO').length;
      const pendientes = compras.filter((row) => row.estado === 'PENDIENTE').length;
      const next: AttentionRow[] = [];
      if (vencidos > 0) {
        next.push({
          href: '/andon',
          icon: 'andon',
          label: fraseCuenta(
            vencidos,
            'mantenimiento vencido',
            'mantenimientos vencidos',
          ),
        });
      }
      if (bajo > 0) {
        next.push({
          href: '/inventario/stock?alerta=BAJO',
          icon: 'stock',
          label: fraseCuenta(
            bajo,
            'refacción con stock bajo',
            'refacciones con stock bajo',
          ),
        });
      }
      if (agotadas > 0) {
        next.push({
          href: '/inventario/stock?alerta=AGOTADO',
          icon: 'stock',
          label: fraseCuenta(
            agotadas,
            'refacción agotada',
            'refacciones agotadas',
          ),
        });
      }
      if (pendientes > 0) {
        next.push({
          href: '/inventario/pendientes',
          icon: 'compra',
          label: fraseCuenta(pendientes, 'por recibir', 'por recibir'),
        });
      }
      setRows(next);
    })();
  }, [role, userId]);

  return (
    <>
      <PageHeader
        title={saludo}
        lede="Qué hay que revisar. Cada fila abre la lista."
      />
      <FormAlert>{error}</FormAlert>
      {rows == null ? (
        <p className="muted">Cargando excepciones…</p>
      ) : rows.length === 0 && !error ? (
        <div className="empty-state">
          <h2>Nada requiere atención</h2>
          <p className="muted">Andon, existencias y por recibir están al día.</p>
        </div>
      ) : rows.length === 0 ? null : (
        <section aria-labelledby="requiere-atencion">
          <h2
            id="requiere-atencion"
            className="mb-1 text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground"
          >
            Requiere atención
          </h2>
          <ul className="inbox-list">
            {rows.map((row) => (
              <li key={row.href}>
                <Link href={row.href} className="inbox-row unread">
                  <span className="inbox-icon" aria-hidden>
                    {row.icon === 'andon' ? (
                      <Wrench className="size-4" />
                    ) : row.icon === 'compra' ? (
                      <ShoppingCart className="size-4" />
                    ) : (
                      <Package className="size-4" />
                    )}
                  </span>
                  <span className="inbox-copy">
                    <span className="inbox-title">{row.label}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
