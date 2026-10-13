'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { api, HttpError, authenticatedFetch } from '@/lib/api';
import { useRole } from '@/lib/role';
import { useReadResource } from '@/lib/use-read-resource';
import { NewItemDialog } from './NewItemDialog';
import { ReadStatus } from './ReadStatus';
import { ImageDropzone } from './ImageDropzone';
import { Button } from './ui/button';
import { Field, FormAlert, Note } from './ui/field';
import { Input, NativeSelect, Textarea } from './ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';

type Posting = { id: string; itemId: string; kind: string; qty: string; cost: string | null; knownCost: string; reverses?: string; reason?: string; actor: string; occurredAt: string; settlement?: string; unknownQty?: string; adjusts?: string };
type PurchaseLine = { id: string; itemId: string; purchased: string; used: string; received: string; pending: string; paid: string };
export type MaterialsView = {
  revision: number;
  state: { purchases: { id: string; lines: PurchaseLine[]; receiptKey: string | null }[]; postings: Posting[]; audits: { id: string; actor: string; reason: string; occurredAt: string; actorRole?: string; before?: unknown; after?: unknown }[] };
  summary: { complete: boolean; materialsCost: string | null; knownMaterialsCost: string; lossCost: string | null; pendingDestinations: { qty: string }[] };
};
type Item = { id: string; sku: string; nombre: string; stock: number; uom: string; quantityScale: number; knownValue: string; unknownQty: string };
type PurchaseInput = { itemId: string; purchased: string; used: string; received: string; paid: string; conversion: string };
const newLine = (): PurchaseInput => ({ itemId: '', purchased: '', used: '', received: '0', paid: '', conversion: '1' });
const normalize = (value: string) => value.trim().replace(',', '.');
const money = (value: string | null) => value === null ? 'Costo pendiente' : !Number.isFinite(Number(value)) ? '…' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(value));
const postingLabel: Record<string, string> = { WAREHOUSE_USE: 'Uso del almacén', DIRECT_USE: 'Uso de compra', RECEIPT: 'Recibido en almacén', SUPPLIER_RETURN: 'Devolución a proveedor', LOSS: 'Pérdida documentada', USE_REVERSAL: 'Reverso', COST_COMPLETION: 'Costo completado', STOCK_COST_COMPLETION: 'Valoración de almacén', PRICE_ADJUSTMENT: 'Ajuste de precio', RETURN_STATUS: 'Seguimiento de devolución', REPLACEMENT_RECEIPT: 'Reemplazo recibido', SUPPLIER_RETURN_REVERSAL: 'Reverso de devolución' };

function auditSnapshot(value: unknown, label: (id: string) => string): string | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const state = (row.state ?? row) as { postings?: Posting[] };
  if (Array.isArray(state.postings)) {
    const kinds = ['WAREHOUSE_USE', 'DIRECT_USE', 'USE_REVERSAL'];
    const uses = state.postings.filter(p => kinds.includes(p.kind) || (['PRICE_ADJUSTMENT', 'COST_COMPLETION'].includes(p.kind) && kinds.includes(state.postings!.find(original => original.id === (p.adjusts ?? p.reverses))?.kind ?? '')));
    const cost = uses.reduce((total, p) => total + Number(p.knownCost), 0);
    const unknown = uses.reduce((total, p) => total + Number(p.unknownQty ?? 0), 0);
    const stocks = row.stocks as Record<string, { qty: string }> | undefined;
    return `Costo de materiales: ${money(unknown > 0 ? null : String(cost))}${stocks ? '; Almacén: ' + Object.entries(stocks).map(([id, stock]) => `${label(id)}: ${Number(stock.qty)}`).join(', ') : ''}`;
  }
  const statuses: Record<string, string> = { REFUND_PENDING: 'Reembolso pendiente', REFUNDED: 'Reembolsado', REPLACEMENT_PENDING: 'Reemplazo pendiente', REPLACED: 'Reemplazado' };
  if (typeof row.paid === 'string') return `Total pagado: ${money(row.paid)}${typeof row.destinationCost === 'string' ? '; Costo del destino: ' + money(row.destinationCost) : ''}`;
  if (typeof row.status === 'string') return statuses[row.status] ?? null;
  if (typeof row.received === 'string') return `Recibido: ${row.received}; reemplazo por recibir: ${row.replacementAvailable}`;
  return null;
}

