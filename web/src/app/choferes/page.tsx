'use client';

import { FormEvent, useEffect, useState } from 'react';
import { RoleGate } from '@/components/RoleGate';
import { api, HttpError } from '@/lib/api';
import { useRole } from '@/lib/role';
import type { Chofer } from '@/lib/types';

export default function ChoferesPage() {
  return (
    <RoleGate adminOnly>
      <ChoferesAdmin />
    </RoleGate>
  );
}

function ChoferesAdmin() {
  const { role, userId } = useRole();
  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState('');

  async function cargar() {
    setChoferes(await api<Chofer[]>('/choferes', { role: role!, userId }));
  }

  useEffect(() => {
    if (!role) return;
    void cargar().catch((err) => {
      setError(
        err instanceof HttpError
          ? err.message
          : 'No se pudieron cargar los choferes.',
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  async function crear(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await api<Chofer>('/choferes', {
        role: role!,
        userId,
        method: 'POST',
        body: JSON.stringify({ nombre: nombre.trim() }),
      });
      setNombre('');
      await cargar();
    } catch (err) {
      setError(
        err instanceof HttpError ? err.message : 'No se pudo crear el chofer.',
      );
    }
  }

  async function guardarEdicion(id: string) {
    setError(null);
    try {
      await api<Chofer>(`/choferes/${id}`, {
        role: role!,
        userId,
        method: 'PATCH',
        body: JSON.stringify({ nombre: editNombre.trim() }),
      });
      setEditingId(null);
      await cargar();
    } catch (err) {
      setError(
        err instanceof HttpError
          ? err.message
          : 'No se pudo actualizar el chofer.',
      );
    }
  }

  async function eliminar(id: string) {
    if (!window.confirm('¿Eliminar este chofer del catálogo?')) return;
    setError(null);
    try {
      await api(`/choferes/${id}`, {
        role: role!,
        userId,
        method: 'DELETE',
      });
      await cargar();
    } catch (err) {
      setError(
        err instanceof HttpError
          ? err.message
          : 'No se pudo eliminar el chofer.',
      );
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Choferes</h1>
          <p className="lede">
            Catálogo usado en las visitas de mantenimiento. El supervisor solo
            puede seleccionar; no da de alta.
          </p>
        </div>
      </div>

      <form className="card form-grid" onSubmit={crear}>
        <div className="field">
          <label htmlFor="nombre">Nombre</label>
          <input
            id="nombre"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Juan Pérez"
          />
        </div>
        <div className="form-actions">
          <button className="btn btn-primary" type="submit">
            Agregar chofer
          </button>
        </div>
      </form>

      {error ? <p className="alert" style={{ margin: '12px 0' }}>{error}</p> : null}

      <div className="card list" style={{ marginTop: 12 }}>
        {choferes.length === 0 ? (
          <div className="empty-state">
            <h2>No hay choferes registrados</h2>
            <p className="muted">
              Agregue el primer chofer. Sin catálogo el supervisor no puede
              avanzar una visita.
            </p>
          </div>
        ) : (
          choferes.map((chofer) => (
            <div key={chofer.id} className="tipo-row">
              {editingId === chofer.id ? (
                <>
                  <div className="field">
                    <input
                      value={editNombre}
                      onChange={(e) => setEditNombre(e.target.value)}
                      aria-label="Nombre del chofer"
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => void guardarEdicion(chofer.id)}
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setEditingId(null)}
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <strong>{chofer.nombre}</strong>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setEditingId(chofer.id);
                      setEditNombre(chofer.nombre);
                    }}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => void eliminar(chofer.id)}
                  >
                    Eliminar
                  </button>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}
