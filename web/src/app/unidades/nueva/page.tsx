'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { RoleGate } from '@/components/RoleGate';
import { toPayload, UnidadForm } from '@/components/UnidadForm';
import { api, HttpError } from '@/lib/api';
import { useRole } from '@/lib/role';
import type { Unidad } from '@/lib/types';

export default function NuevaUnidadPage() {
  return (
    <RoleGate adminOnly>
      <NuevaUnidadForm />
    </RoleGate>
  );
}

function NuevaUnidadForm() {
  const { role, userId } = useRole();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Nueva unidad</h1>
          <p className="lede">Alta de unidad en el catálogo de la flota.</p>
        </div>
      </div>
      <UnidadForm
        role={role!}
        userId={userId}
        submitLabel="Crear unidad"
        error={error}
        onSubmit={async (values) => {
          setError(null);
          try {
            const created = await api<Unidad>('/unidades', {
              role: role!,
              userId,
              method: 'POST',
              body: JSON.stringify(toPayload(values)),
            });
            router.push(`/unidades/${created.id}`);
          } catch (err) {
            setError(
              err instanceof HttpError
                ? err.message
                : 'No se pudo crear la unidad.',
            );
          }
        }}
      />
    </>
  );
}
