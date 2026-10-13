import { decimal as d, formatDecimal as f } from './cost-decimal';
import { Balance } from './materials-model';

/** Analytical weighted-average attribution; no physical lots or reservations. */
export function ensureSources(balance: Balance) {
  if (balance.sources?.length) {
    if (balance.sources.reduce((sum, source) => sum + d(source.qty), 0n) !== d(balance.qty)
      || balance.sources.reduce((sum, source) => sum + d(source.value), 0n) !== d(balance.knownValue)
      || balance.sources.filter(source => source.unknown).reduce((sum, source) => sum + d(source.qty), 0n) !== d(balance.unknownQty))
      throw new Error('La valoración no concilia; revisa la auditoría de existencias.');
    return;
  }
  const unknown = d(balance.unknownQty), known = d(balance.qty) - unknown;
  balance.sources = [];
  if (known) balance.sources.push({ id: 'opening-known', qty: f(known), value: balance.knownValue, unknown: false });
  if (unknown) balance.sources.push({ id: 'opening-unknown', qty: f(unknown), value: '0', unknown: true });
}
export function apportion(weights: bigint[], total: bigint): bigint[] {
  const sum = weights.reduce((a, b) => a + b, 0n);
  if (total === 0n) return weights.map(() => 0n);
  if (sum <= 0n) throw new Error('No existe base para distribuir el valor.');
  const result = weights.map(w => w * total / sum);
  let residue = total - result.reduce((a, b) => a + b, 0n);
  const order = weights.map((w, i) => ({ i, rest: w * total % sum })).sort((a, b) => a.rest === b.rest ? a.i - b.i : a.rest > b.rest ? -1 : 1);
  for (const row of order) { if (!residue) break; result[row.i]++; residue--; }
  return result;
}
