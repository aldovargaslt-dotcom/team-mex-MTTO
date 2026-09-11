'use client';

import { FormEvent, Fragment, useEffect, useState } from 'react';
import { api, HttpError } from '@/lib/api';
import { useRole } from '@/lib/role';
import type { Familia, ItemInventario, Proveedor, TipoVehiculo } from '@/lib/types';

export default function ItemsPage() {
  const { role, userId } = useRole();
  const [items, setItems] = useState<ItemInventario[]>([]);
  const [familias, setFamilias] = useState<Familia[]>([]);
  const [tipos, setTipos] = useState<TipoVehiculo[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sku, setSku] = useState('');
  const [nombre, setNombre] = useState('');
  const [familiaId, setFamiliaId] = useState('');
  const [oem, setOem] = useState('');
  const [tipoIds, setTipoIds] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [provId, setProvId] = useState('');
  const [codigoProv, setCodigoProv] = useState('');

  async function cargar() {
    const [lista, fams, tps, provs] = await Promise.all([
      api<ItemInventario[]>('/inventario/items', { role: role!, userId }),
      api<Familia[]>('/inventario/familias', { role: role!, userId }),
      api<TipoVehiculo[]>('/tipos-vehiculo', { role: role!, userId }),
      api<Proveedor[]>('/inventario/proveedores', { role: role!, userId }),
    ]);
    setItems(lista);
    setFamilias(fams.filter((f) => f.activa));
    setTipos(tps);
    setProveedores(provs.filter((p) => p.activo));
    if (!familiaId && fams[0]) setFamiliaId(fams[0].id);
  }

  useEffect(() => {
    if (!role) return;
    void cargar().catch((err) => {
      setError(err instanceof HttpError ? err.message : 'No se pudieron cargar los ítems.');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  function toggleTipo(id: string) {
    setTipoIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function crear(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await api('/inventario/items', {
        role: role!,
        userId,
        method: 'POST',
        body: JSON.stringify({
          sku: sku.trim(),
          nombre: nombre.trim(),
          familiaId,
          oem: oem.trim() || undefined,
          tipoVehiculoIds: [...tipoIds],
        }),
      });
      setSku('');
      setNombre('');
      setOem('');
      setTipoIds(new Set());
      await cargar();
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'No se pudo crear el ítem.');
    }
  }

  async function toggleActivo(item: ItemInventario) {
    setError(null);
    try {
      await api(`/inventario/items/${item.id}`, {
        role: role!,
        userId,
        method: 'PATCH',
        body: JSON.stringify({ activo: !item.activo }),
      });
      await cargar();
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'No se pudo actualizar.');
    }
  }

  async function toggleCompat(item: ItemInventario, tipoId: string, checked: boolean) {
    setError(null);
    try {
      if (checked) {
        await api(`/inventario/items/${item.id}/compatibilidad`, {
          role: role!,
          userId,
          method: 'POST',
          body: JSON.stringify({ tipoVehiculoId: tipoId }),
        });
      } else {
        await api(`/inventario/items/${item.id}/compatibilidad/${tipoId}`, {
          role: role!,
          userId,
          method: 'DELETE',
        });
      }
      await cargar();
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'No se pudo guardar la compatibilidad.');
    }
  }

  async function addProveedor(itemId: string, event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await api(`/inventario/items/${itemId}/proveedores`, {
        role: role!,
        userId,
        method: 'POST',
        body: JSON.stringify({
          proveedorId: provId,
          codigoProveedor: codigoProv.trim(),
          preferido: true,
        }),
      });
      setProvId('');
      setCodigoProv('');
      await cargar();
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'No se pudo vincular el proveedor.');
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Ítems</h1>
          <p className="lede">
            SKU único, familia y compatibilidad por tipo de vehículo. UoM: pieza.
          </p>
        </div>
      </div>

      <form className="card form-grid" onSubmit={crear}>
        <div className="field">
          <label htmlFor="sku">SKU</label>
          <input
            id="sku"
            required
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="FIL-ACEITE-01"
          />
        </div>
        <div className="field">
          <label htmlFor="itemNombre">Nombre</label>
          <input
            id="itemNombre"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Filtro de aceite"
          />
        </div>
        <div className="field">
          <label htmlFor="familiaId">Familia</label>
          <select
            id="familiaId"
            required
            value={familiaId}
            onChange={(e) => setFamiliaId(e.target.value)}
          >
            <option value="">Seleccione</option>
            {familias.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="oem">OEM</label>
          <input
            id="oem"
            value={oem}
            onChange={(e) => setOem(e.target.value)}
            placeholder="Opcional"
          />
        </div>
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <span className="muted">Compatibilidad</span>
          <div className="chip-row">
            {tipos.map((tipo) => (
              <label key={tipo.id} className="check">
                <input
                  type="checkbox"
                  checked={tipoIds.has(tipo.id)}
                  onChange={() => toggleTipo(tipo.id)}
                />
                {tipo.nombre}
              </label>
            ))}
          </div>
        </div>
        <div className="form-actions">
          <button className="btn btn-primary" type="submit" disabled={!familiaId}>
            Agregar ítem
          </button>
        </div>
      </form>

      {error ? <p className="alert" style={{ margin: '12px 0' }}>{error}</p> : null}

      <div className="card" style={{ marginTop: 12, overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Nombre</th>
              <th>Familia</th>
              <th>Stock</th>
              <th>Estado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">
                  No hay ítems. Cree una familia y el primer SKU.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <Fragment key={item.id}>
                  <tr>
                    <td className="mono">{item.sku}</td>
                    <td>
                      {item.nombre}
                      {item.oem ? <div className="muted">OEM {item.oem}</div> : null}
                    </td>
                    <td>{item.familiaNombre}</td>
                    <td className="mono">{item.stock}</td>
                    <td>
                      <span className={item.activo ? 'badge badge-activa' : 'badge badge-inactiva'}>
                        {item.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="row-actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-compact"
                        onClick={() => setOpenId(openId === item.id ? null : item.id)}
                      >
                        Detalle
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-compact"
                        onClick={() => void toggleActivo(item)}
                      >
                        {item.activo ? 'Inactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                  {openId === item.id ? (
                    <tr className="detail-row">
                      <td colSpan={6}>
                        <p className="muted">Compatibilidad (tipo de vehículo)</p>
                        <div className="chip-row">
                          {tipos.map((tipo) => (
                            <label key={tipo.id} className="check">
                              <input
                                type="checkbox"
                                checked={item.tipoVehiculoIds.includes(tipo.id)}
                                onChange={(e) =>
                                  void toggleCompat(item, tipo.id, e.target.checked)
                                }
                              />
                              {tipo.nombre}
                            </label>
                          ))}
                        </div>
                        <p className="muted" style={{ marginTop: 10 }}>
                          Proveedores
                        </p>
                        {item.proveedores.length === 0 ? (
                          <p className="muted">Sin código de proveedor.</p>
                        ) : (
                          <ul className="plain-list">
                            {item.proveedores.map((p) => (
                              <li key={p.id}>
                                {p.proveedorNombre} · {p.codigoProveedor}
                                {p.preferido ? ' · preferido' : ''}
                              </li>
                            ))}
                          </ul>
                        )}
                        <form
                          className="inline-form"
                          onSubmit={(e) => void addProveedor(item.id, e)}
                        >
                          <select
                            value={provId}
                            onChange={(e) => setProvId(e.target.value)}
                            required
                            aria-label="Proveedor"
                          >
                            <option value="">Proveedor</option>
                            {proveedores.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.nombre}
                              </option>
                            ))}
                          </select>
                          <input
                            value={codigoProv}
                            onChange={(e) => setCodigoProv(e.target.value)}
                            placeholder="Código proveedor"
                            required
                            aria-label="Código proveedor"
                          />
                          <button className="btn btn-primary btn-compact" type="submit">
                            Vincular
                          </button>
                        </form>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
