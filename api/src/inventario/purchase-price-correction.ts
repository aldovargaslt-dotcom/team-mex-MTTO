import { decimal as d, formatDecimal as f, quantity } from './cost-decimal';
import { Balance, MaterialState, Posting, ValueSource } from './materials-model';
import { apportion, ensureSources } from './valuation-sources';

export function effectiveSources(posting: Posting, state: MaterialState): ValueSource[] {
  const sources = posting.sources?.length ? posting.sources : [{
    id: 'legacy-' + posting.id, qty: posting.qty, value: posting.knownCost, unknown: d(posting.unknownQty) > 0n,
  }];
  const completions = state.postings.filter(p => p.kind === 'COST_COMPLETION' && p.reverses === posting.id);
  const completedValue = completions.reduce((sum, p) => sum + d(p.knownCost), 0n);
  const allocations = completedValue ? apportion(sources.map(source => source.unknown ? d(source.qty) : 0n), completedValue) : sources.map(() => 0n);
  return sources.map((source, i) => ({ ...source, unknown: completions.length ? false : source.unknown,
    value: f(d(source.value) + allocations[i] + state.postings.filter(p => p.kind === 'PRICE_ADJUSTMENT' && p.adjusts === posting.id && p.sourceId === source.id).reduce((sum, p) => sum + d(p.knownCost), 0n)) }));
}

/** Allocate an acquisition-price change over its explicit historical destinations.
 * Original snapshots stay immutable; affected OTs receive append-only adjustments.
 */
export function correctPurchasePrice(
  originals: Record<string, MaterialState>, balances: Record<string, Balance>,
  owner: string, purchaseId: string, lineId: string, paid: string,
  context: { actor: string; reason: string; now: string; id: () => string },
  inventoryExpenses: Posting[] = [],
) {
  if (!context.reason.trim()) throw new Error('El motivo es obligatorio.');
  const states = structuredClone(originals), stocks = structuredClone(balances);
  const purchase = states[owner]?.purchases.find(p => p.id === purchaseId);
  const line = purchase?.lines.find(l => l.id === lineId);
  if (!line) throw new Error('No se encontró la línea de compra.');
  const next = quantity(paid, 2, true), previous = d(line.paid), delta = next - previous;
  if (delta === 0n) throw new Error('El precio no cambió.');
  const stock = stocks[line.itemId]; ensureSources(stock);
  const targets: { owner: string; posting?: Posting; source?: ValueSource; pending?: boolean; value: bigint; qty: bigint }[] = [];
  const source = stock.sources!.find(s => s.id === lineId);
  if (source) targets.push({ owner, source, value: d(source.value), qty: d(source.qty) });
  if (d(line.pending) > 0n) targets.push({ owner, pending: true, value: d(line.pendingValue), qty: d(line.pending) });
  const expenseKinds = ['WAREHOUSE_USE', 'DIRECT_USE', 'USE_REVERSAL', 'LOSS', 'SUPPLIER_RETURN', 'SUPPLIER_RETURN_REVERSAL', 'INVENTORY_ADJUSTMENT'];
  for (const [ot, state] of Object.entries(states)) for (const posting of state.postings) {
    if (!expenseKinds.includes(posting.kind)) continue;
    const component = effectiveSources(posting, state).find(s => s.id === lineId);
    if (component) targets.push({ owner: ot, posting, value: d(component.value), qty: d(component.qty) });
  }
  for (const posting of inventoryExpenses) {
    const component = effectiveSources(posting, states[owner]).find(s => s.id === lineId);
    if (component) targets.push({ owner, posting, value: d(component.value), qty: d(component.qty) });
  }
  if (targets.reduce((sum, t) => sum + t.qty, 0n) !== d(line.purchased) || targets.reduce((sum, t) => sum + t.value, 0n) !== previous)
    throw new Error('La trazabilidad de valoración no concilia; no se puede corregir el precio sin resolver el historial.');
  const denominator = previous === 0n ? d(line.purchased) : previous;
  const allocations = targets.map(t => {
    const numerator = delta * (previous === 0n ? t.qty : t.value);
    const abs = numerator < 0n ? -numerator : numerator;
    const rounded = (abs + denominator / 2n) / denominator;
    return numerator < 0n ? -rounded : rounded;
  });
  const residue = delta - allocations.reduce((sum, a) => sum + a, 0n);
  const largest = targets.map((t, i) => ({ i, weight: previous === 0n ? t.qty : t.value })).sort((a, b) => a.weight > b.weight ? -1 : 1)[0];
  if (!largest) throw new Error('No hay destinos trazables.');
  allocations[largest.i] += residue;
  targets.forEach((target, i) => {
    const adjustment = allocations[i];
    if (target.source) {
      if (target.value + adjustment < 0n) throw new Error('El ajuste dejaría valoración negativa.');
      target.source.value = f(target.value + adjustment);
      stock.knownValue = f(d(stock.knownValue) + adjustment);
    }
    if (target.pending) line.pendingValue = f(d(line.pendingValue) + adjustment);
    const state = states[target.owner];
    state.postings.push({ id: context.id(), itemId: line.itemId, kind: 'PRICE_ADJUSTMENT', qty: '0', stockDelta: '0', cost: f(adjustment), knownCost: f(adjustment), unknownQty: '0', purchaseId, lineId, adjusts: target.posting?.id, sourceId: lineId, reason: context.reason, actor: context.actor, occurredAt: context.now });
    state.audits.push({ id: context.id(), actor: context.actor, reason: context.reason, before: { purchaseId, lineId, paid: line.paid, destinationCost: f(target.value) }, after: { paid, adjustment: f(adjustment), destinationCost: f(target.value + adjustment) }, occurredAt: context.now });
  });
  line.paid = f(next);
  return { states, balances: stocks };
}
