'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { RoleGate } from '@/components/RoleGate';
import { StatusBadge } from '@/components/StatusBadge';
import { api, HttpError } from '@/lib/api';
import { useRole } from '@/lib/role';
import type { TipoVehiculo, Unidad } from '@/lib/types';

export default function UnidadesPage() {
  return (
    <RoleGate>
      <UnidadesList />
    </RoleGate>
  );
}

function UnidadesList() {
  const { role, userId, isAdmin } = useRole();
  const [numeroInterno, setNumeroInterno] = useState('');
  const [placas, setPlacas] = useState('');
  const [tipo, setTipo] = useState('');
  const [tipos, setTipos] = useState<TipoVehiculo[]>([]);
  const [unidades, setUnidades] = useState<Unidad[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function cargar(overrides?: {
    numeroInterno?: string;
    placas?: string;
    tipo?: string;
  }) {
    if (!role) return;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    const n = overrides?.numeroInterno ?? numeroInterno;
    const p = overrides?.placas ?? placas;
    const t = overrides?.tipo ?? tipo;
    if (n.trim()) params.set('numeroInterno', n.trim());
    if (p.trim()) params.set('placas', p.trim());
    if (t.trim()) params.set('tipo', t.trim());
    const qs = params.toString();
    try {
      const data = await api<Unidad[]>(`/unidades${qs ? `?${qs}` : ''}`, {
        role,
        userId,
      });
      setUnidades(data);
    } catch (err) {
      setUnidades([]);
      setError(
        err instanceof HttpError
          ? err.message
          : 'No se pudieron cargar las unidades.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void (async () => {
      if (!role) return;
      try {
        setTipos(await api<TipoVehiculo[]>('/tipos-vehiculo', { role, userId }));
      } catch {
        setTipos([]);
      }
      await cargar();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  function onSearch(event: FormEvent) {
    event.preventDefault();
    void cargar();
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Unidades</h1>
          <p className="lede">Consulte la flota por número interno, placas o tipo.</p>
        </div>
        {isAdmin ? (
          <Link className="btn btn-primary" href="/unidades/nueva">
            Nueva unidad
          </Link>
        ) : null}
      </div>

      <form className="card filters" onSubmit={onSearch}>
        <div className="field">
          <label htmlFor="numeroInterno">Número interno</label>
          <input
            id="numeroInterno"
            value={numeroInterno}
            onChange={(e) => setNumeroInterno(e.target.value)}
            placeholder="U-101"
          />
        </div>
        <div className="field">
          <label htmlFor="placas">Placas</label>
          <input
            id="placas"
            value={placas}
            onChange={(e) => setPlacas(e.target.value)}
            placeholder="TMX-101-A"
          />
        </div>
        <div className="field">
          <label htmlFor="tipo">Tipo</label>
          <select
            id="tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          >
            <option value="">Todos</option>
            {tipos.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="buscar">&nbsp;</label>
          <button id="buscar" className="btn btn-primary" type="submit">
            Buscar
          </button>
        </div>
      </form>

      {error ? (
        <div className="error-state">
          <h2>No se pudo consultar la flota</h2>
          <p>{error}</p>
        </div>
      ) : loading ? (
        <p className="muted">Cargando unidades…</p>
      ) : !unidades?.length ? (
        <div className="empty-state">
          <h2>No hay unidades que coincidan</h2>
          <p className="muted">
            Ajuste los filtros o verifique que el número interno y las placas
            estén escritos correctamente.
          </p>
        </div>
      ) : (
        <div className="card list">
          <div className="list-row list-head">
            <span>Interno</span>
            <span>Unidad</span>
            <span>Placas</span>
            <span>Estado</span>
            <span />
          </div>
          {unidades.map((unidad) => (
            <Link
              key={unidad.id}
              href={`/unidades/${unidad.id}`}
              className="list-row"
            >
              <span className="mono">{unidad.numeroInterno}</span>
              <span>
                {unidad.tipo.nombre}
                {unidad.marca ? ` · ${unidad.marca}` : ''}
                {unidad.modelo ? ` ${unidad.modelo}` : ''}
              </span>
              <span>{unidad.placas}</span>
              <StatusBadge estado={unidad.estado} />
              <span className="muted">→</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
