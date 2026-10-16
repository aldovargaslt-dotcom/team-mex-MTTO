'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { notifyInboxChanged } from '@/lib/inbox';
import { etiquetaUom } from '@/lib/format';
import type { Movimiento, StockRow } from '@/lib/types';
import {
  applyBatch, batchPreview, createEditor, criticalNotice, isPending, MINIMUM_ERROR,
  monthlyExits, parseMinimum, pendingRows, previousMonth, reconcileEditor, saveEditor,
  toggleVisible, visibleRows, type AlertFilter, type EditorRow, type ThresholdResponse,
} from '@/lib/inventario-alertas-modal';
import { ListFilter } from '@/components/ListFilter';
import { Button } from '@/components/ui/button';
import { Field, FormAlert } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function InventarioAlertasDialog({ role, userId, onClose, onStock }: {
  role: string; userId?: string; onClose: () => void; onStock: (rows: StockRow[]) => void;
}) {
  const [rows, setRows] = useState<EditorRow[] | null>(null);
  const [stockError, setStockError] = useState(false);
  const [stockAttempt, setStockAttempt] = useState(0);
  const [period] = useState(() => previousMonth());
  const [reference, setReference] = useState<Record<string, number> | null>(null);
  const [referenceState, setReferenceState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [referenceAttempt, setReferenceAttempt] = useState(0);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<AlertFilter>('TODOS');
  const [selected, setSelected] = useState(new Set<string>());
  const [onlyPending, setOnlyPending] = useState(false);
  const [batch, setBatch] = useState<'minimum' | 'remove' | null>(null);
  const [batchValue, setBatchValue] = useState('');
  const [batchUnit, setBatchUnit] = useState('');
  const [batchError, setBatchError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [savedIds, setSavedIds] = useState(new Set<string>());
  const [reloadError, setReloadError] = useState(false);
  const [checking, setChecking] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const headerCheck = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  // Callbacks may change when the page resource updates; never reset this edit session.
  const onStockRef = useRef(onStock);
  useEffect(() => { onStockRef.current = onStock; }, [onStock]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  useEffect(() => {
    const controller = new AbortController();
    setStockError(false);
    void api<StockRow[]>('/inventario/stock', { role, userId, signal: controller.signal }).then((stock) => {
      if (!controller.signal.aborted) { setRows(createEditor(stock)); onStockRef.current(stock); }
    }).catch(() => { if (!controller.signal.aborted) setStockError(true); });
    return () => controller.abort();
  }, [role, userId, stockAttempt]);

  useEffect(() => {
    const controller = new AbortController();
    setReferenceState('loading');
    void api<Movimiento[]>(`/inventario/movimientos?tipo=SALIDA_OT&from=${period.from}&to=${period.to}`, {
      role, userId, signal: controller.signal,
    }).then((data) => {
      const totals = monthlyExits(data, period);
      if (!controller.signal.aborted) { setReference(totals); setReferenceState('ready'); }
    }).catch(() => { if (!controller.signal.aborted) setReferenceState('error'); });
    return () => controller.abort();
  }, [role, userId, period, referenceAttempt]);

  const all = rows ?? [];
  const pending = pendingRows(all);
  const uncertain = all.some((row) => row.status === 'uncertain');
  const invalid = pending.filter((row) => !parseMinimum(row.draft).valid);
  const visible = onlyPending ? pending : visibleRows(all, query, filter);
  const selectedVisible = visible.filter((row) => selected.has(row.itemId)).length;
  const hiddenSelected = selected.size - selectedVisible;
  const units = [...new Set(all.filter((row) => selected.has(row.itemId)).map((row) => row.uom))];
  const unit = batch === 'minimum' ? (units.length === 1 ? units[0] : batchUnit || undefined) : undefined;
  const preview = batchPreview(all, selected, batch === 'remove' ? '' : batchValue, unit);
  const busy = saving || checking;
  const selectionLocked = all.some((row) => selected.has(row.itemId) && row.status === 'uncertain');

  useEffect(() => {
    if (headerCheck.current) headerCheck.current.indeterminate = selectedVisible > 0 && selectedVisible < visible.length;
  }, [selectedVisible, visible.length]);

  function requestClose() {
    if (busy) return;
    if (pending.length) { setDiscard(true); return; }
    onClose();
  }

  function showPending() {
    setOnlyPending(true);
    setTimeout(() => document.getElementById(`alertaMin-${pending[0]?.itemId}`)?.focus(), 0);
  }

  async function readStock() { return api<StockRow[]>('/inventario/stock', { role, userId }); }

  async function refresh(current: EditorRow[]) {
    try {
      const stock = await readStock();
      if (!mounted.current) return;
      onStockRef.current(stock); setReloadError(false);
      if (!pendingRows(current).length) onClose();
    } catch { if (mounted.current) setReloadError(true); }
  }

  async function save() {
    if (busy || !rows || uncertain || !pending.length) return;
    setSubmitted(true);
    if (invalid.length) {
      setRows(rows.map((row) => parseMinimum(row.draft).valid ? row : { ...row, error: MINIMUM_ERROR }));
      summaryRef.current?.focus(); return;
    }
    setSaving(true); setBatch(null);
    const result = await saveEditor(rows, {
      patch: (id, body) => {
        if (!mounted.current) return Promise.reject(new Error('Editor cerrado'));
        return api<ThresholdResponse>(`/inventario/items/${encodeURIComponent(id)}`, { role, userId, method: 'PATCH', body: JSON.stringify(body) });
      },
      read: readStock,
    }, (progress) => { if (mounted.current) setRows(progress); });
    if (!mounted.current) return;
    setRows(result.rows);
    const successes = result.rows.filter((row) => row.status === 'saved');
    if (successes.length) {
      setSavedIds((old) => new Set([...old, ...successes.map((row) => row.itemId)]));
      notifyInboxChanged();
    }
    // Reload is a separate read, never another write or a reset of pending drafts.
    await refresh(result.rows);
    if (mounted.current) { setSaving(false); summaryRef.current?.focus(); }
  }

  async function checkState() {
    if (!rows || busy) return;
    setChecking(true);
    try {
      const stock = await readStock();
      if (!mounted.current) return;
      const next = reconcileEditor(rows, stock);
      setRows(next); onStockRef.current(stock); setReloadError(false);
      const successes = next.filter((row) => row.status === 'saved');
      if (successes.length) { setSavedIds((old) => new Set([...old, ...successes.map((row) => row.itemId)])); notifyInboxChanged(); }
      if (!pendingRows(next).length) onClose();
    } catch { if (mounted.current) setReloadError(true); }
    finally { if (mounted.current) setChecking(false); }
  }

  function apply() {
    try {
      if (batch === 'minimum' && units.length > 1 && !batchUnit) throw new Error('Elige un grupo de unidad');
      if (batch === 'minimum' && !batchValue.trim()) throw new Error(MINIMUM_ERROR);
      setRows(applyBatch(all, selected, batch === 'remove' ? '' : batchValue, unit));
      setBatch(null); setBatchError(null);
    } catch (error) { setBatchError(error instanceof Error ? error.message : MINIMUM_ERROR); }
  }

  return <Dialog open onOpenChange={(next) => { if (!next) requestClose(); }}>
    <DialogContent className="inventory-alert-editor" closeLabel="Cerrar configuración de alertas" closeDisabled={busy}
      onOpenAutoFocus={(event) => { event.preventDefault(); searchRef.current?.focus(); }}
      onEscapeKeyDown={(event) => { event.preventDefault(); if (discard) setDiscard(false); else requestClose(); }}
      onInteractOutside={(event) => { event.preventDefault(); requestClose(); }}>
      <DialogHeader>
        <DialogTitle>Configurar alertas de inventario</DialogTitle>
        <DialogDescription>Define el mínimo de existencias para recibir una alerta</DialogDescription>
      </DialogHeader>
      <fieldset disabled={busy || rows === null} className="inventory-alert-tools">
        <Field label="Buscar producto" htmlFor="alert-search"><Input ref={searchRef} id="alert-search" type="search" placeholder="Buscar por producto o SKU…" value={query} onChange={(e) => { setQuery(e.target.value); setOnlyPending(false); }} /></Field>
        <ListFilter label="Productos con mínimo configurado" value={filter} onChange={(value) => { if (!busy) { setFilter(value); setOnlyPending(false); } }}
          options={[{ id: 'TODOS', label: `Todos (${all.length})` }, { id: 'CON', label: `Con alerta (${all.filter((r) => r.minQty !== null).length})` }, { id: 'SIN', label: `Sin alerta (${all.filter((r) => r.minQty === null).length})` }]} />
        <p className="text-xs text-muted-foreground" id="alert-period">Salidas mes anterior · {period.label} · UTC. No descuenta devoluciones ni incluye compras externas.</p>
        {referenceState === 'error' ? <p className="text-xs">Referencia no disponible. <Button variant="quiet" type="button" onClick={() => setReferenceAttempt((n) => n + 1)}>Reintentar referencia</Button></p> : null}
        {selected.size > 0 ? <div className="inventory-alert-selection">
          <span>{selected.size} seleccionados{hiddenSelected > 0 ? ` · ${hiddenSelected} fuera de esta vista` : ''}</span>
          <Button type="button" variant="outline" disabled={selectionLocked} onClick={() => { setBatch('minimum'); setBatchValue(''); setBatchUnit(''); setBatchError(null); }}>Establecer mínimo…</Button>
          <Button type="button" variant="quiet" disabled={selectionLocked} onClick={() => { setBatch('remove'); setBatchError(null); }}>Quitar alertas</Button>
          <Button type="button" variant="quiet" onClick={() => { setSelected(new Set()); setBatch(null); }}>Limpiar selección</Button>
        </div> : null}
        {batch ? <div className="inventory-alert-batch" role="group" aria-label={batch === 'remove' ? 'Quitar alertas en lote' : 'Establecer mínimo en lote'}>
          {batch === 'minimum' ? <>
            {units.length > 1 ? <Field label="Grupo de unidad" htmlFor="alert-batch-unit"><select id="alert-batch-unit" className="native-select" value={batchUnit} onChange={(e) => setBatchUnit(e.target.value)}><option value="">Elige un grupo…</option>{units.map((uom) => <option key={uom} value={uom}>{etiquetaUom(uom)} ({all.filter((r) => selected.has(r.itemId) && r.uom === uom).length})</option>)}</select></Field> : null}
            <Field label={`Mínimo${unit ? ` (${etiquetaUom(unit)})` : ''}`} htmlFor="alert-batch-value"><Input id="alert-batch-value" inputMode="numeric" value={batchValue} onChange={(e) => setBatchValue(e.target.value)} /></Field>
          </> : null}
          <p>{batch === 'remove' ? `Quitar alertas de ${preview.count} productos` : batchUnit || units.length === 1 ? `Afecta a ${preview.count} productos; ${preview.replacements} tenían otro mínimo` : 'Elige una unidad para ver los productos afectados'}. Solo cambia borradores.</p>
          <Button type="button" variant="outline" onClick={apply}>Aplicar a borradores</Button><Button type="button" variant="quiet" onClick={() => setBatch(null)}>Cancelar lote</Button>
          <FormAlert>{batchError}</FormAlert>
        </div> : null}
      </fieldset>
      <div className="inventory-alert-scroll">
        {rows === null ? <div className="py-6" role="status">{stockError ? <><FormAlert>No se pudieron cargar los productos</FormAlert><Button type="button" variant="outline" onClick={() => setStockAttempt((n) => n + 1)}>Reintentar productos</Button></> : 'Cargando productos…'}</div> : all.length === 0 ? <div className="py-6"><p>No hay productos para configurar</p><p className="muted">Agrega refacciones al inventario para configurar sus alertas</p></div> : <>
          {onlyPending ? <p className="py-2">Mostrando pendientes <Button type="button" variant="quiet" disabled={busy} onClick={() => setOnlyPending(false)}>Volver a la vista</Button></p> : null}
          {visible.length === 0 ? <div className="py-6"><p>No hay productos que coincidan</p><p className="muted">Ajusta la búsqueda o los filtros</p><Button type="button" variant="quiet" disabled={busy} onClick={() => { setQuery(''); setFilter('TODOS'); setOnlyPending(false); }}>Limpiar filtros</Button></div> : <table className="inventory-alert-table">
            <thead><tr><th><label className="inventory-alert-check"><input ref={headerCheck} type="checkbox" aria-label="Seleccionar productos visibles" checked={visible.length > 0 && selectedVisible === visible.length} disabled={busy} onChange={(e) => setSelected(toggleVisible(selected, visible.map((r) => r.itemId), e.target.checked))} /></label></th><th>Producto</th><th>Existencias</th><th>Salidas mes anterior<span className="block font-normal">{period.label}</span></th><th>Avisar al llegar a</th></tr></thead>
            <tbody>{visible.map((row) => {
              const notice = criticalNotice(row);
              const changed = isPending(row);
              const error = row.error;
              const status = row.status === 'uncertain' ? 'No confirmado' : row.status === 'saved' && !changed ? 'Guardado' : row.status === 'error' || row.status === 'unsent' && submitted ? 'Pendiente' : changed ? 'Modificado' : null;
              return <tr key={row.itemId} data-selected={selected.has(row.itemId) || undefined}>
                <td className="inventory-alert-select-cell"><label className="inventory-alert-check"><input type="checkbox" aria-label={`Seleccionar ${row.nombre}`} checked={selected.has(row.itemId)} disabled={busy} onChange={(e) => setSelected(toggleVisible(selected, [row.itemId], e.target.checked))} /></label></td>
                <td className="inventory-alert-product"><span className="font-medium text-navy">{row.nombre}</span><span className="inventory-secondary">{row.sku}{!row.activo ? ' · Inactivo' : ''}</span>{status ? <span className="inventory-alert-row-status">{status}</span> : null}</td>
                <td className="inventory-alert-qty"><span className="inventory-alert-mobile-label">Existencias: </span>{row.qty} {etiquetaUom(row.uom)}</td>
                <td className="inventory-alert-history"><span className="inventory-alert-mobile-label">Salidas: </span>{referenceState === 'loading' ? 'Cargando…' : referenceState === 'error' ? 'No disponible' : `${reference?.[row.itemId] ?? 0} ${etiquetaUom(row.uom)}`}</td>
                <td className="inventory-alert-minimum"><label className="inventory-alert-mobile-label" htmlFor={`alertaMin-${row.itemId}`}>Avisar al llegar a</label><div className="flex items-center gap-2"><Input id={`alertaMin-${row.itemId}`} aria-label={`Mínimo de ${row.nombre} (${etiquetaUom(row.uom)})`} aria-invalid={Boolean(error)} aria-describedby={[error ? `alert-error-${row.itemId}` : '', notice ? `alert-critical-${row.itemId}` : ''].filter(Boolean).join(' ') || undefined} inputMode="numeric" placeholder="Sin mínimo" value={row.draft} disabled={busy || row.status === 'uncertain'} onChange={(e) => setRows((old) => old!.map((value) => value.itemId === row.itemId ? { ...value, draft: e.target.value, status: 'clean', error: undefined } : value))} /><span className="text-xs text-muted-foreground">{etiquetaUom(row.uom)}</span></div>
                  {notice ? <p id={`alert-critical-${row.itemId}`} className="inventory-alert-critical">{notice}</p> : null}
                  {error ? <p id={`alert-error-${row.itemId}`} className="text-xs text-destructive">{error}</p> : null}
                </td>
              </tr>;
            })}</tbody>
          </table>}
          <p className="py-3 text-xs text-muted-foreground">Deja el mínimo vacío para desactivar la alerta</p>
        </>}
      </div>
      <div className="inventory-alert-footer">
        <div ref={summaryRef} tabIndex={-1} className="inventory-alert-summary" role="status" aria-live="polite" aria-atomic="true">
          {saving ? <p>Guardando cambios…</p> : checking ? <p>Comprobando estado…</p> : submitted || savedIds.size ? <p>Se guardaron {savedIds.size} productos; quedan {pending.length} pendientes</p> : <p>{pending.length} cambios pendientes</p>}
          {invalid.length && submitted ? <FormAlert>Revisa {invalid.length} mínimos inválidos antes de guardar.</FormAlert> : null}
          {uncertain ? <FormAlert>No se pudo confirmar el guardado. Comprueba el estado antes de reintentar.</FormAlert> : null}
          {reloadError ? <FormAlert>No se pudieron actualizar las existencias. Se conservan los cambios confirmados.</FormAlert> : null}
          {pending.length > 0 && (submitted || pending.some((row) => row.error)) ? <Button variant="quiet" type="button" disabled={busy} onClick={showPending}>Ver pendientes ({pending.length})</Button> : null}
        </div>
        {discard ? <div className="inventory-alert-discard" role="group" aria-label="Confirmar descarte">
          <p className="font-medium">¿Descartar cambios pendientes?</p><p className="text-xs">{savedIds.size ? 'Lo ya guardado se conserva. Solo se descartarán los cambios pendientes.' : 'Los cambios pendientes no se guardarán.'}</p>
          <div className="flex flex-wrap gap-2"><Button type="button" variant="dangerSoft" onClick={onClose}>Descartar cambios</Button><Button type="button" variant="outline" autoFocus onClick={() => setDiscard(false)}>Seguir editando</Button></div>
        </div> : <div className="inventory-alert-actions">
          <Button type="button" variant="outline" disabled={busy} onClick={requestClose}>Cancelar</Button>
          {uncertain ? <Button type="button" disabled={busy} onClick={() => void checkState()}>Comprobar estado</Button> : reloadError && !pending.length ? <Button type="button" disabled={busy} onClick={() => void checkState()}>Actualizar existencias</Button> : <Button type="button" disabled={busy || !pending.length || rows === null} onClick={() => void save()}>{saving ? 'Guardando cambios…' : submitted && pending.length ? 'Reintentar pendientes' : 'Guardar cambios'}</Button>}
        </div>}
      </div>
    </DialogContent>
  </Dialog>;
}
