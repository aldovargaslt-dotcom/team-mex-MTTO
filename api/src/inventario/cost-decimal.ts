/** Exact fixed-point quantities and internal MXN; never binary floating point. */
export const SCALE = 1_000_000n;
export function decimal(value: string, precision = 6): bigint {
  if (typeof value !== 'string' || !/^-?\d{1,14}(\.\d{1,6})?$/.test(value))
    throw new Error('Introduce un decimal válido, con hasta seis decimales.');
  const negative = value.startsWith('-');
  const [whole, fraction = ''] = value.replace('-', '').split('.');
  if (fraction.replace(/0+$/, '').length > precision)
    throw new Error(`Esta unidad admite hasta ${precision} decimales.`);
  const result = BigInt(whole) * SCALE + BigInt(fraction.padEnd(6, '0'));
  return negative ? -result : result;
}
export function formatDecimal(value: bigint): string {
  const abs = value < 0n ? -value : value;
  const fraction = (abs % SCALE).toString().padStart(6, '0').replace(/0+$/, '');
  return `${value < 0n ? '-' : ''}${abs / SCALE}${fraction ? '.' + fraction : ''}`;
}
/** Half-up allocation; exhaustions take the entire remainder. */
export function proportion(value: bigint, qty: bigint, total: bigint): bigint {
  if (total <= 0n || qty < 0n || qty > total) throw new Error('Cantidad fuera del saldo disponible.');
  return qty === total ? value : (value * qty + total / 2n) / total;
}
export function quantity(value: string, precision: number, allowZero = false) {
  const q = decimal(value, precision);
  if (q < 0n || (!allowZero && q === 0n)) throw new Error('La cantidad debe ser positiva.');
  return q;
}
