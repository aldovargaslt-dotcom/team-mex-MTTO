'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, HttpError } from '@/lib/api';
import { etiquetaOrigenPieza, etiquetaUom } from '@/lib/format';
import type { ItemInventario, OrigenPieza, SkuCompatible, VisitaPieza } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormAlert, Note } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type PiezaLinea = {
  itemId: string;
  sku: string;
  nombre: string;
  qty: number;
  origen: OrigenPieza;
  stock: number;
  uom?: string;
};

export function lineasDesdeVisita(piezas: VisitaPieza[]): PiezaLinea[] {
  return piezas.map((p) => ({
    itemId: p.itemId,
    sku: p.itemId,
    nombre: 'Refacción',
    qty: p.qty,
    origen: p.origen,
    stock: 0,
  }));
}

export async function hydratePiezasFromInventario(
  piezas: VisitaPieza[],
  opts: { role: string; userId?: string },
): Promise<PiezaLinea[]> {
  if (!piezas.length) {
    return [];
  }
  const ids = [...new Set(piezas.map((p) => p.itemId))].join(',');
  const items = await api<ItemInventario[]>(`/inventario/items?ids=${ids}`, opts);
  const byId = new Map(items.map((item) => [item.id, item]));
  return piezas.map((p) => {
    const item = byId.get(p.itemId);
    return {
      itemId: p.itemId,
      sku: item?.sku ?? p.itemId,
      nombre: item?.nombre ?? 'Refacción',
      qty: p.qty,
      origen: p.origen,
      stock: item?.stock ?? 0,
      uom: item?.uom,
    };
  });
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
        uom: item.uom,
      },
    ]);
  }

  function actualizar(itemId: string, patch: Partial<PiezaLinea>) {
    onChange(lineas.map((linea) => (linea.itemId === itemId ? { ...linea, ...patch } : linea)));
  }

  return (
    <Card className="p-3">
      <h2 className="text-[13px] font-semibold">Piezas</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        SKUs compatibles con {tipoVehiculoNombre ?? 'el tipo de la unidad'}. Opcional.
        Si la cantidad supera el stock, use compra externa o reduzca.
      </p>

      {lineas.length > 0 ? (
        <div className="mt-4 grid gap-2">
          <h3 className="text-sm font-semibold text-navy">En esta visita</h3>
          {lineas.map((linea) => {
            const insuficiente =
              linea.origen === 'DESDE_STOCK' && linea.qty > linea.stock;
            return (
              <div
                key={linea.itemId}
                className={cn(
                  'grid gap-2 rounded-md border border-border p-2.5',
                  insuficiente && 'border-[#ead0b3] bg-[#fff4e8]',
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-mono font-semibold">{linea.sku}</p>
                    <p className="text-sm">{linea.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      Stock {linea.stock} {etiquetaUom(linea.uom)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {linea.origen === 'COMPRA_EXTERNA' ? (
                      <Badge variant="warning">Pendiente de comprobante</Badge>
                    ) : null}
                    <Button
                      type="button"
                      variant="destructive"
                      size="compact"
                      onClick={() =>
                        onChange(lineas.filter((l) => l.itemId !== linea.itemId))
                      }
                    >
                      Quitar
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                    Cantidad
                    <Input
                      className="qty-input w-[72px]"
                      type="number"
                      min={1}
                      step={1}
                      value={linea.qty}
                      aria-label={`Cantidad ${linea.sku}`}
                      aria-invalid={insuficiente || undefined}
                      onChange={(e) => {
                        const value = Math.max(1, Math.floor(Number(e.target.value) || 1));
                        actualizar(linea.itemId, { qty: value });
                      }}
                    />
                  </label>
                  <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                    Origen
                    <NativeSelect
                      className="h-11 min-h-11 w-[160px] md:h-9 md:min-h-9"
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
                    </NativeSelect>
                  </label>
                </div>
                {insuficiente ? (
                  <div className="grid gap-2">
                    <FormAlert>
                      Stock insuficiente (hay {linea.stock} {etiquetaUom(linea.uom)}).
                      Use compra externa o reduzca la cantidad.
                    </FormAlert>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() =>
                        actualizar(linea.itemId, { origen: 'COMPRA_EXTERNA' })
                      }
                    >
                      Usar compra externa
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Sin piezas en esta visita.</p>
      )}

      <div className="mt-4 grid gap-1">
        <label htmlFor="skuSearch" className="text-xs font-medium text-muted-foreground">
          Buscar SKU
        </label>
        <Input
          id="skuSearch"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="SKU, nombre u OEM"
        />
      </div>
      {error ? <FormAlert>{error}</FormAlert> : null}
      <ul className="sku-results">
        {resultados.slice(0, 8).map((item) => {
          const enOt = usados.has(item.id);
          return (
            <li key={item.id}>
              <button
                type="button"
                className="sku-result-hit"
                disabled={enOt}
                onClick={() => agregar(item)}
              >
                <div>
                  <strong className="mono">{item.sku}</strong> {item.nombre}
                  <div className="muted">
                    Stock {item.stock} {etiquetaUom(item.uom)}
                  </div>
                </div>
                {enOt ? (
                  <Badge variant="navy">En la visita</Badge>
                ) : (
                  <span className="text-sm font-medium text-navy">Agregar</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {alertas.length ? (
        <Note variant="warn">
          {alertas.length === 1
            ? '1 línea supera el stock.'
            : `${alertas.length} líneas superan el stock.`}{' '}
          Use compra externa o reduzca la cantidad para continuar. No se permiten existencias negativas.
        </Note>
      ) : null}
    </Card>
  );
}

export function PiezasReadonly({ piezas }: { piezas: PiezaLinea[] }) {
  if (!piezas.length) {
    return (
      <Card className="mt-3 p-3">
        <h2 className="text-[13px] font-semibold">Piezas</h2>
        <p className="mt-1 text-xs text-muted-foreground">Sin piezas.</p>
      </Card>
    );
  }
  return (
    <Card className="mt-3 p-3">
      <h2 className="text-[13px] font-semibold">Piezas</h2>
      <ul className="plain-list mt-2">
        {piezas.map((pieza) => (
          <li key={pieza.itemId}>
            <span className="mono">{pieza.sku}</span> {pieza.nombre} · {pieza.qty}{' '}
            {etiquetaUom(pieza.uom)} · {etiquetaOrigenPieza(pieza.origen)}
          </li>
        ))}
      </ul>
    </Card>
  );
}
