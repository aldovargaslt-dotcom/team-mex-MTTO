'use client';
import { useEffect, useState } from 'react';
import { api } from './api';
import { JourneyBinding, sameJourney } from './journey-commands';

// Freeze the selected row's binding, never silently rebind it on a background list refresh.
export function useJourneyContext(row: JourneyBinding | undefined, role: string | null, subject: string) {
  const [context, setContext] = useState<JourneyBinding | null>(null);
  const [error, setError] = useState<string | null>(null);
  const id = row?.unidadId;
  useEffect(() => {
    let current = true;
    setContext(null); setError(null);
    if (row && role && subject) {
      void api<JourneyBinding>(`/logistica/unidades/${row.unidadId}/journey-context`, { role, userId: subject })
        .then(snapshot => {
          if (!sameJourney(row, snapshot)) throw new Error('El viaje cambió. Actualiza la vista antes de confirmar.');
          if (current) setContext(snapshot);
        }).catch(error => { if (current) setError(error instanceof Error ? error.message : 'No se pudo verificar el viaje.'); });
    }
    return () => { current = false; };
    // Same unit refreshed in the background must not replace an existing intent's binding.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, role, subject]);
  return { context: context?.unidadId === id ? context : null, error };
}
