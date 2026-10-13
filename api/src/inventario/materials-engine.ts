import { decimal as d, formatDecimal as f, proportion, quantity, SCALE } from './cost-decimal';
import { Balance, MaterialCommand, MaterialItem, MaterialState, Posting, PurchaseLine, ValueSource } from './materials-model';
import { effectiveSources } from './purchase-price-correction';
import { apportion, ensureSources } from './valuation-sources';

export function executeMaterials(
  initial: MaterialState, balances: Record<string, Balance>, items: Record<string, MaterialItem>,
  command: MaterialCommand, context: { actor: string; now: string; id: () => string; admin: boolean },
) {
  const state: MaterialState = structuredClone(initial);
  const stocks: Record<string, Balance> = structuredClone(balances);
  const { actor, now, id } = context;
  const item = (itemId: string) => {
    if (!items[itemId]) throw new Error('No se encontró la refacción activa.');
    return items[itemId];
  };
  const q = (itemId: string, value: string, zero = false) => quantity(value, item(itemId).quantityScale, zero);
  const add = (line: PurchaseLine, field: 'used' | 'received' | 'returned' | 'lost' | 'pending', delta: bigint) => {
    const value = d(line[field]) + delta;
    if (value < 0n) throw new Error('La cantidad supera el destino disponible de la compra.');
    line[field] = f(value);
  };
  const post = (values: Partial<Posting> & Pick<Posting, 'itemId' | 'kind' | 'qty'>): Posting => {
    const row: Posting = { id: id(), stockDelta: '0', cost: '0', knownCost: '0', unknownQty: '0', actor, occurredAt: now, ...values };
    const qty = d(row.qty) < 0n ? -d(row.qty) : d(row.qty);
    const cost = row.cost === null ? null : d(row.cost) < 0n ? -d(row.cost) : d(row.cost);
    row.unitCost = cost === null || qty === 0n ? null : f((cost * SCALE + qty / 2n) / qty);
    state.postings.push(row);
    return row;
  };
  const receive = (itemId: string, qty: bigint, value: bigint, unknown = 0n, sources?: ValueSource[]) => {
    const s = stocks[itemId];
    if (!s) throw new Error('No se encontró el saldo.');
    ensureSources(s);
    for (const source of sources ?? [{ id: id(), qty: f(qty), value: f(value), unknown: unknown > 0n }]) {
      const existing = s.sources!.find(row => row.id === source.id);
      if (existing) { existing.qty = f(d(existing.qty) + d(source.qty)); existing.value = f(d(existing.value) + d(source.value)); }
      else s.sources!.push(structuredClone(source));
    }
    s.qty = f(d(s.qty) + qty); s.knownValue = f(d(s.knownValue) + value); s.unknownQty = f(d(s.unknownQty) + unknown);
  };
  const withdraw = (itemId: string, qty: bigint) => {
    const s = stocks[itemId];
    if (!s || qty > d(s.qty)) throw new Error(`Existencias insuficientes: disponibles ${s?.qty ?? '0'}, solicitadas ${f(qty)}.`);
    ensureSources(s);
    const value = proportion(d(s.knownValue), qty, d(s.qty));
    const sourceQty = apportion(s.sources!.map(source => d(source.qty)), qty);
    const sourceValue = apportion(s.sources!.map(source => d(source.value)), value);
    const sources = s.sources!.map((source, i) => ({ ...source, qty: f(sourceQty[i]), value: f(sourceValue[i]) }));
    const unknown = sources.filter(source => source.unknown).reduce((sum, source) => sum + d(source.qty), 0n);
    s.sources = s.sources!.map((source, i) => ({ ...source, qty: f(d(source.qty) - sourceQty[i]), value: f(d(source.value) - sourceValue[i]) }));
    s.qty = f(d(s.qty) - qty); s.knownValue = f(d(s.knownValue) - value); s.unknownQty = f(d(s.unknownQty) - unknown);
    return { cost: unknown === 0n ? f(value) : null, knownCost: f(value), unknownQty: f(unknown), sources };
  };
  const usedPosting = (lineId: string) => state.postings.filter(p => p.lineId === lineId && p.kind === 'DIRECT_USE');
  const reason = () => {
    if (!('reason' in command) || !command.reason?.trim()) throw new Error('El motivo es obligatorio.');
    return command.reason.trim();
  };
  if (['CORRECT_USE', 'COMPLETE_COST', 'VALUE_STOCK'].includes(command.type) && !context.admin)
    throw new Error('Sólo Administrador puede corregir materiales o completar costos.');
  const before = structuredClone({ purchases: state.purchases, postings: state.postings, stocks });
  switch (command.type) {
    case 'USE': {
      const qty = q(command.itemId, command.qty);
      post({ itemId: command.itemId, kind: 'WAREHOUSE_USE', qty: f(qty), stockDelta: f(-qty), ...withdraw(command.itemId, qty) });
      break;
    }
    case 'PURCHASE': {
      if (!Array.isArray(command.lines) || !command.lines.length || command.lines.length > 50) throw new Error('Añade entre una y 50 líneas.');
      const purchase = { id: id(), lines: [] as PurchaseLine[], receiptKey: null, receiptMime: null, createdAt: now };
      state.purchases.push(purchase);
      for (const input of command.lines) {
        const conversion = quantity(input.conversion, 6);
        const purchasedInput = quantity(input.purchased, 6);
        const converted = purchasedInput * conversion;
        if (converted % SCALE !== 0n) throw new Error('La conversión excede la precisión admitida.');
        const purchased = q(input.itemId, f(converted / SCALE));
        const used = q(input.itemId, input.used, true);
        const received = q(input.itemId, input.received, true);
        const paid = quantity(input.paid, 2, true);
        if (used + received > purchased) throw new Error('Usada y recibida superan la compra.');
        const usedValue = proportion(paid, used, purchased);
        const restValue = paid - usedValue;
        const receivedValue = received ? proportion(restValue, received, purchased - used) : 0n;
        const line: PurchaseLine = { id: id(), itemId: input.itemId, purchased: f(purchased), paid: f(paid), used: f(used), received: f(received), returned: '0', lost: '0', pending: f(purchased - used - received), pendingValue: f(restValue - receivedValue), conversion: input.conversion };
        purchase.lines.push(line);
        if (used) post({ itemId: line.itemId, kind: 'DIRECT_USE', qty: f(used), cost: f(usedValue), knownCost: f(usedValue), purchaseId: purchase.id, lineId: line.id, sources: [{ id: line.id, qty: f(used), value: f(usedValue), unknown: false }] });
        if (received) {
          receive(line.itemId, received, receivedValue, 0n, [{ id: line.id, qty: f(received), value: f(receivedValue), unknown: false }]);
          post({ itemId: line.itemId, kind: 'RECEIPT', qty: f(received), stockDelta: f(received), cost: f(receivedValue), knownCost: f(receivedValue), purchaseId: purchase.id, lineId: line.id });
        }
      }
      break;
    }
    case 'DESTINATION': {
      const purchase = state.purchases.find(p => p.id === command.purchaseId);
      const line = purchase?.lines.find(l => l.id === command.lineId);
      if (!line) throw new Error('No se encontró la línea de compra.');
      const qty = q(line.itemId, command.qty);
      if (!['PENDING', 'USED', 'WAREHOUSE'].includes(command.source) || !['WAREHOUSE', 'LOSS', 'SUPPLIER'].includes(command.destination))
        throw new Error('Origen o destino inválido.');
      const source = command.source === 'PENDING' ? 'pending' : command.source === 'USED' ? 'used' : 'received';
      if (qty > d(line[source])) throw new Error('La devolución supera la cantidad disponible de la compra.');
      if (command.source !== 'PENDING' && command.destination === 'WAREHOUSE')
        throw new Error('Usa una corrección para devolver material utilizado al almacén.');
      let value: bigint;
      let valuation: { cost: string | null; knownCost: string; unknownQty: string; sources?: ValueSource[] } | undefined;
      let sources: ValueSource[];
      if (source === 'pending') {
        value = proportion(d(line.pendingValue), qty, d(line.pending));
        line.pendingValue = f(d(line.pendingValue) - value);
        sources = [{ id: line.id, qty: f(qty), value: f(value), unknown: false }];
      } else if (source === 'used') {
        const originals = usedPosting(line.id);
        const original = originals[0];
        const reversals = state.postings.filter(p => p.reverses === original?.id);
        const availableValue = d(original?.knownCost ?? '0') + reversals.reduce((sum, p) => sum + d(p.knownCost), 0n) + state.postings.filter(p => p.kind === 'PRICE_ADJUSTMENT' && (p.adjusts === original.id || reversals.some(r => r.id === p.adjusts))).reduce((sum, p) => sum + d(p.knownCost), 0n);
        value = proportion(availableValue, qty, d(line.used));
        sources = [{ id: line.id, qty: f(qty), value: f(value), unknown: false }];
        post({ itemId: line.itemId, kind: 'USE_REVERSAL', qty: f(-qty), cost: f(-value), knownCost: f(-value), reverses: original.id, purchaseId: purchase!.id, lineId: line.id, reason: command.reason, sources: [{ id: line.id, qty: f(-qty), value: f(-value), unknown: false }] });
      } else {
        valuation = withdraw(line.itemId, qty);
        value = d(valuation.knownCost);
        sources = valuation.sources ?? [];
      }
      add(line, source, -qty);
      const destination = command.destination === 'WAREHOUSE' ? 'received' : command.destination === 'LOSS' ? 'lost' : 'returned';
      if (destination === 'lost') reason();
      add(line, destination, qty);
      if (destination === 'received') receive(line.itemId, qty, value, 0n, sources);
      post({ itemId: line.itemId, kind: command.destination === 'SUPPLIER' ? 'SUPPLIER_RETURN' : command.destination === 'LOSS' ? 'LOSS' : 'RECEIPT', qty: f(qty), stockDelta: source === 'received' ? f(-qty) : destination === 'received' ? f(qty) : '0', cost: valuation ? valuation.cost : f(value), knownCost: f(value), unknownQty: valuation?.unknownQty ?? '0', purchaseId: purchase!.id, lineId: line.id, reason: command.reason, sources, settlement: command.destination === 'SUPPLIER' ? command.settlement ?? 'REFUND_PENDING' : undefined });
      // Refund/replacement status is documentary; it has no stock side effects.
      if (command.destination === 'SUPPLIER') {
        if (!['REFUND_PENDING', 'REFUNDED', 'REPLACEMENT_PENDING', 'REPLACED'].includes(command.settlement ?? 'REFUND_PENDING'))
          throw new Error('Estado de reembolso/reemplazo inválido.');
        state.audits.push({ id: id(), actor, reason: command.settlement ?? 'REFUND_PENDING', before: { purchaseId: purchase!.id, lineId: line.id }, after: { qty: f(qty) }, occurredAt: now });
      }
      break;
    }
    case 'SETTLEMENT': {
      reason();
      const original = state.postings.find(p => p.id === command.returnId && p.kind === 'SUPPLIER_RETURN');
      if (!original || !['REFUND_PENDING', 'REFUNDED', 'REPLACEMENT_PENDING', 'REPLACED'].includes(command.status)) throw new Error('Devolución o estado inválido.');
      const previous = state.postings.filter(p => p.kind === 'RETURN_STATUS' && p.reverses === original.id).slice(-1)[0]?.settlement ?? original.settlement;
      post({ itemId: original.itemId, kind: 'RETURN_STATUS', qty: '0', reverses: original.id, settlement: command.status, reason: command.reason });
      state.audits.push({ id: id(), actor, reason: command.reason, before: { returnId: original.id, status: previous }, after: { returnId: original.id, status: command.status }, occurredAt: now });
      break;
    }
    case 'REPLACEMENT_RECEIPT': {
      reason();
      const original = state.postings.find(p => p.id === command.returnId && p.kind === 'SUPPLIER_RETURN');
      if (!original) throw new Error('No se encontró la devolución.');
      const reversals = state.postings.filter(p => p.kind === 'SUPPLIER_RETURN_REVERSAL' && p.reverses === original.id);
      const available = d(original.qty) + reversals.reduce((sum, p) => sum + d(p.qty), 0n);
      const qty = q(original.itemId, command.qty);
      if (qty > available) throw new Error('El reemplazo supera la devolución disponible.');
      const components = new Map<string, ValueSource>();
      for (const row of [original, ...reversals]) for (const source of effectiveSources(row, state)) {
        const previous = components.get(source.id);
        components.set(source.id, previous ? { ...previous, qty: f(d(previous.qty) + d(source.qty)), value: f(d(previous.value) + d(source.value)) } : structuredClone(source));
      }
      const sources = [...components.values()], value = proportion(sources.reduce((sum, source) => sum + d(source.value), 0n), qty, available);
      const quantities = apportion(sources.map(source => d(source.qty)), qty), values = apportion(sources.map(source => d(source.value)), value);
      const restored = sources.map((source, i) => ({ ...source, qty: f(quantities[i]), value: f(values[i]) }));
      const unknown = restored.filter(source => source.unknown).reduce((sum, source) => sum + d(source.qty), 0n);
      receive(original.itemId, qty, value, unknown, restored);
      post({ itemId: original.itemId, kind: 'SUPPLIER_RETURN_REVERSAL', qty: f(-qty), knownCost: f(-value), cost: unknown ? null : f(-value), unknownQty: f(-unknown), reverses: original.id, purchaseId: original.purchaseId, lineId: original.lineId, sources: restored.map(source => ({ ...source, qty: f(-d(source.qty)), value: f(-d(source.value)) })), reason: command.reason });
      post({ itemId: original.itemId, kind: 'REPLACEMENT_RECEIPT', qty: f(qty), stockDelta: f(qty), knownCost: f(value), cost: unknown ? null : f(value), unknownQty: f(unknown), purchaseId: original.purchaseId, lineId: original.lineId, reason: command.reason });
      const line = state.purchases.find(p => p.id === original.purchaseId)?.lines.find(l => l.id === original.lineId);
      if (line) { add(line, 'returned', -qty); add(line, 'received', qty); }
      state.audits.push({ id: id(), actor, reason: command.reason, before: { returnId: original.id, replacementAvailable: f(available) }, after: { received: f(qty), replacementAvailable: f(available - qty) }, occurredAt: now });
      break;
    }
    case 'CORRECT_USE': {
      const direct = state.postings.find(p => p.id === command.postingId && p.kind === 'DIRECT_USE');
      if (direct) {
        reason();
        const reversals = state.postings.filter(p => p.reverses === direct.id && p.kind === 'USE_REVERSAL');
        const available = d(direct.qty) + reversals.reduce((sum, p) => sum + d(p.qty), 0n);
        const replacement = q(direct.itemId, command.replacementQty, true);
        if (replacement >= available) throw new Error('Para aumentar uso confirma material adicional disponible; la corrección debe reducir la cantidad original.');
        if (!['WAREHOUSE', 'LOSS'].includes(command.destination)) throw new Error('Indica el destino físico.');
        const components = new Map<string, ValueSource>();
        for (const row of [direct, ...reversals]) for (const source of effectiveSources(row, state)) {
          const previous = components.get(source.id);
          components.set(source.id, previous ? { ...previous, qty: f(d(previous.qty) + d(source.qty)), value: f(d(previous.value) + d(source.value)) } : structuredClone(source));
        }
        const sources = [...components.values()], removed = available - replacement;
        const sourceQty = apportion(sources.map(source => d(source.qty)), removed);
        const value = proportion(sources.reduce((sum, source) => sum + d(source.value), 0n), removed, available);
        const sourceValue = apportion(sources.map(source => d(source.value)), value);
        const returned = sources.map((source, i) => ({ ...source, qty: f(sourceQty[i]), value: f(sourceValue[i]) }));
        const unknown = returned.filter(source => source.unknown).reduce((sum, source) => sum + d(source.qty), 0n);
        post({ itemId: direct.itemId, kind: 'USE_REVERSAL', qty: f(-removed), stockDelta: command.destination === 'WAREHOUSE' ? f(removed) : '0', cost: unknown ? null : f(-value), knownCost: f(-value), unknownQty: f(-unknown), reverses: direct.id, purchaseId: direct.purchaseId, lineId: direct.lineId, reason: command.reason, sources: returned.map(source => ({ ...source, qty: f(-d(source.qty)), value: f(-d(source.value)) })) });
        if (command.destination === 'WAREHOUSE') receive(direct.itemId, removed, value, unknown, returned);
        else post({ itemId: direct.itemId, kind: 'LOSS', qty: f(removed), cost: unknown ? null : f(value), knownCost: f(value), unknownQty: f(unknown), reason: command.reason, sources: returned });
        const line = state.purchases.find(p => p.id === direct.purchaseId)?.lines.find(l => l.id === direct.lineId);
        if (line) { add(line, 'used', -removed); add(line, command.destination === 'WAREHOUSE' ? 'received' : 'lost', removed); }
        break;
      }
      const original = state.postings.find(p => p.id === command.postingId && p.kind === 'WAREHOUSE_USE');
      if (!original || state.postings.some(p => p.reverses === original.id && p.kind === 'USE_REVERSAL')) throw new Error('El consumo no existe o ya fue corregido; revisa la versión.');
      if (!['WAREHOUSE', 'LOSS'].includes(command.destination)) throw new Error('Indica el destino físico.');
      reason();
      const completions = state.postings.filter(p => p.reverses === original.id && p.kind === 'COST_COMPLETION');
      const known = d(original.knownCost) + completions.reduce((sum, p) => sum + d(p.knownCost), 0n) + state.postings.filter(p => p.kind === 'PRICE_ADJUSTMENT' && p.adjusts === original.id).reduce((sum, p) => sum + d(p.knownCost), 0n);
      const unknown = d(original.unknownQty) + completions.reduce((sum, p) => sum + d(p.unknownQty), 0n);
      post({ ...original, id: id(), kind: 'USE_REVERSAL', qty: f(-d(original.qty)), stockDelta: command.destination === 'WAREHOUSE' ? original.qty : '0', cost: unknown > 0n ? null : f(-known), knownCost: f(-known), unknownQty: f(-unknown), reverses: original.id, reason: command.reason, actor, occurredAt: now, sources: effectiveSources(original, state).map(source => ({ ...source, qty: f(-d(source.qty)), value: f(-d(source.value)) })) });
      if (command.destination === 'WAREHOUSE') receive(original.itemId, d(original.qty), known, unknown, effectiveSources(original, state));
      else post({ itemId: original.itemId, kind: 'LOSS', qty: original.qty, cost: unknown > 0n ? null : f(known), knownCost: f(known), unknownQty: f(unknown), reason: command.reason, sources: effectiveSources(original, state) });
      const replacement = q(original.itemId, command.replacementQty, true);
      if (replacement) post({ itemId: original.itemId, kind: 'WAREHOUSE_USE', qty: f(replacement), stockDelta: f(-replacement), ...withdraw(original.itemId, replacement), reason: command.reason });
      break;
    }
    case 'COMPLETE_COST': {
      reason();
      const original = state.postings.find(p => p.id === command.postingId && p.cost === null && d(p.unknownQty) > 0n);
      if (!original || state.postings.some(p => p.reverses === original.id)) throw new Error('No hay un costo pendiente sin corregir.');
      const unit = quantity(command.unitCost, 6, true);
      const value = (unit * d(original.unknownQty) + SCALE / 2n) / SCALE;
      post({ itemId: original.itemId, kind: 'COST_COMPLETION', qty: '0', cost: f(value), knownCost: f(value), unknownQty: f(-d(original.unknownQty)), reverses: original.id, reason: command.reason });
      break;
    }
    case 'VALUE_STOCK': {
      reason();
      const stock = stocks[command.itemId]; item(command.itemId);
      if (!stock || d(stock.unknownQty) === 0n) throw new Error('No hay existencias con costo pendiente.');
      const value = (quantity(command.unitCost, 6, true) * d(stock.unknownQty) + SCALE / 2n) / SCALE;
      ensureSources(stock);
      stock.knownValue = f(d(stock.knownValue) + value); stock.unknownQty = '0';
      const allocated = apportion(stock.sources!.map(source => source.unknown ? d(source.qty) : 0n), value);
      stock.sources = stock.sources!.map((source, i) => ({ ...source, value: f(d(source.value) + allocated[i]), unknown: false }));
      post({ itemId: command.itemId, kind: 'STOCK_COST_COMPLETION', qty: '0', cost: f(value), knownCost: f(value), reason: command.reason });
      break;
    }
    default: throw new Error('Comando de materiales inválido.');
  }
  for (const purchase of state.purchases) for (const line of purchase.lines) {
    if (d(line.purchased) !== d(line.used) + d(line.received) + d(line.returned) + d(line.lost) + d(line.pending))
      throw new Error('Las cantidades de la compra no concilian.');
  }
  if (['CORRECT_USE', 'COMPLETE_COST', 'VALUE_STOCK'].includes(command.type) || (command.type === 'DESTINATION' && context.admin))
    state.audits.push({ id: id(), actor, reason: reason(), before, after: structuredClone({ state: { purchases: state.purchases, postings: state.postings }, stocks }), occurredAt: now });
  return { state, balances: stocks };
}

