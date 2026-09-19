'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useRole } from '@/lib/role';

/** Flota visual v0: LOGISTICA stays on Tablero (`/flota`). Ciclos/Sitios out. */
export function LogisticaTableroOnly({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { ready, isLogistica } = useRole();

  useEffect(() => {
    if (ready && isLogistica) {
      router.replace('/flota');
    }
  }, [ready, isLogistica, router]);

  if (!ready || isLogistica) {
    return <p className="muted">Abriendo Flota…</p>;
  }

  return children;
}
