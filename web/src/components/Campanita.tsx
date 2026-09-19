'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { api } from '@/lib/api';
import { INBOX_CHANGED } from '@/lib/inbox';
import { useRole } from '@/lib/role';

export function Campanita() {
  const pathname = usePathname();
  const { role, userId } = useRole();
  const [unread, setUnread] = useState(0);

  const cargar = useCallback(async () => {
    if (!role) return;
    try {
      const data = await api<{ unread: number }>('/notifications/badge', {
        role,
        userId,
      });
      setUnread(data.unread);
    } catch {
      /* campanita no bloquea el shell */
    }
  }, [role, userId]);

  useEffect(() => {
    void cargar();
  }, [cargar, pathname]);

  useEffect(() => {
    function onChange() {
      void cargar();
    }
    window.addEventListener(INBOX_CHANGED, onChange);
    const timer = window.setInterval(() => void cargar(), 20000);
    return () => {
      window.removeEventListener(INBOX_CHANGED, onChange);
      window.clearInterval(timer);
    };
  }, [cargar]);

  const label =
    unread > 0
      ? `Notificaciones, ${unread} sin leer`
      : 'Notificaciones';

  return (
    <Link
      href="/notificaciones"
      className="campanita"
      aria-label={label}
      title={label}
    >
      <Bell aria-hidden className="size-5" strokeWidth={2} />
      {unread > 0 ? (
        <span className="campanita-badge" aria-hidden>
          {unread > 99 ? '99+' : unread}
        </span>
      ) : null}
    </Link>
  );
}
