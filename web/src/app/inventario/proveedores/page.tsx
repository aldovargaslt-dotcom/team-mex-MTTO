'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, HttpError } from '@/lib/api';
import { useRole } from '@/lib/role';
import type { Proveedor } from '@/lib/types';
import { PageHeader } from '@/components/ui/field';

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
      <PageHeader title="Proveedores" />
      <form className="card form-grid" onSubmit={crear}>
        <div className="field">
          <label htmlFor="provNombre">Nombre</label>
          <input
            id="provNombre"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Refacciones del Norte"
          />
        </div>
        <div className="form-actions">
          <button className="btn btn-primary" type="submit">
            Agregar proveedor
          </button>
        </div>
      </form>
      {error ? <p className="alert" style={{ margin: '12px 0' }}>{error}</p> : null}
      <div className="card list" style={{ marginTop: 12 }}>
        {proveedores.length > 0
          ? proveedores.map((proveedor) => (
              <div key={proveedor.id} className="tipo-row">
                <div>
                  <strong>{proveedor.nombre}</strong>
                  <div className="muted">{proveedor.activo ? 'Activo' : 'Inactivo'}</div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => void toggle(proveedor)}
                >
                  {proveedor.activo ? 'Inactivar' : 'Activar'}
                </button>
              </div>
            ))
          : !error && (
              <div className="empty-state">
                <h2>No hay proveedores</h2>
                <p className="muted">Agregue el primero.</p>
              </div>
            )}
      </div>
    </>
  );
}
