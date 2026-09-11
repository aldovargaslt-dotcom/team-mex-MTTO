'use client';

import { FormEvent, useEffect, useState } from 'react';
import { RoleGate } from '@/components/RoleGate';
import { PageHeader } from '@/components/ui/field';
import { api, HttpError } from '@/lib/api';
import { useRole } from '@/lib/role';
import type { TipoVehiculo, UmbralAndon } from '@/lib/types';

export default function ConfiguracionPage() {
  return (
    <RoleGate adminOnly>
      <ConfiguracionAdmin />
    </RoleGate>
  );
}

function ConfiguracionAdmin() {
  const { role, userId } = useRole();
  const [tipos, setTipos] = useState<TipoVehiculo[]>([]);
  const [umbrales, setUmbrales] = useState<Record<string, UmbralAndon>>({});
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tKm, setTkm] = useState('10000');
  const [tDias, setTdias] = useState('90');
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
      const created = await api<TipoVehiculo>('/tipos-vehiculo', {
        role: role!,
        userId,
        method: 'POST',
        body: JSON.stringify({
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || undefined,
        }),
      });
      await api(`/andon/umbrales/${created.id}`, {
        role: role!,
        userId,
        method: 'PATCH',
        body: JSON.stringify({
          tKm: Number(tKm),
          tDias: Number(tDias),
        }),
      });
      setNombre('');
      setDescripcion('');
      setTkm('10000');
      setTdias('90');
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
      <PageHeader
        title="Configuración"
        lede="Tipos de vehículo y reglas de mantenimiento (umbrales t_km / t_días)."
      />

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
        <div className="field">
          <label htmlFor="tKm">Regla t_km</label>
          <input
            id="tKm"
            type="number"
            min={1}
            required
            value={tKm}
            onChange={(e) => setTkm(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="tDias">Regla t_días</label>
          <input
            id="tDias"
            type="number"
            min={1}
            required
            value={tDias}
            onChange={(e) => setTdias(e.target.value)}
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
            <p className="muted">
              Agregue el primer tipo de vehículo y sus reglas Andon.
            </p>
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
                        aria-label="Regla kilómetros"
                        placeholder="t_km"
                      />
                      <input
                        type="number"
                        min={1}
                        value={editTdias}
                        onChange={(e) => setEditTdias(e.target.value)}
                        aria-label="Regla días"
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
                      Reglas: {(umbrales[tipo.id]?.tKm ?? 10000).toLocaleString('es-MX')} km
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
