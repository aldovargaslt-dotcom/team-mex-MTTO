'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, HttpError } from '@/lib/api';
import { useRole } from '@/lib/role';
import type { Proveedor } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Field, FormAlert, PageHeader } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

export default function ProveedoresPage() {
  const { role, userId } = useRole();
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function cargar() {
    setProveedores(
      await api<Proveedor[]>('/inventario/proveedores', { role: role!, userId }),
    );
  }

  useEffect(() => {
    if (!role) return;
    void cargar().catch((err) => {
      setError(
        err instanceof HttpError ? err.message : 'No se pudieron cargar los proveedores.',
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  async function crear(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await api('/inventario/proveedores', {
        role: role!,
        userId,
        method: 'POST',
        body: JSON.stringify({ nombre: nombre.trim() }),
      });
      setNombre('');
      await cargar();
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'No se pudo crear el proveedor.');
    }
  }

  async function toggle(proveedor: Proveedor) {
    setError(null);
    try {
      await api(`/inventario/proveedores/${proveedor.id}`, {
        role: role!,
        userId,
        method: 'PATCH',
        body: JSON.stringify({ activo: !proveedor.activo }),
      });
      await cargar();
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'No se pudo actualizar.');
    }
  }

  return (
    <>
      <PageHeader
        title="Proveedores"
        actions={
          <Button type="submit" form="nuevo-proveedor" disabled={!nombre.trim()}>
            Agregar proveedor
          </Button>
        }
      />
      <form id="nuevo-proveedor" className="mb-3 max-w-sm" onSubmit={crear}>
        <Field label="Nombre" htmlFor="provNombre">
          <Input
            id="provNombre"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Refacciones del Norte"
          />
        </Field>
      </form>
      <FormAlert>{error}</FormAlert>
      {proveedores.length > 0 || !error ? (
      <div className="card list" style={{ marginTop: 12 }}>
        {proveedores.length > 0
          ? proveedores.map((proveedor) => (
              <div key={proveedor.id} className="tipo-row">
                <div>
                  <strong>{proveedor.nombre}</strong>
                  <div className="muted">{proveedor.activo ? 'Activo' : 'Inactivo'}</div>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void toggle(proveedor)}
                >
                  {proveedor.activo ? 'Inactivar' : 'Activar'}
                </Button>
              </div>
            ))
          : (
              <div className="empty-state">
                <h2>No hay proveedores</h2>
                <p className="muted">Agregue el primero.</p>
              </div>
            )}
      </div>
      ) : null}
    </>
  );
}
