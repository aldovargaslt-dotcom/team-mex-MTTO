'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, HttpError } from '@/lib/api';
import { useRole } from '@/lib/role';
import type { StockRow } from '@/lib/types';

export default function StockPage() {
  const { role, userId } = useRole();
  const [rows, setRows] = useState<StockRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [itemId, setItemId] = useState<string | null>(null);
  const [mode, setMode] = useState<'entrada' | 'ajuste' | null>(null);
  const [qty, setQty] = useState('1');
  const [nota, setNota] = useState('');

  async function cargar() {
    setRows(await api<StockRow[]>('/inventario/stock', { role: role!, userId }));
  }

  useEffect(() => {
    if (!role) return;
    void cargar().catch((err) => {
      setError(err instanceof HttpError ? err.message : 'No se pudo cargar el stock.');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  function abrir(id: string, next: 'entrada' | 'ajuste') {
    setItemId(id);
    setMode(next);
    setQty(next === 'ajuste' ? '-1' : '1');
    setNota('');
    setError(null);
  }

  async function aplicar(event: FormEvent) {
    event.preventDefault();
    if (!itemId || !mode) return;
    setError(null);
    try {
      if (mode === 'entrada') {
        await api('/inventario/movimientos/entrada', {
          role: role!,
          userId,
          method: 'POST',
          body: JSON.stringify({
            itemId,
            qty: Number(qty),
            nota: nota.trim() || undefined,
          }),
        });
      } else {
        await api('/inventario/movimientos/ajuste', {
          role: role!,
          userId,
          method: 'POST',
          body: JSON.stringify({
            itemId,
            qtyDelta: Number(qty),
            nota: nota.trim() || undefined,
          }),
        });
      }
      setItemId(null);
      setMode(null);
      await cargar();
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'No se pudo registrar el movimiento.');
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Stock</h1>
          <p className="lede">Almacén único. No se permiten existencias negativas.</p>
        </div>
      </div>
      {error ? <p className="alert" style={{ marginBottom: 12 }}>{error}</p> : null}
      {mode && itemId ? (
        <form className="card form-grid" onSubmit={aplicar} style={{ marginBottom: 12 }}>
          <div className="field">
            <label htmlFor="qty">{mode === 'entrada' ? 'Cantidad de entrada' : 'Ajuste (con signo)'}</label>
            <input
              id="qty"
              type="number"
              required
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              min={mode === 'entrada' ? 1 : undefined}
              step={1}
            />
          </div>
          <div className="field">
            <label htmlFor="nota">Nota</label>
            <input
              id="nota"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Opcional"
            />
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit">
              {mode === 'entrada' ? 'Registrar entrada' : 'Aplicar ajuste'}
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => {
                setMode(null);
                setItemId(null);
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null}
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Nombre</th>
              <th>Familia</th>
              <th>Qty</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.itemId}>
                <td className="mono">{row.sku}</td>
                <td>{row.nombre}</td>
                <td>{row.familia}</td>
                <td className="mono">{row.qty}</td>
                <td className="row-actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-compact"
                    onClick={() => abrir(row.itemId, 'entrada')}
                  >
                    Entrada
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-compact"
                    onClick={() => abrir(row.itemId, 'ajuste')}
                  >
                    Ajuste
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
