'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { EstadoUnidad, TipoVehiculo, Unidad } from '@/lib/types';

export type UnidadFormValues = {
  numeroInterno: string;
  placas: string;
  tipoId: string;
  estado: EstadoUnidad;
  marca: string;
  modelo: string;
  anio: string;
  kilometraje: string;
};

export function UnidadForm({
  role,
  userId,
  initial,
  submitLabel,
  onSubmit,
  error,
}: {
  role: string;
  userId: string;
  initial?: Partial<Unidad>;
  submitLabel: string;
  onSubmit: (values: UnidadFormValues) => Promise<void>;
  error: string | null;
}) {
  const [tipos, setTipos] = useState<TipoVehiculo[]>([]);
  const [values, setValues] = useState<UnidadFormValues>({
    numeroInterno: initial?.numeroInterno ?? '',
    placas: initial?.placas ?? '',
    tipoId: initial?.tipo?.id ?? '',
    estado: initial?.estado ?? 'ACTIVA',
    marca: initial?.marca ?? '',
    modelo: initial?.modelo ?? '',
    anio: initial?.anio != null ? String(initial.anio) : '',
    kilometraje:
      initial?.kilometraje != null ? String(initial.kilometraje) : '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      setTipos(await api<TipoVehiculo[]>('/tipos-vehiculo', { role, userId }));
    })();
  }, [role, userId]);

  useEffect(() => {
    if (!initial) return;
    setValues({
      numeroInterno: initial.numeroInterno ?? '',
      placas: initial.placas ?? '',
      tipoId: initial.tipo?.id ?? '',
      estado: initial.estado ?? 'ACTIVA',
      marca: initial.marca ?? '',
      modelo: initial.modelo ?? '',
      anio: initial.anio != null ? String(initial.anio) : '',
      kilometraje:
        initial.kilometraje != null ? String(initial.kilometraje) : '',
    });
  }, [initial]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit(values);
    } finally {
      setSaving(false);
    }
  }

  function set<K extends keyof UnidadFormValues>(
    key: K,
    value: UnidadFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  return (
    <form className="card form-grid" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="numeroInterno">Número interno</label>
        <input
          id="numeroInterno"
          required
          value={values.numeroInterno}
          onChange={(e) => set('numeroInterno', e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="placas">Placas</label>
        <input
          id="placas"
          required
          value={values.placas}
          onChange={(e) => set('placas', e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="tipoId">Tipo</label>
        <select
          id="tipoId"
          required
          value={values.tipoId}
          onChange={(e) => set('tipoId', e.target.value)}
        >
          <option value="">Seleccione un tipo</option>
          {tipos.map((tipo) => (
            <option key={tipo.id} value={tipo.id}>
              {tipo.nombre}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="estado">Estado</label>
        <select
          id="estado"
          value={values.estado}
          onChange={(e) => set('estado', e.target.value as EstadoUnidad)}
        >
          <option value="ACTIVA">Activa</option>
          <option value="INACTIVA">Inactiva</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="marca">Marca</label>
        <input
          id="marca"
          value={values.marca}
          onChange={(e) => set('marca', e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="modelo">Modelo</label>
        <input
          id="modelo"
          value={values.modelo}
          onChange={(e) => set('modelo', e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="anio">Año</label>
        <input
          id="anio"
          type="number"
          min={1980}
          max={2100}
          value={values.anio}
          onChange={(e) => set('anio', e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="kilometraje">Kilometraje</label>
        <input
          id="kilometraje"
          type="number"
          min={0}
          value={values.kilometraje}
          onChange={(e) => set('kilometraje', e.target.value)}
        />
      </div>
      {error ? <p className="alert">{error}</p> : null}
      <div className="form-actions">
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? 'Guardando…' : submitLabel}
        </button>
        <a className="btn btn-secondary" href="/unidades">
          Cancelar
        </a>
      </div>
    </form>
  );
}

export function toPayload(values: UnidadFormValues) {
  return {
    numeroInterno: values.numeroInterno.trim(),
    placas: values.placas.trim(),
    tipoId: values.tipoId,
    estado: values.estado,
    marca: values.marca.trim() || undefined,
    modelo: values.modelo.trim() || undefined,
    anio: values.anio ? Number(values.anio) : undefined,
    kilometraje: values.kilometraje ? Number(values.kilometraje) : undefined,
  };
}