export function OrderMaterials({ visitaId, closed = false, onChanged }: { visitaId: string; closed?: boolean; onChanged?: (view: MaterialsView) => void }) {
  const { role, userId, isAdmin } = useRole();
  const opts = { role: role!, userId };
  const read = useReadResource(role ? JSON.stringify([role, userId, visitaId, 'materials']) : null,
    () => api<MaterialsView>(`/visitas/${visitaId}/materiales`, opts), true);
  const inventory = useReadResource(role ? JSON.stringify([role, userId, 'materials-items']) : null,
    () => api<Item[]>('/inventario/items', opts), true);
  const [mode, setMode] = useState<'USE' | 'PURCHASE' | 'DESTINATION' | 'CORRECT_USE' | 'COMPLETE_COST' | 'VALUE_STOCK' | 'CORRECT_PRICE' | 'SETTLEMENT' | 'REPLACEMENT_RECEIPT' | null>(null);
  const [itemId, setItemId] = useState('');
  const [qty, setQty] = useState('');
  const [lines, setLines] = useState<PurchaseInput[]>([newLine()]);
  const [target, setTarget] = useState<{ purchaseId: string; lineId: string } | null>(null);
  const [posting, setPosting] = useState<Posting | null>(null);
  const [source, setSource] = useState('PENDING');
  const [destination, setDestination] = useState('WAREHOUSE');
  const [settlement, setSettlement] = useState('REFUND_PENDING');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState('');
  const pending = useRef<{ key: string; revision: number; signature: string } | null>(null);
  const [receiptRetry, setReceiptRetry] = useState<{ purchaseId: string; dataUrl: string } | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [newItemOpen, setNewItemOpen] = useState(false);
  const [search, setSearch] = useState('');
  const view = read.data;
  useEffect(() => {
    const purchaseId = new URLSearchParams(window.location.search).get('compra');
    if (purchaseId && view?.state.purchases.some(p => p.id === purchaseId)) document.getElementById(`compra-${purchaseId}`)?.scrollIntoView({ block: 'start' });
  }, [view]);
  const captureLocked = busy || pending.current !== null;
  const items = inventory.data ?? [];
  const lookup = new Map(items.map(item => [item.id, item]));
  const label = (id: string) => { const item = lookup.get(id); return item ? `${item.sku} · ${item.nombre}` : 'Refacción no disponible'; };
  const effectivePosting = (p: Posting) => {
    const reversals = view?.state.postings.filter(r => r.kind === 'USE_REVERSAL' && r.reverses === p.id) ?? [];
    const adjustments = view?.state.postings.filter(r => (r.kind === 'COST_COMPLETION' && r.reverses === p.id) || (r.kind === 'PRICE_ADJUSTMENT' && (r.adjusts === p.id || reversals.some(original => original.id === r.adjusts)))) ?? [];
    const group = [p, ...reversals, ...adjustments];
    const unknown = group.reduce((sum, r) => sum + Number(r.unknownQty ?? '0'), 0);
    return { ...p, qty: String(Number(p.qty) + reversals.reduce((sum, r) => sum + Number(r.qty), 0)), cost: unknown > 0 ? null : String(group.reduce((sum, r) => sum + Number(r.knownCost), 0)) };
  };
  useEffect(() => { if (view) onChanged?.(view); }, [view, onChanged]);
  useEffect(() => {
    if (!mode) return;
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [mode]);

  function open(next: typeof mode) { if (pending.current) { setMode(next); return; } setError(null); setSuccess(''); setReason(''); setQty(''); setItemId(''); setLines([newLine()]); setMode(next); }
  function closeCapture(next: boolean) {
    if (next || busy) return;
    if (pending.current) { setError('Reintenta la operación pendiente antes de cerrar; se conservan sus datos originales.'); return; }
    if (window.confirm('Hay una captura sin guardar. ¿Descartar los datos del formulario?')) setMode(null);
  }
  async function submit(command: Record<string, unknown>) {
    if (!view || busy) return;
    const signature = JSON.stringify(command);
    if (pending.current && pending.current.signature !== signature) { setError('Reintenta la operación pendiente con sus datos originales antes de registrar otra.'); return; }
    const request = pending.current ?? { key: crypto.randomUUID(), revision: view.revision, signature };
    pending.current = request;
    setBusy(true); setError(null);
    try {
      const result = await api<MaterialsView>(`/visitas/${visitaId}/materiales/comandos`, { ...opts, method: 'POST', body: JSON.stringify({ key: request.key, revision: request.revision, command }) });
      pending.current = null;
      read.setData(result); read.retry(); inventory.retry(); onChanged?.(result);
      setMode(null); setSuccess(command.type === 'PURCHASE' ? 'Compra registrada. Puedes adjuntar el comprobante abajo.' : 'Movimiento registrado.');
    } catch (err) {
      if (err instanceof HttpError && err.status < 500) pending.current = null;
      if (err instanceof HttpError && err.status === 409) read.retry();
      setError(err instanceof HttpError && err.status < 500 ? err.message : 'No se pudo guardar. Tus datos siguen aquí; vuelve a intentarlo.');
    } finally { setBusy(false); }
  }
  async function attach(purchaseId: string, dataUrl: string) {
    setReceiptRetry({ purchaseId, dataUrl }); setBusy(true); setError(null);
    try {
      const result = await api<MaterialsView>(`/visitas/${visitaId}/materiales/compras/${purchaseId}/comprobante`, { ...opts, method: 'POST', body: JSON.stringify({ dataUrl }) });
      read.setData(result); onChanged?.(result); setReceiptRetry(null); setSuccess('Comprobante adjuntado. Existencias y costos conservados.');
    } catch (err) { setError(err instanceof HttpError && err.status < 500 ? err.message : 'No se pudo adjuntar. La compra sigue pendiente y tu imagen se conserva para reintentar.'); }
    finally { setBusy(false); }
  }
  async function previewReceipt(purchaseId: string) {
    setBusy(true); setError(null);
    try {
      const response = await authenticatedFetch(`/backend/visitas/${visitaId}/materiales/compras/${purchaseId}/comprobante`, { headers: { 'X-Role': role!, ...(userId ? { 'X-User-Id': userId } : {}) } });
      if (!response.ok) throw new Error('No se pudo abrir el comprobante.');
      setReceiptPreview(URL.createObjectURL(await response.blob()));
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo abrir el comprobante.'); }
    finally { setBusy(false); }
  }
  useEffect(() => () => { if (receiptPreview) URL.revokeObjectURL(receiptPreview); }, [receiptPreview]);
  function file(purchaseId: string, selected: File) {
    if (selected.size > 1_500_000) { setError('La imagen supera el tamaño permitido (1.5 MB).'); return; }
    const reader = new FileReader();
    reader.onerror = () => setError('No se pudo leer la imagen; vuelve a seleccionarla.');
    reader.onload = () => { void attach(purchaseId, String(reader.result)); };
    reader.readAsDataURL(selected);
  }
  function confirm() {
    if (mode === 'USE') void submit({ type: mode, itemId, qty: normalize(qty) });
    if (mode === 'PURCHASE') void submit({ type: mode, lines: lines.map(line => Object.fromEntries(Object.entries(line).map(([key, value]) => [key, key === 'itemId' ? value : normalize(value)]))) });
    if (mode === 'DESTINATION' && target) void submit({ type: mode, ...target, qty: normalize(qty), source, destination, reason, settlement });
    if (mode === 'CORRECT_USE' && posting) void submit({ type: mode, postingId: posting.id, replacementQty: normalize(qty), destination, reason });
    if (mode === 'COMPLETE_COST' && posting) void submit({ type: mode, postingId: posting.id, unitCost: normalize(qty), reason });
    if (mode === 'VALUE_STOCK') void submit({ type: mode, itemId, unitCost: normalize(qty), reason });
    if (mode === 'SETTLEMENT' && posting) void submit({ type: mode, returnId: posting.id, status: settlement, reason });
    if (mode === 'REPLACEMENT_RECEIPT' && posting) void submit({ type: mode, returnId: posting.id, qty: normalize(qty), reason });
    if (mode === 'CORRECT_PRICE' && target) void submit({ type: mode, ...target, paid: normalize(qty), reason });
  }
  const title = mode === 'USE' ? 'Usar del almacén' : mode === 'PURCHASE' ? 'Registrar compra' : mode === 'DESTINATION' ? 'Asignar destino / devolver a proveedor' : mode === 'CORRECT_USE' ? 'Corregir materiales' : mode === 'CORRECT_PRICE' ? 'Corregir costo de compra' : mode === 'SETTLEMENT' ? 'Actualizar reembolso / reemplazo' : mode === 'REPLACEMENT_RECEIPT' ? 'Recibir reemplazo' : 'Completar costo pendiente';
  const select = (value: string, update: (value: string) => void, id: string) => <Field label="Refacción" htmlFor={id}><NativeSelect id={id} value={value} onChange={e => { update(e.target.value); setError(null); }} disabled={captureLocked}>
    <option value="">Selecciona una refacción</option>{items.filter(item => !search || `${item.sku} ${item.nombre}`.toLowerCase().includes(search.toLowerCase())).map(item => <option key={item.id} value={item.id}>{item.sku} · {item.nombre} · {item.stock} {item.uom}</option>)}
  </NativeSelect></Field>;

  return <section className="space-y-3" aria-labelledby={`materials-${visitaId}`}>
    <h2 id={`materials-${visitaId}`} className="text-[13px] font-semibold">Refacciones y costos</h2>
    <ReadStatus loading={read.loading || inventory.loading} error={read.error || inventory.error} loadingText="Cargando refacciones…" errorText="No se pudieron cargar las refacciones." retry={() => { read.retry(); inventory.retry(); }} />
    <FormAlert>{error}</FormAlert>{success ? <p role="status" className="text-[13px]">{success}</p> : null}
    {view ? <>
      {view.summary.pendingDestinations.length > 0 ? <Note variant="warn">Hay cantidades sin destino. Asigna recepción física, devolución o pérdida antes de cerrar la orden.</Note> : null}
      <dl className="dl"><dt>Costo de materiales</dt><dd>{money(view.summary.materialsCost)}{!view.summary.complete ? ' · Total incompleto' : ''}</dd><dt>Pérdidas documentadas</dt><dd>{money(view.summary.lossCost)}</dd></dl>
      {!closed ? <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy || read.loading || !inventory.data} onClick={() => open('USE')}>Usar del almacén</Button><Button variant="outline" disabled={busy || read.loading || !inventory.data} onClick={() => open('PURCHASE')}>Registrar compra</Button></div> : null}
      {isAdmin ? <Button variant="quiet" disabled={busy || read.loading} onClick={() => open('VALUE_STOCK')}>Completar valoración de almacén</Button> : null}
      {!view.state.postings.some(p => !['STOCK_COST_COMPLETION', 'RETURN_STATUS'].includes(p.kind)) && !view.state.purchases.length ? <p className="muted">Esta orden todavía no tiene refacciones registradas.</p> : null}
      <ul className="space-y-2">{view.state.postings.filter(p => !['STOCK_COST_COMPLETION', 'RETURN_STATUS'].includes(p.kind)).map(p => <li key={p.id} className="border-b py-2 text-[13px]">
        <p>{label(p.itemId)}{Number(p.qty) !== 0 ? ` · ${p.qty} ${lookup.get(p.itemId)?.uom ?? ''}` : ''} · {postingLabel[p.kind] ?? 'Movimiento'} · {money(p.cost)}</p>
        {['WAREHOUSE_USE', 'DIRECT_USE'].includes(p.kind) && (effectivePosting(p).qty !== p.qty || effectivePosting(p).cost !== p.cost) ? <p className="text-[13px]">Registro original conservado. Uso actual: {effectivePosting(p).qty} {lookup.get(p.itemId)?.uom} · {money(effectivePosting(p).cost)}</p> : null}
        {p.kind === 'SUPPLIER_RETURN' ? <p className="muted">{({ REFUND_PENDING: 'Reembolso pendiente', REFUNDED: 'Reembolsado', REPLACEMENT_PENDING: 'Reemplazo pendiente', REPLACED: 'Reemplazado' } as Record<string, string>)[view.state.postings.filter(r => r.kind === 'RETURN_STATUS' && r.reverses === p.id).slice(-1)[0]?.settlement ?? p.settlement ?? 'REFUND_PENDING']}</p> : null}
        {p.kind === 'SUPPLIER_RETURN' && (!closed || isAdmin) ? <div className="flex flex-wrap gap-2"><Button variant="quiet" disabled={busy} onClick={() => { open('SETTLEMENT'); setPosting(p); }}>Actualizar reembolso / reemplazo</Button><Button variant="quiet" disabled={busy} onClick={() => { open('REPLACEMENT_RECEIPT'); setPosting(p); }}>Recibir reemplazo</Button></div> : null}
        {p.reason ? <p className="muted">{p.reason}</p> : null}
        {isAdmin && ['WAREHOUSE_USE', 'DIRECT_USE'].includes(p.kind) && Number(effectivePosting(p).qty) > 0 ? <Button variant="quiet" disabled={busy} onClick={() => { open('CORRECT_USE'); setPosting(effectivePosting(p)); setDestination('WAREHOUSE'); }}>Corregir materiales</Button> : null}
        {isAdmin && p.cost === null && !view.state.postings.some(r => r.reverses === p.id) ? <Button variant="quiet" disabled={busy} onClick={() => { open('COMPLETE_COST'); setPosting(p); }}>Completar costo</Button> : null}
      </li>)}</ul>
      {view.state.purchases.map((purchase, index) => <section key={purchase.id} id={`compra-${purchase.id}`} className="doc-section space-y-2">
        <h3 className="text-[13px] font-semibold">Compra {index + 1} · {purchase.receiptKey ? 'Comprobante adjuntado' : 'Comprobante pendiente'}</h3>
        {purchase.lines.map(line => <div key={line.id} className="text-[13px]">
          <p>{label(line.itemId)} · Comprada {line.purchased} · Utilizada {line.used} · Recibida {line.received} · Total pagado {money(line.paid)}</p>
          {Number(line.pending) > 0 ? <p role="status">Faltan {line.pending} {lookup.get(line.itemId)?.uom} por asignar a un destino.</p> : null}
          {!closed || isAdmin ? <Button variant="quiet" disabled={busy} onClick={() => { open('DESTINATION'); setTarget({ purchaseId: purchase.id, lineId: line.id }); setSource('PENDING'); setDestination('WAREHOUSE'); }}>Asignar destino / devolver a proveedor</Button> : null}
          {isAdmin ? <Button variant="quiet" disabled={busy} onClick={() => { open('CORRECT_PRICE'); setTarget({ purchaseId: purchase.id, lineId: line.id }); }}>Corregir costo de compra</Button> : null}
        </div>)}
        {purchase.receiptKey ? <Button variant="quiet" disabled={busy} onClick={() => void previewReceipt(purchase.id)}>Ver comprobante</Button> : null}
        {!purchase.receiptKey ? <ImageDropzone disabled={busy} hint="Comprobante opcional, incluso después del cierre" onFile={selected => file(purchase.id, selected)} /> : null}
      </section>)}
      {receiptRetry ? <Button variant="outline" disabled={busy} onClick={() => void attach(receiptRetry.purchaseId, receiptRetry.dataUrl)}>Reintentar adjuntar comprobante</Button> : null}
      {view.state.audits.length ? <details><summary className="text-[13px]">Historia de materiales y costos</summary><ul>{view.state.audits.map(a => <li key={a.id} className="muted">{a.reason} · {({ SUPERVISOR: 'Supervisor', ADMIN_DIRECTIVO: 'Administrador directivo', legacy: 'Registro anterior' } as Record<string, string>)[a.actorRole ?? a.actor] ?? 'Usuario registrado'} · {new Date(a.occurredAt).toLocaleString('es-MX')}{auditSnapshot(a.before, label) ? <p>Antes: {auditSnapshot(a.before, label)}</p> : null}{auditSnapshot(a.after, label) ? <p>Después: {auditSnapshot(a.after, label)}</p> : null}</li>)}</ul></details> : null}
    </> : null}
    <Dialog open={mode !== null} onOpenChange={closeCapture}>
      <DialogContent className="flex max-h-[85vh] flex-col"><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{mode === 'PURCHASE' ? 'MXN, impuestos incluidos. Cantidad utilizada explícita; el sobrante sólo entra con recepción física.' : 'Confirma el movimiento. Los materiales contabilizados conservan su historial.'}</DialogDescription></DialogHeader>
        <div className="min-h-0 space-y-3 overflow-y-auto">
        <FormAlert>{error}</FormAlert>
        {posting && ['CORRECT_USE', 'COMPLETE_COST', 'SETTLEMENT', 'REPLACEMENT_RECEIPT'].includes(mode ?? '') ? <p className="text-[13px]">{label(posting.itemId)} · {posting.qty} {lookup.get(posting.itemId)?.uom}</p> : null}
        {target && ['DESTINATION', 'CORRECT_PRICE'].includes(mode ?? '') ? <p className="text-[13px]">{label(view?.state.purchases.find(p => p.id === target.purchaseId)?.lines.find(l => l.id === target.lineId)?.itemId ?? '')}</p> : null}
        {mode === 'USE' || mode === 'PURCHASE' || mode === 'VALUE_STOCK' ? <Field label="Buscar SKU o nombre" htmlFor="material-search"><Input id="material-search" disabled={captureLocked} value={search} onChange={e => setSearch(e.target.value)} /></Field> : null}
        {mode === 'USE' || mode === 'VALUE_STOCK' ? select(itemId, setItemId, 'material-item') : null}
        {mode === 'USE' && lookup.get(itemId) ? <Note>Disponible: {lookup.get(itemId)!.stock} {lookup.get(itemId)!.uom}. {lookup.get(itemId)!.stock <= 0 ? 'Existencias insuficientes para confirmar uso.' : Number(lookup.get(itemId)!.unknownQty) > 0 ? 'Costo pendiente; total incompleto.' : `Costo unitario: ${money(String(Number(lookup.get(itemId)!.knownValue) / lookup.get(itemId)!.stock))}. Costo de este uso: ${money(String(Number(lookup.get(itemId)!.knownValue) / lookup.get(itemId)!.stock * Number(normalize(qty))))}.`}</Note> : null}
        {mode === 'PURCHASE' ? <div className="space-y-4">{lines.map((line, i) => {
          const change = (key: keyof PurchaseInput, value: string) => setLines(current => current.map((l, index) => index === i ? { ...l, [key]: value } : l));
          const remainder = Number(normalize(line.purchased)) * Number(normalize(line.conversion)) - Number(normalize(line.used));
          return <fieldset key={i} className="space-y-2 border-b pb-3"><legend className="text-[13px]">Refacción {i + 1}</legend>
            {select(line.itemId, value => change('itemId', value), `purchase-item-${i}`)}
            {([['purchased', 'Cantidad comprada'], ['conversion', 'Piezas / unidad base por empaque'], ['used', 'Cantidad utilizada'], ['paid', 'Total pagado (MXN, impuestos incluidos)']] as [keyof PurchaseInput, string][]).map(([key, caption]) => <Field key={key} label={caption} htmlFor={`purchase-${i}-${key}`}><Input id={`purchase-${i}-${key}`} inputMode="decimal" value={line[key]} disabled={captureLocked} onChange={e => change(key, e.target.value)} /></Field>)}
            <p className="muted">Conversión: 1 empaque = {line.conversion || '…'} {lookup.get(line.itemId)?.uom ?? 'unidades'}. Restante al almacén: {Number.isFinite(remainder) ? remainder : '…'}.</p>
            <Field label="Cantidad físicamente recibida en almacén" htmlFor={`received-${i}`} hint="0 si el sobrante todavía no ha llegado."><Input id={`received-${i}`} inputMode="decimal" value={line.received} disabled={captureLocked} onChange={e => change('received', e.target.value)} /></Field>
          </fieldset>;
        })}<Button variant="outline" disabled={captureLocked || lines.length >= 50} onClick={() => setLines(current => [...current, newLine()])}>Añadir refacción</Button><Button variant="quiet" disabled={captureLocked} onClick={() => setNewItemOpen(true)}>Nueva refacción</Button><p className="muted">Agregar comprobante después · Un comprobante por compra.</p></div> : null}
        {mode && !['PURCHASE', 'SETTLEMENT'].includes(mode) ? <Field label={mode === 'REPLACEMENT_RECEIPT' ? 'Cantidad físicamente recibida' : mode === 'CORRECT_PRICE' ? 'Nuevo total pagado (MXN, impuestos incluidos)' : mode === 'COMPLETE_COST' || mode === 'VALUE_STOCK' ? 'Costo unitario confirmado (MXN)' : mode === 'CORRECT_USE' ? 'Nueva cantidad utilizada' : 'Cantidad utilizada / a destinar'} htmlFor="material-qty"><Input id="material-qty" inputMode="decimal" value={qty} disabled={captureLocked} onChange={e => { setQty(e.target.value); setError(null); }} /></Field> : null}
        {mode === 'CORRECT_PRICE' && target ? <Note>Antes: {money(view?.state.purchases.find(p => p.id === target.purchaseId)?.lines.find(l => l.id === target.lineId)?.paid ?? null)}. Después: {qty ? money(normalize(qty)) : '…'}. Se registrarán ajustes explícitos en los destinos afectados, incluso otras órdenes; se conservan los costos originales.</Note> : null}
        {mode === 'CORRECT_USE' && posting ? <Note>Antes: {posting.qty} · {money(posting.cost)}. Después: {qty || '…'}; Costo estimado después: {destination === 'WAREHOUSE' && posting.cost !== null ? money(String(Number(posting.cost) / Number(posting.qty) * Number(normalize(qty)))) : 'Se calcula con el saldo actual'}; el servidor confirma el costo y conserva el reverso.</Note> : null}
        {mode === 'DESTINATION' ? <Field label="Origen físico" htmlFor="material-source"><NativeSelect id="material-source" value={source} disabled={captureLocked} onChange={e => setSource(e.target.value)}><option value="PENDING">Pendiente de destino</option><option value="USED">Utilizada en esta OT</option><option value="WAREHOUSE">Recibida en almacén</option></NativeSelect></Field> : null}
        {mode === 'DESTINATION' || mode === 'CORRECT_USE' ? <Field label="Destino físico" htmlFor="material-destination"><NativeSelect id="material-destination" value={destination} disabled={captureLocked} onChange={e => setDestination(e.target.value)}><option value="WAREHOUSE">Recibido físicamente en almacén</option><option value="LOSS">Pérdida documentada</option>{mode === 'DESTINATION' ? <option value="SUPPLIER">Devolver a proveedor</option> : null}</NativeSelect></Field> : null}
        {mode === 'SETTLEMENT' || (mode === 'DESTINATION' && destination === 'SUPPLIER') ? <Field label="Reembolso / reemplazo (sin movimiento automático)" htmlFor="material-settlement"><NativeSelect id="material-settlement" value={settlement} disabled={captureLocked} onChange={e => setSettlement(e.target.value)}>{[['REFUND_PENDING', 'Reembolso pendiente'], ['REFUNDED', 'Reembolsado'], ['REPLACEMENT_PENDING', 'Reemplazo pendiente'], ['REPLACED', 'Reemplazado']].map(([value, caption]) => <option key={value} value={value}>{caption}</option>)}</NativeSelect></Field> : null}
        {mode && !['USE', 'PURCHASE'].includes(mode) ? <Field label="Motivo" htmlFor="material-reason"><Textarea id="material-reason" value={reason} disabled={captureLocked} onChange={e => setReason(e.target.value)} /></Field> : null}
        </div>
        <DialogFooter className="shrink-0"><Button variant="secondary" disabled={busy || pending.current !== null} onClick={() => closeCapture(false)}>Cancelar</Button><Button disabled={busy || !view || inventory.loading} onClick={() => pending.current ? void submit(JSON.parse(pending.current.signature)) : confirm()}>{busy ? 'Guardando…' : pending.current ? 'Reintentar operación original' : mode === 'PURCHASE' ? 'Guardar compra' : mode === 'USE' ? 'Confirmar uso' : 'Confirmar movimiento'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    <Dialog open={receiptPreview !== null} onOpenChange={next => { if (!next) setReceiptPreview(null); }}><DialogContent><DialogHeader><DialogTitle>Comprobante de compra</DialogTitle><DialogDescription>Evidencia vinculada a esta compra.</DialogDescription></DialogHeader>{receiptPreview ? <Image src={receiptPreview} alt="Comprobante de compra" width={640} height={480} unoptimized className="max-h-[60vh] object-contain" /> : null}</DialogContent></Dialog>
    <NewItemDialog open={newItemOpen} onOpenChange={setNewItemOpen} onCreated={created => { inventory.retry(); setSearch(''); setLines(current => { const empty = current.findIndex(line => !line.itemId); return empty >= 0 ? current.map((line, i) => i === empty ? { ...line, itemId: created.id } : line) : [...current, { ...newLine(), itemId: created.id }]; }); }} />
  </section>;
}
