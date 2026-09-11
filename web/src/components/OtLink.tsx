'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { VisitaDetalle } from '@/lib/types';

export type OtInfo = {
  unidadId: string;
  numeroInterno: string;
};

export function useOtLabels(
  visitaIds: Array<string | null | undefined>,
  opts: { role?: string | null; userId?: string },
) {
  const [map, setMap] = useState<Record<string, OtInfo>>({});
  const key = [...new Set(visitaIds.filter(Boolean))].sort().join(',');

  useEffect(() => {
    if (!opts.role || !key) {
      setMap({});
      return;
    }
    const ids = key.split(',');
    void Promise.all(
      ids.map(async (id) => {
        try {
          const visita = await api<VisitaDetalle>(`/visitas/${id}`, {
            role: opts.role!,
            userId: opts.userId,
          });
          return [
            id,
            {
              unidadId: visita.unidadId,
              numeroInterno: visita.unidadNumeroInterno,
            },
          ] as const;
        } catch {
          return [id, null] as const;
        }
      }),
    ).then((entries) => {
      const next: Record<string, OtInfo> = {};
      for (const [id, info] of entries) {
        if (info) next[id] = info;
      }
      setMap(next);
    });
  }, [key, opts.role, opts.userId]);

  return map;
}

export function OtLink({
  visitaId,
  labels,
}: {
  visitaId: string | null | undefined;
  labels: Record<string, OtInfo>;
}) {
  if (!visitaId) {
    return <span className="text-muted-foreground">—</span>;
  }
  const info = labels[visitaId];
  if (!info) {
    return (
      <span className="text-muted-foreground">OT · {visitaId.slice(0, 8)}</span>
    );
  }
  return (
    <Link
      href={`/unidades/${info.unidadId}/visitas/${visitaId}`}
      className="font-medium text-navy underline-offset-2 hover:underline"
      onClick={(e) => e.stopPropagation()}
    >
      OT · {info.numeroInterno}
    </Link>
  );
}
