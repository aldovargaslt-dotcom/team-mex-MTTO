'use client';

import { useEffect, useState } from 'react';
import { api, HttpError } from '@/lib/api';
import { etiquetaMovimiento, formatFecha } from '@/lib/format';
import { useRole } from '@/lib/role';
import type { Movimiento } from '@/lib/types';

export default function MovimientosPage() {
  const { role, userId } = useRole();
  const [rows, setRows] = useState<Movimiento[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!role) return;
    void (async () => {
      try {
        setRows(await api<Movimiento[]>('/inventario/movimientos', { role, userId }));
      } catch (err) {
        setError(
          err instanceof HttpError ? err.message : 'No se pudieron cargar los movimientos.',
        );
      }
    })();
  }, [role, userId]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Movimientos</h1>
          <p className="lede">Entradas, salidas por OT y ajustes. Sin kardex pesado.</p>
        </div>
      </div>
      {error ? <p className="alert">{error}</p> : null}
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>SKU</th>
              <th>Qty</th>
              <th>Delta</th>
              <th>Visita</th>
              <th>Nota</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="muted">
                  Aún no hay movimientos.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>{formatFecha(row.createdAt)}</td>
                  <td>{etiquetaMovimiento(row.tipo)}</td>
                  <td className="mono">{row.sku}</td>
                  <td className="mono">{row.qty}</td>
                  <td className="mono">{row.delta > 0 ? `+${row.delta}` : row.delta}</td>
                  <td className="muted">{row.visitaId ? row.visitaId.slice(0, 8) : '—'}</td>
                  <td>{row.nota || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
