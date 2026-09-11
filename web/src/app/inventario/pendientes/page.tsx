'use client';

import { useEffect, useState } from 'react';
import { api, HttpError } from '@/lib/api';
import { formatFecha } from '@/lib/format';
import { useRole } from '@/lib/role';
import type { PendienteComprobante } from '@/lib/types';

export default function PendientesPage() {
  const { role, userId } = useRole();
  const [rows, setRows] = useState<PendienteComprobante[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!role) return;
    void (async () => {
      try {
        setRows(
          await api<PendienteComprobante[]>('/inventario/pendientes-comprobante', {
            role,
            userId,
          }),
        );
      } catch (err) {
        setError(
          err instanceof HttpError
            ? err.message
            : 'No se pudieron cargar los pendientes.',
        );
      }
    })();
  }, [role, userId]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Pendientes de comprobante</h1>
          <p className="lede">
            Compras externas usadas en una visita. No mueven stock. PO formal queda fuera de v0.
          </p>
        </div>
      </div>
      {error ? <p className="alert">{error}</p> : null}
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>SKU</th>
              <th>Nombre</th>
              <th>Qty</th>
              <th>Estado</th>
              <th>Visita</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">
                  No hay compras externas pendientes.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>{formatFecha(row.createdAt)}</td>
                  <td className="mono">{row.sku}</td>
                  <td>{row.nombre}</td>
                  <td className="mono">{row.qty}</td>
                  <td>
                    <span className="badge badge-inactiva">{row.estado}</span>
                  </td>
                  <td className="muted">{row.visitaId.slice(0, 8)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
