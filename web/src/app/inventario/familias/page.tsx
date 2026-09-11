'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, HttpError } from '@/lib/api';
import { useRole } from '@/lib/role';
import type { Familia } from '@/lib/types';
import { PageHeader } from '@/components/ui/field';

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
      setError(err instanceof HttpError ? err.message : 'No se pudieron cargar las familias.');
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
      setError(err instanceof HttpError ? err.message : 'No se pudo crear la familia.');
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
      <PageHeader title="Familias" />
      <form className="card form-grid" onSubmit={crear}>
        <div className="field">
          <label htmlFor="famNombre">Nombre</label>
          <input
            id="famNombre"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Filtros"
          />
        </div>
        <div className="form-actions">
          <button className="btn btn-primary" type="submit">
            Agregar familia
          </button>
        </div>
      </form>
      {error ? <p className="alert" style={{ margin: '12px 0' }}>{error}</p> : null}
      <div className="card list" style={{ marginTop: 12 }}>
        {familias.length === 0 ? (
          <div className="empty-state">
            <h2>No hay familias</h2>
            <p className="muted">Agregue la primera.</p>
          </div>
        ) : (
          familias.map((familia) => (
            <div key={familia.id} className="tipo-row">
              <div>
                <strong>{familia.nombre}</strong>
                <div className="muted">{familia.activa ? 'Activa' : 'Inactiva'}</div>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => void toggle(familia)}
              >
                {familia.activa ? 'Inactivar' : 'Activar'}
              </button>
            </div>
          ))
        )}
      </div>
    </>
  );
}
