'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, HttpError } from '@/lib/api';
import { useRole } from '@/lib/role';
import type { Familia } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Field, FormAlert, PageHeader } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

export default function FamiliasPage() {
  const { role, userId } = useRole();
  const [familias, setFamilias] = useState<Familia[]>([]);
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    setFamilias(await api<Familia[]>('/inventario/familias', { role: role!, userId }));
  }

  useEffect(() => {
    if (!role) return;
    void cargar().catch((err) => {
      setError(err instanceof HttpError ? err.message : 'No se pudieron cargar las categorías.');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  async function crear(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await api('/inventario/familias', {
        role: role!,
        userId,
        method: 'POST',
        body: JSON.stringify({ nombre: nombre.trim() }),
      });
      setNombre('');
      await cargar();
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'No se pudo crear la categoría.');
    }
  }

  async function toggle(familia: Familia) {
    setError(null);
    try {
      await api(`/inventario/familias/${familia.id}`, {
        role: role!,
        userId,
        method: 'PATCH',
        body: JSON.stringify({ activa: !familia.activa }),
      });
      await cargar();
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'No se pudo actualizar.');
    }
  }

  return (
    <>
      <PageHeader
        title="Categorías"
        actions={
          <Button type="submit" form="nueva-categoria" disabled={!nombre.trim()}>
            Agregar categoría
          </Button>
        }
      />
      <form id="nueva-categoria" className="mb-3 max-w-sm" onSubmit={crear}>
        <Field label="Nombre" htmlFor="famNombre">
          <Input
            id="famNombre"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Filtros"
          />
        </Field>
      </form>
      <FormAlert>{error}</FormAlert>
      {familias.length > 0 || !error ? (
      <div className="card list" style={{ marginTop: 12 }}>
        {familias.length > 0
          ? familias.map((familia) => (
              <div key={familia.id} className="tipo-row">
                <div>
                  <strong>{familia.nombre}</strong>
                  <div className="muted">{familia.activa ? 'Activa' : 'Inactiva'}</div>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void toggle(familia)}
                >
                  {familia.activa ? 'Inactivar' : 'Activar'}
                </Button>
              </div>
            ))
          : (
              <div className="empty-state">
                <h2>No hay categorías</h2>
                <p className="muted">Agregue la primera.</p>
              </div>
            )}
      </div>
      ) : null}
    </>
  );
}
