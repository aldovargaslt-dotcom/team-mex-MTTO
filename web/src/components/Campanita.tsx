'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Bell, RotateCw } from 'lucide-react';
import { api } from '@/lib/api';
import { INBOX_CHANGED } from '@/lib/inbox';
import { useRole } from '@/lib/role';
import { useReadResource } from '@/lib/use-read-resource';
import { Button } from '@/components/ui/button';

export function Campanita() {
  const pathname = usePathname();
  const [retried, setRetried] = useState(false);
  const { role, userId } = useRole();
  const read = useReadResource(role ? JSON.stringify([role, userId, pathname]) : null,
    () => api<{ unread: number }>('/notifications/badge', { role: role!, userId }));
  const retry = read.retry;
  useEffect(() => {
    const reload = () => retry();
    window.addEventListener(INBOX_CHANGED, reload);
    const timer = window.setInterval(reload, 20000);
    return () => { window.removeEventListener(INBOX_CHANGED, reload); window.clearInterval(timer); };
  }, [retry]);
  const unread = read.data?.unread;
  const canRead = role !== 'MECANICO'; // Existing permission only; no navigation/permission change.
  const label = read.loading ? 'Alertas: cargando' : read.error ? 'Alertas no disponibles'
    : unread && unread > 0 ? `Alertas, ${unread} sin leer` : 'Alertas, sin alertas nuevas';
  return (
    <span className="campanita-wrap">
      <Link href="/notificaciones" className="campanita" aria-label={label} title={label} aria-busy={read.loading}>
        <Bell aria-hidden className="size-5" strokeWidth={2} />
        {read.error && canRead ? <span className="campanita-unknown" aria-hidden>?</span>
          : unread && unread > 0 ? <span className="campanita-badge" aria-hidden>{unread > 99 ? '99+' : unread}</span> : null}
      </Link>
      {(read.error || retried) && canRead ? <Button type="button" variant="ghost" size="icon" aria-label="Reintentar alertas" aria-disabled={read.loading} onClick={() => { if (read.loading) return; setRetried(true); read.retry(); }}><RotateCw aria-hidden /></Button> : null}
    </span>
  );
}
