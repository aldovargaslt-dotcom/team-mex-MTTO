'use client';

import { FormEvent, useEffect, useState } from 'react';
import { RoleGate } from '@/components/RoleGate';
import { api, HttpError } from '@/lib/api';
import { useRole } from '@/lib/role';
import type { TipoVehiculo, UmbralAndon } from '@/lib/types';

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
  const [umbrales, setUmbrales] = useState<Record<string, UmbralAndon>>({});
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editDescripcion, setEditDescripcion] = useState('');
  const [editTkm, setEditTkm] = useState('10000');
  const [editTdias, setEditTdias] = useState('90');

  async function cargar() {
    const [lista, umb] = await Promise.all([
      api<TipoVehiculo[]>('/tipos-vehiculo', { role: role!, userId }),
      api<UmbralAndon[]>('/andon/umbrales', { role: role!, userId }),
    ]);
    setTipos(lista);
    setUmbrales(Object.fromEntries(umb.map((u) => [u.tipoVehiculoId, u])));
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
      await api(`/andon/umbrales/${id}`, {
        role: role!,
        userId,
        method: 'PATCH',
        body: JSON.stringify({
          tKm: Number(editTkm),
          tDias: Number(editTdias),
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
          <p className="lede">Catálogo y umbrales Andon (t_km / t_días) por tipo.</p>
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
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={1}
                        value={editTkm}
                        onChange={(e) => setEditTkm(e.target.value)}
                        aria-label="Umbral kilómetros"
                        placeholder="t_km"
                      />
                      <input
                        type="number"
                        min={1}
                        value={editTdias}
                        onChange={(e) => setEditTdias(e.target.value)}
                        aria-label="Umbral días"
                        placeholder="t_días"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline"
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
                    <div className="muted">
                      Andon: {(umbrales[tipo.id]?.tKm ?? 10000).toLocaleString('es-MX')} km
                      {' / '}
                      {umbrales[tipo.id]?.tDias ?? 90} días
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setEditingId(tipo.id);
                      setEditNombre(tipo.nombre);
                      setEditDescripcion(tipo.descripcion ?? '');
                      setEditTkm(String(umbrales[tipo.id]?.tKm ?? 10000));
                      setEditTdias(String(umbrales[tipo.id]?.tDias ?? 90));
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
