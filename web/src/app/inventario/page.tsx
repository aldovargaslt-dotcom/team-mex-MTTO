"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { api, HttpError } from "@/lib/api";
import { etiquetaUom } from "@/lib/format";
import { useRole } from "@/lib/role";
import type {
  Familia,
  ItemInventario,
  Proveedor,
  TipoVehiculo,
} from "@/lib/types";
import {
  InventarioMovimientoSheet,
  type MovimientoSheetMode,
} from "@/components/InventarioMovimientoSheet";
import { RefaccionFicha } from "@/components/RefaccionFicha";
import { Badge } from "@/components/ui/badge";
import { StockAlertaBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FormAlert, Note, PageHeader } from "@/components/ui/field";
import { Hint } from "@/components/ui/hint";
import { Input, NativeSelect } from "@/components/ui/input";

export default function ItemsPage() {
  const { role, userId } = useRole();
  const [items, setItems] = useState<ItemInventario[]>([]);
  const [familias, setFamilias] = useState<Familia[]>([]);
  const [tipos, setTipos] = useState<TipoVehiculo[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<ItemInventario | null>(null);
  const [activeFilter, setActiveFilter] = useState("active");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [openNuevo, setOpenNuevo] = useState(false);
  const [sku, setSku] = useState("");
  const [nombre, setNombre] = useState("");
  const [familiaId, setFamiliaId] = useState("");
  const [oem, setOem] = useState("");
  const [tipoIds, setTipoIds] = useState<Set<string>>(new Set());
  const [ficha, setFicha] = useState<ItemInventario | null>(null);
  const [itemId, setItemId] = useState("");
  const [mode, setMode] = useState<MovimientoSheetMode | null>(null);

  async function cargar() {
    setLoading(true);
    setError(null);
    const [lista, fams, tps, provs] = await Promise.allSettled([
      api<ItemInventario[]>("/inventario/items", { role: role!, userId }),
      api<Familia[]>("/inventario/familias", { role: role!, userId }),
      api<TipoVehiculo[]>("/unidades/tipos", { role: role!, userId }),
      api<Proveedor[]>("/inventario/proveedores", { role: role!, userId }),
    ]);
    if (lista.status === "fulfilled") setItems(lista.value);
    else setError("No se pudieron cargar las refacciones.");
    if (fams.status === "fulfilled") {
      setFamilias(fams.value.filter((f) => f.activa));
      if (!familiaId) setFamiliaId(fams.value.find((f) => f.activa)?.id ?? "");
    }
    if (tps.status === "fulfilled") setTipos(tps.value);
    if (provs.status === "fulfilled")
      setProveedores(provs.value.filter((p) => p.activo));
    if ([fams, tps, provs].some((r) => r.status === "rejected"))
      setError(
        "Algunos catálogos no se pudieron cargar. Los datos disponibles se conservaron. Reintenta para completar la información.",
      );
    setLoading(false);
  }

  useEffect(() => {
    if (!role) return;
    void cargar().catch((err) => {
      setError(
        err instanceof HttpError
          ? err.message
          : "No se pudieron cargar las refacciones.",
      );
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
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const newItem = await api<ItemInventario>("/inventario/items", {
        role: role!,
        userId,
        method: "POST",
        body: JSON.stringify({
          sku: sku.trim(),
          nombre: nombre.trim(),
          familiaId,
          oem: oem.trim() || undefined,
          tipoVehiculoIds: [...tipoIds],
        }),
      });
      setCreated(newItem);
      setSku("");
      setNombre("");
      setOem("");
      setTipoIds(new Set());
      setOpenNuevo(false);
      await cargar();
    } catch (err) {
      setError(
        err instanceof HttpError
          ? err.message
          : "No se pudo crear la refacción.",
      );
    } finally {
      setSaving(false);
    }
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const visible = items.filter(
      (item) =>
        (activeFilter === "all" ||
          item.activo === (activeFilter === "active")) &&
        (!categoryFilter || item.familiaId === categoryFilter),
    );
    if (!needle) return visible;
    return visible.filter((item) =>
      [item.sku, item.nombre, item.oem ?? "", item.familiaNombre ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [items, q, activeFilter, categoryFilter]);

  const columns: ColumnDef<ItemInventario, unknown>[] = [
    {
      accessorKey: "sku",
      header: "SKU",
      cell: ({ row }) => <span className="mono">{row.original.sku}</span>,
    },
    {
      accessorKey: "nombre",
      header: "Nombre",
      cell: ({ row }) => (
        <div>
          {row.original.nombre}
          {row.original.oem ? (
            <div className="text-xs text-muted-foreground">
              OEM {row.original.oem}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      accessorKey: "familiaNombre",
      header: "Categoría",
    },
    {
      accessorKey: "stock",
      header: "Stock",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="mono">
            {row.original.stock} {etiquetaUom(row.original.uom)}
          </span>
          <StockAlertaBadge alerta={row.original.alerta} />
        </div>
      ),
    },
    {
      accessorKey: "activo",
      header: "Estado",
      cell: ({ row }) => (
        <Badge variant={row.original.activo ? "success" : "muted"}>
          {row.original.activo ? "Activo" : "Inactivo"}
        </Badge>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Refacciones"
        lede="Identifica cada refacción antes de registrar entradas o consumos."
        actions={
          <Button type="button" onClick={() => setOpenNuevo(true)}>
            Nueva refacción
          </Button>
        }
      />

      <div className="mb-3">
        <Field label="Buscar" htmlFor="itemSearch">
          <Input
            id="itemSearch"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nombre, código o categoría"
          />
        </Field>
      </div>

      <div className="inventory-toolbar">
        <div
          className="list-filter"
          role="group"
          aria-label="Estado de refacción"
        >
          {[
            ["active", "Activas"],
            ["all", "Todas"],
            ["inactive", "Inactivas"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={activeFilter === value ? "active" : ""}
              aria-pressed={activeFilter === value}
              onClick={() => setActiveFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <NativeSelect
          aria-label="Categoría"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">Todas las categorías</option>
          {familias.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nombre}
            </option>
          ))}
        </NativeSelect>
      </div>
      {created ? (
        <Note>
          Refacción creada con existencias en cero.{" "}
          <Button
            variant="outline"
            onClick={() => {
              setItemId(created.id);
              setMode("entrada");
              setCreated(null);
            }}
          >
            Registrar primera entrada
          </Button>
        </Note>
      ) : null}
      <FormAlert>{error}</FormAlert>
      {error ? (
        <Button variant="outline" onClick={() => void cargar()}>
          Reintentar catálogos
        </Button>
      ) : null}
      {loading ? (
        <p className="muted" role="status">
          Cargando refacciones…
        </p>
      ) : null}

      {!loading && (items.length > 0 || !error) ? (
        <>
          <div className="inventario-refacciones-table">
            <DataTable
              columns={columns}
              data={filtered}
              empty={
                items.length === 0 ? (
                  <>
                    <span className="block font-medium text-navy">
                      Aún no hay refacciones.
                    </span>
                    <span>Agregue la primera con Nueva refacción.</span>
                  </>
                ) : (
                  <>
                    <span className="block font-medium text-navy">
                      Nada que coincida.
                    </span>
                    <span>Ajuste la búsqueda.</span>
                  </>
                )
              }
              onRowClick={(item) => setFicha(item)}
            />
          </div>

          <div className="inventario-refacciones-mobile">
            {filtered.length > 0 ? (
              <ul className="inventory-mobile-list" aria-label="Refacciones">
                {filtered.map((item) => (
                  <li className="inventory-mobile-item" key={item.id}>
                    <button
                      type="button"
                      className="inventory-mobile-main"
                      onClick={() => setFicha(item)}
                    >
                      <span className="inventory-mobile-copy">
                        <span className="font-medium text-navy">
                          {item.nombre}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          <span className="mono">{item.sku}</span>
                          {item.familiaNombre ? ` · ${item.familiaNombre}` : ""}
                        </span>
                      </span>
                      <span className="inventory-mobile-meta">
                        <span className="mono text-sm">
                          {item.stock} {etiquetaUom(item.uom)}
                        </span>
                        <StockAlertaBadge alerta={item.alerta} />
                      </span>
                    </button>
                    <div className="inventory-mobile-actions">
                      <Badge variant={item.activo ? "success" : "muted"}>
                        {item.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">
                <span className="block font-medium text-navy">
                  {items.length === 0
                    ? "Aún no hay refacciones."
                    : "Nada que coincida."}
                </span>
                <span>
                  {items.length === 0
                    ? "Agregue la primera con Nueva refacción."
                    : "Ajuste la búsqueda."}
                </span>
              </div>
            )}
          </div>
        </>
      ) : null}

      <RefaccionFicha
        item={ficha}
        tipos={tipos}
        proveedores={proveedores}
        role={role ?? ""}
        userId={userId}
        onClose={() => setFicha(null)}
        onChanged={(updated) => {
          if (updated) setFicha(updated);
          void cargar();
        }}
        onEntrada={(item) => {
          setFicha(null);
          setItemId(item.id);
          setMode("entrada");
        }}
        onAjuste={(item) => {
          setFicha(null);
          setItemId(item.id);
          setMode("ajuste");
        }}
      />

      <InventarioMovimientoSheet
        mode={mode}
        itemId={itemId}
        rows={items.map((item) => ({
          itemId: item.id,
          sku: item.sku,
          nombre: item.nombre,
          qty: item.stock,
          uom: item.uom,
        }))}
        lockItem
        role={role ?? ""}
        userId={userId}
        onClose={() => {
          setMode(null);
          setItemId("");
        }}
        onApplied={() => cargar()}
        onError={setError}
      />

      <Dialog open={openNuevo} onOpenChange={setOpenNuevo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva refacción</DialogTitle>
          </DialogHeader>
          <form className="grid gap-3" onSubmit={crear}>
            <Field label="SKU" htmlFor="sku">
              <Input
                id="sku"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="FIL-ACEITE-01"
              />
            </Field>
            <Field label="Nombre" htmlFor="itemNombre">
              <Input
                id="itemNombre"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Filtro de aceite"
              />
            </Field>
            <Field label="Categoría" htmlFor="familiaId">
              <NativeSelect
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
              </NativeSelect>
            </Field>
            <Field
              label="OEM"
              htmlFor="oem"
              help="Código del fabricante. Opcional."
            >
              <Input
                id="oem"
                value={oem}
                onChange={(e) => setOem(e.target.value)}
              />
            </Field>
            <div>
              <p className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                Vehículos
                <Hint label="En qué tipos de unidad se puede usar." />
              </p>
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
              {tipoIds.size === 0 && tipos.length > 0 ? (
                <Note variant="warn">Elija al menos un tipo de vehículo.</Note>
              ) : null}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOpenNuevo(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={!familiaId}>
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
