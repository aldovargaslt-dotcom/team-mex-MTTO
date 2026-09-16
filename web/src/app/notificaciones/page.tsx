'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { HeartPulse, Package, Wrench } from 'lucide-react';
import { RoleGate } from '@/components/RoleGate';
import { ListFilter } from '@/components/ListFilter';
import { Button } from '@/components/ui/button';
import { FormAlert, PageHeader } from '@/components/ui/field';
import { api, HttpError } from '@/lib/api';
import { formatHace } from '@/lib/format';
import { notifyInboxChanged } from '@/lib/inbox';
import { useRole } from '@/lib/role';
import type { InboxItem } from '@/lib/types';
import { cn } from '@/lib/utils';

const FILTROS: { id: 'unread' | 'all'; label: string }[] = [
  { id: 'unread', label: 'No leídas' },
  { id: 'all', label: 'Todas' },
];

export default function NotificacionesPage() {
  return (
    <RoleGate allow={['SUPERVISOR', 'ADMIN_DIRECTIVO']}>
      <InboxContent />
    </RoleGate>
  );
}

function InboxContent() {
  const router = useRouter();
  const { role, userId } = useRole();
  const [filtro, setFiltro] = useState<'unread' | 'all'>('unread');
  const [items, setItems] = useState<InboxItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function cargar(next = filtro) {
    const qs = next === 'all' ? '?filter=all' : '';
    const data = await api<InboxItem[]>(`/notifications${qs}`, {
      role: role!,
      userId,
    });
    setItems(data);
  }

  useEffect(() => {
    if (!role) return;
    void cargar().catch((err) => {
      setItems([]);
      setError(
        err instanceof HttpError
          ? err.message
          : 'No se pudieron cargar las notificaciones.',
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, userId, filtro]);

  async function abrir(item: InboxItem) {
    setError(null);
    try {
      if (!item.readAt) {
        await api(`/notifications/${item.id}/read`, {
          role: role!,
          userId,
          method: 'POST',
        });
        notifyInboxChanged();
      }
      router.push(item.deeplinkPath);
    } catch (err) {
      setError(
        err instanceof HttpError
          ? err.message
          : 'No se pudo abrir la notificación.',
      );
    }
  }

  async function marcarTodas() {
    setBusy(true);
    setError(null);
    try {
      await api('/notifications/read-all', {
        role: role!,
        userId,
        method: 'POST',
      });
      notifyInboxChanged();
      await cargar();
    } catch (err) {
      setError(
        err instanceof HttpError
          ? err.message
          : 'No se pudieron marcar como leídas.',
      );
    } finally {
      setBusy(false);
    }
  }

  const unreadCount = items?.filter((item) => !item.readAt).length ?? 0;

  return (
    <>
      <PageHeader
        title="Notificaciones"
        lede="Avisos de Andon, inventario y salud de unidad. Tocar una fila la marca leída y abre el destino."
        actions={
          unreadCount > 0 ? (
            <Button
              type="button"
              variant="quiet"
              disabled={busy}
              onClick={() => void marcarTodas()}
            >
              Marcar todas leídas
            </Button>
          ) : null
        }
      />
      <ListFilter
        label="Filtro de notificaciones"
        value={filtro}
        options={FILTROS}
        onChange={setFiltro}
      />
      <FormAlert>{error}</FormAlert>
      {items == null ? (
        <p className="muted">Cargando notificaciones…</p>
      ) : items.length === 0 ? (
        <p className="muted">Sin notificaciones.</p>
      ) : (
        <ul className="inbox-list">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={cn('inbox-row', !item.readAt && 'unread')}
                onClick={() => void abrir(item)}
              >
                <span className="inbox-icon" aria-hidden>
                  {item.sourceModule === 'INVENTARIO' ? (
                    <Package className="size-4" />
                  ) : item.sourceModule === 'SALUD' ? (
                    <HeartPulse className="size-4" />
                  ) : (
                    <Wrench className="size-4" />
                  )}
                </span>
                <span className="inbox-copy">
                  <span className="inbox-title">{item.title}</span>
                  <span className="inbox-body">{item.body}</span>
                </span>
                <span className="inbox-meta">
                  <time dateTime={item.createdAt}>{formatHace(item.createdAt)}</time>
                  {!item.readAt ? (
                    <span className="inbox-dot" title="No leída" />
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
