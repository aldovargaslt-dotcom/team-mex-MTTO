'use client';

import { FormEvent, useEffect, useState } from 'react';
import { RoleGate } from '@/components/RoleGate';
import { api, HttpError } from '@/lib/api';
import { useRole } from '@/lib/role';
import type { TipoVehiculo } from '@/lib/types';

export default function TiposPage() {
  return (
    <RoleGate adminOnly>
      <TiposAdmin />
    </RoleGate>
  );
}

function TiposAdmin() {
  const { role, userId } = useRole();
  const [tipos, setTipos] = useState<TipoVehiculo[]>([]);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editDescripcion, setEditDescripcion] = useState('');

  async function cargar() {
    setTipos(await api<TipoVehiculo[]>('/tipos-vehiculo', { role: role!, userId }));
  }

  useEffect(() => {
    if (!role) return;
    void cargar().catch((err) => {
      setError(
        err instanceof HttpError
          ? err.message
          : 'No se pudieron cargar los tipos.',
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  async function crear(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await api<TipoVehiculo>('/tipos-vehiculo', {
        role: role!,
        userId,
        method: 'POST',
        body: JSON.stringify({
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || undefined,
        }),
      });
      setNombre('');
      setDescripcion('');
      await cargar();
    } catch (err) {
      setError(
        err instanceof HttpError ? err.message : 'No se pudo crear el tipo.',
      );
    }
  }

  async function guardarEdicion(id: string) {
    setError(null);
    try {
      await api<TipoVehiculo>(`/tipos-vehiculo/${id}`, {
        role: role!,
        userId,
        method: 'PATCH',
        body: JSON.stringify({
          nombre: editNombre.trim(),
          descripcion: editDescripcion.trim() || undefined,
        }),
      });
      setEditingId(null);
      await cargar();
    } catch (err) {
      setError(
        err instanceof HttpError
          ? err.message
          : 'No se pudo actualizar el tipo.',
      );
    }
  }

  async function eliminar(id: string) {
    setError(null);
    try {
      await api(`/tipos-vehiculo/${id}`, {
        role: role!,
        userId,
        method: 'DELETE',
      });
      await cargar();
    } catch (err) {
      setError(
        err instanceof HttpError
          ? err.message
          : 'No se pudo eliminar el tipo.',
      );
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Tipos de vehículo</h1>
          <p className="lede">Catálogo usado al dar de alta o filtrar unidades.</p>
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
            placeholder="Camión"
          />
        </div>
        <div className="field">
          <label htmlFor="descripcion">Descripción</label>
          <input
            id="descripcion"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Opcional"
          />
        </div>
        <div className="form-actions">
          <button className="btn btn-primary" type="submit">
            Agregar tipo
          </button>
        </div>
      </form>

      {error ? <p className="alert" style={{ margin: '12px 0' }}>{error}</p> : null}

      <div className="card list" style={{ marginTop: 12 }}>
        {tipos.length === 0 ? (
          <div className="empty-state">
            <h2>No hay tipos registrados</h2>
            <p className="muted">Agregue el primer tipo de vehículo para el catálogo.</p>
          </div>
        ) : (
          tipos.map((tipo) => (
            <div key={tipo.id} className="tipo-row">
              {editingId === tipo.id ? (
                <>
                  <div className="field">
                    <input
                      value={editNombre}
                      onChange={(e) => setEditNombre(e.target.value)}
                      aria-label="Nombre del tipo"
                    />
                    <input
                      value={editDescripcion}
                      onChange={(e) => setEditDescripcion(e.target.value)}
                      aria-label="Descripción del tipo"
                      placeholder="Descripción"
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => void guardarEdicion(tipo.id)}
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
                    <strong>{tipo.nombre}</strong>
                    <div className="muted">{tipo.descripcion || 'Sin descripción'}</div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setEditingId(tipo.id);
                      setEditNombre(tipo.nombre);
                      setEditDescripcion(tipo.descripcion ?? '');
                    }}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => void eliminar(tipo.id)}
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
