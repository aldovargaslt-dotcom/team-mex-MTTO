'use client';

import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api';
import { useRole } from '@/lib/role';
import { useReadResource } from '@/lib/use-read-resource';
import type { Familia, ItemInventario, TipoVehiculo } from '@/lib/types';
import { ReadStatus } from './ReadStatus';
import { Button } from './ui/button';
import { Field, FormAlert, Note } from './ui/field';
import { Input, NativeSelect } from './ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';

/** Shared existing alta recipe; identity starts with stock zero. */
export function NewItemDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; onCreated: (item: ItemInventario) => void | Promise<void> }) {
  const { role, userId } = useRole();
  const read = useReadResource(open && role ? JSON.stringify([role, userId, 'new-item']) : null,
    async () => {
      const [familias, tipos] = await Promise.all([
        api<Familia[]>('/inventario/familias', { role: role!, userId }),
        api<TipoVehiculo[]>('/unidades/tipos', { role: role!, userId }),
      ]);
      return { familias: familias.filter(f => f.activa), tipos };
    });
  const [sku, setSku] = useState(''), [nombre, setNombre] = useState(''), [familiaId, setFamiliaId] = useState(''), [oem, setOem] = useState('');
  const [uom, setUom] = useState('pieza');
  const [tipoIds, setTipoIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null), [busy, setBusy] = useState(false);
  const dirty = Boolean(sku || nombre || oem || tipoIds.length);
  function close(next: boolean) { if (!busy && (next || !dirty || window.confirm('Hay una refacción sin guardar. ¿Descartar la captura?'))) onOpenChange(next); }
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(null);
    try {
      const item = await api<ItemInventario>('/inventario/items', { role: role!, userId, method: 'POST', body: JSON.stringify({ sku: sku.trim(), nombre: nombre.trim(), familiaId, oem: oem.trim() || undefined, tipoVehiculoIds: tipoIds, uom, quantityScale: uom === 'pieza' ? 0 : 3 }) });
      setSku(''); setNombre(''); setOem(''); setTipoIds([]); onOpenChange(false);
      await onCreated(item);
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo crear la refacción. Tus datos siguen aquí.'); }
    finally { setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={close}><DialogContent className="flex max-h-[85vh] flex-col"><DialogHeader><DialogTitle>Nueva refacción</DialogTitle></DialogHeader>
    <ReadStatus loading={read.loading} error={read.error} loadingText="Cargando catálogo…" errorText="No se pudo cargar el catálogo." retry={read.retry} />
    <form className="flex min-h-0 flex-col gap-3" onSubmit={save}><div className="min-h-0 space-y-3 overflow-y-auto"><FormAlert>{error}</FormAlert>
      <Field label="SKU" htmlFor="new-sku"><Input id="new-sku" required maxLength={40} disabled={busy} value={sku} onChange={e => setSku(e.target.value)} placeholder="FIL-ACEITE-01" /></Field>
      <Field label="Nombre" htmlFor="new-name"><Input id="new-name" required maxLength={120} disabled={busy} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Filtro de aceite" /></Field>
      <Field label="Categoría" htmlFor="new-family"><NativeSelect id="new-family" required disabled={busy || read.loading} value={familiaId} onChange={e => setFamiliaId(e.target.value)}><option value="">Seleccione</option>{read.data?.familias.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}</NativeSelect></Field>
      <Field label="OEM" htmlFor="new-oem" help="Código del fabricante. Opcional."><Input id="new-oem" disabled={busy} value={oem} onChange={e => setOem(e.target.value)} /></Field>
      <Field label="Unidad base" htmlFor="new-uom"><NativeSelect id="new-uom" disabled={busy} value={uom} onChange={e => setUom(e.target.value)}><option value="pieza">Pieza (indivisible)</option><option value="L">Litro</option><option value="kg">Kilogramo</option><option value="m">Metro</option></NativeSelect></Field>
      <fieldset><legend className="text-xs font-medium text-muted-foreground">Vehículos compatibles</legend><div className="chip-row">{read.data?.tipos.map(t => <label className="check" key={t.id}><input type="checkbox" disabled={busy} checked={tipoIds.includes(t.id)} onChange={() => setTipoIds(current => current.includes(t.id) ? current.filter(id => id !== t.id) : [...current, t.id])} />{t.nombre}</label>)}</div>
        {!tipoIds.length && read.data?.tipos.length ? <Note variant="warn">Elija al menos un tipo de vehículo.</Note> : null}</fieldset>
      </div><DialogFooter className="shrink-0"><Button type="button" variant="secondary" disabled={busy} onClick={() => close(false)}>Cancelar</Button><Button type="submit" disabled={busy || !familiaId || read.loading || Boolean(read.error)}>{busy ? 'Guardando…' : 'Guardar'}</Button></DialogFooter>
    </form>
  </DialogContent></Dialog>;
}
