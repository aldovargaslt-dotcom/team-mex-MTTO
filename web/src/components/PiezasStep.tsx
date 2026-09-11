'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, HttpError } from '@/lib/api';
import { etiquetaOrigenPieza } from '@/lib/format';
import type { OrigenPieza, SkuCompatible, VisitaPieza } from '@/lib/types';

export type PiezaLinea = {
  itemId: string;
  sku: string;
  nombre: string;
  qty: number;
  origen: OrigenPieza;
  stock: number;
};

export function lineasDesdeVisita(piezas: VisitaPieza[]): PiezaLinea[] {
  return piezas.map((p) => ({
    itemId: p.itemId,
    sku: p.sku,
    nombre: p.nombre,
    qty: p.qty,
    origen: p.origen,
    stock: p.stock,
  }));
}

export function piezasInsuficientes(lineas: PiezaLinea[]) {
  return lineas.filter(
    (linea) => linea.origen === 'DESDE_STOCK' && linea.qty > linea.stock,
  );
}

export function PiezasStep({
  role,
  userId,
  tipoVehiculoId,
  tipoVehiculoNombre,
  lineas,
  onChange,
}: {
  role: string;
  userId?: string;
  tipoVehiculoId: string | null;
  tipoVehiculoNombre: string | null;
  lineas: PiezaLinea[];
  onChange: (lineas: PiezaLinea[]) => void;
}) {
  const [q, setQ] = useState('');
  const [resultados, setResultados] = useState<SkuCompatible[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tipoVehiculoId) return;
    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          const params = new URLSearchParams({ tipoVehiculoId });
          if (q.trim()) params.set('q', q.trim());
          const data = await api<SkuCompatible[]>(
            `/inventario/skus?${params.toString()}`,
            { role, userId },
          );
          setResultados(data);
          setError(null);
        } catch (err) {
          setError(
            err instanceof HttpError
              ? err.message
              : 'No se pudieron buscar SKUs compatibles.',
          );
        }
      })();
    }, 200);
    return () => window.clearTimeout(handle);
  }, [q, tipoVehiculoId, role, userId]);

  const usados = useMemo(() => new Set(lineas.map((l) => l.itemId)), [lineas]);
  const alertas = piezasInsuficientes(lineas);

  function agregar(item: SkuCompatible) {
    if (usados.has(item.id)) return;
    onChange([
      ...lineas,
      {
        itemId: item.id,
        sku: item.sku,
        nombre: item.nombre,
        qty: 1,
        origen: item.stock > 0 ? 'DESDE_STOCK' : 'COMPRA_EXTERNA',
        stock: item.stock,
      },
    ]);
  }

  function actualizar(itemId: string, patch: Partial<PiezaLinea>) {
    onChange(lineas.map((linea) => (linea.itemId === itemId ? { ...linea, ...patch } : linea)));
  }

  return (
    <section className="card panel">
      <h2>Piezas</h2>
      <p className="muted">
        SKUs compatibles con {tipoVehiculoNombre ?? 'el tipo de la unidad'}. Opcional.
        Si la cantidad supera el stock, use compra externa o reduzca.
      </p>
      <div className="field">
        <label htmlFor="skuSearch">Buscar SKU</label>
        <input
          id="skuSearch"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="SKU, nombre u OEM"
        />
      </div>
      {error ? <p className="alert" style={{ marginTop: 8 }}>{error}</p> : null}
      <ul className="sku-results">
        {resultados.slice(0, 8).map((item) => (
          <li key={item.id}>
            <div>
              <strong className="mono">{item.sku}</strong> {item.nombre}
              <div className="muted">Stock {item.stock} {item.uom}</div>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-compact"
              disabled={usados.has(item.id)}
              onClick={() => agregar(item)}
            >
              {usados.has(item.id) ? 'Agregado' : 'Agregar'}
            </button>
          </li>
        ))}
      </ul>
      {lineas.length === 0 ? (
        <p className="muted" style={{ marginTop: 12 }}>
          Sin piezas en esta visita.
        </p>
      ) : (
        <table className="data-table" style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Qty</th>
              <th>Stock</th>
              <th>Origen</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {lineas.map((linea) => {
              const insuficiente =
                linea.origen === 'DESDE_STOCK' && linea.qty > linea.stock;
              return (
                <tr key={linea.itemId} className={insuficiente ? 'row-warn' : undefined}>
                  <td>
                    <span className="mono">{linea.sku}</span>
                    <div className="muted">{linea.nombre}</div>
                    {insuficiente ? (
                      <p className="alert" style={{ marginTop: 4 }}>
                        Stock insuficiente (hay {linea.stock}). Use Compra externa o
                        reduzca la cantidad.
                      </p>
                    ) : null}
                  </td>
                  <td>
                    <input
                      className="qty-input"
                      type="number"
                      min={1}
                      step={1}
                      value={linea.qty}
                      aria-label={`Cantidad ${linea.sku}`}
                      onChange={(e) => {
                        const value = Math.max(1, Math.floor(Number(e.target.value) || 1));
                        actualizar(linea.itemId, { qty: value });
                      }}
                    />
                  </td>
                  <td className="mono">{linea.stock}</td>
                  <td>
                    <select
                      value={linea.origen}
                      aria-label={`Origen ${linea.sku}`}
                      onChange={(e) =>
                        actualizar(linea.itemId, {
                          origen: e.target.value as OrigenPieza,
                        })
                      }
                    >
                      <option value="DESDE_STOCK">Desde stock</option>
                      <option value="COMPRA_EXTERNA">Compra externa</option>
                    </select>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-danger btn-compact"
                      onClick={() =>
                        onChange(lineas.filter((l) => l.itemId !== linea.itemId))
                      }
                    >
                      Quitar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {alertas.length ? (
        <p className="note note-warn">
          {alertas.length} línea(s) superan el stock. Solo puede continuar con
          compra externa o reduciendo la cantidad. No se permiten existencias
          negativas.
        </p>
      ) : null}
    </section>
  );
}

export function PiezasReadonly({ piezas }: { piezas: VisitaPieza[] }) {
  if (!piezas.length) {
    return (
      <section className="card panel" style={{ marginTop: 12 }}>
        <h2>Piezas</h2>
        <p className="muted">Sin piezas.</p>
      </section>
    );
  }
  return (
    <section className="card panel" style={{ marginTop: 12 }}>
      <h2>Piezas</h2>
      <ul className="plain-list">
        {piezas.map((pieza) => (
          <li key={pieza.id}>
            <span className="mono">{pieza.sku}</span> {pieza.nombre} · {pieza.qty}{' '}
            pza · {etiquetaOrigenPieza(pieza.origen)}
          </li>
        ))}
      </ul>
    </section>
  );
}
