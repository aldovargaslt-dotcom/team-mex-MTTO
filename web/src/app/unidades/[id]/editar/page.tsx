'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { RoleGate } from '@/components/RoleGate';
import { toPayload, UnidadForm } from '@/components/UnidadForm';
import { Button } from '@/components/ui/button';
import { api, HttpError } from '@/lib/api';
import { useRole } from '@/lib/role';
import type { Unidad } from '@/lib/types';

export default function EditarUnidadPage() {
  return (
    <RoleGate adminOnly>
      <EditarUnidadForm />
    </RoleGate>
  );
}

function EditarUnidadForm() {
  const params = useParams<{ id: string }>();
  const { role, userId } = useRole();
  const router = useRouter();
  const [unidad, setUnidad] = useState<Unidad | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!role || !params.id) return;
    void (async () => {
      try {
        setUnidad(await api<Unidad>(`/unidades/${params.id}`, { role, userId }));
      } catch (err) {
        if (err instanceof HttpError && err.status === 404) {
          setNotFound(true);
        } else {
          setError(
            err instanceof HttpError
              ? err.message
              : 'No se pudo cargar la unidad.',
          );
        }
      }
    })();
  }, [params.id, role, userId]);

  if (notFound) {
    return (
      <div className="empty-state">
        <h2>No se encontró la unidad</h2>
        <p className="muted">No es posible editar un registro que no existe.</p>
        <Button asChild>
          <Link href="/unidades">Volver al listado</Link>
        </Button>
      </div>
    );
  }

  if (!unidad && !error) {
    return <p className="muted">Cargando unidad…</p>;
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Editar {unidad?.numeroInterno ?? 'unidad'}</h1>
          <p className="lede">
            Datos de catálogo. La foto de la unidad se sube aquí.
          </p>
        </div>
      </div>
      {unidad ? (
        <UnidadForm
          role={role!}
          userId={userId}
          initial={unidad}
          submitLabel="Guardar cambios"
          error={error}
          onSubmit={async (values) => {
            setError(null);
            try {
              await api<Unidad>(`/unidades/${unidad.id}`, {
                role: role!,
                userId,
                method: 'PATCH',
                body: JSON.stringify(toPayload(values)),
              });
              router.push(`/unidades/${unidad.id}`);
            } catch (err) {
              setError(
                err instanceof HttpError
                  ? err.message
                  : 'No se pudo guardar la unidad.',
              );
            }
          }}
        />
      ) : (
        <p className="alert">{error}</p>
      )}
    </>
  );
}