export function materialsSummary(state: MaterialState) {
  const usageKinds = ['WAREHOUSE_USE', 'DIRECT_USE', 'USE_REVERSAL'];
  const usages = state.postings.filter(p => usageKinds.includes(p.kind) || (p.kind === 'PRICE_ADJUSTMENT' && usageKinds.includes(state.postings.find(original => original.id === p.adjusts)?.kind ?? '')) || (p.kind === 'COST_COMPLETION' && usageKinds.includes(state.postings.find(original => original.id === p.reverses)?.kind ?? '')));
  const unknown = usages.reduce((sum, p) => sum + d(p.unknownQty), 0n);
  const losses = state.postings.filter(p => p.kind === 'LOSS' || (['PRICE_ADJUSTMENT', 'COST_COMPLETION'].includes(p.kind) && state.postings.find(original => original.id === (p.adjusts ?? p.reverses))?.kind === 'LOSS'));
  const lossUnknown = losses.reduce((sum, p) => sum + d(p.unknownQty), 0n);
  return { currency: 'MXN', complete: unknown === 0n, materialsCost: unknown === 0n ? f(usages.reduce((sum, p) => sum + d(p.knownCost), 0n)) : null,
    knownMaterialsCost: f(usages.reduce((sum, p) => sum + d(p.knownCost), 0n)),
    lossCost: lossUnknown === 0n ? f(losses.reduce((sum, p) => sum + d(p.knownCost), 0n)) : null,
    pendingDestinations: state.purchases.flatMap(p => p.lines.filter(l => d(l.pending) > 0n).map(l => ({ purchaseId: p.id, lineId: l.id, qty: l.pending }))) };
}
