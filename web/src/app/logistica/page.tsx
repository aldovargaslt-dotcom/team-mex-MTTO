'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Assign-chofer desk parked (ADR-011). Nav Logística → Flota. */
export default function LogisticaRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/flota');
  }, [router]);
  return <p className="muted">Abriendo Flota…</p>;
}
