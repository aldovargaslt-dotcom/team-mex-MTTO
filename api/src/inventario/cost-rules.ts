import { UnprocessableEntityException } from '@nestjs/common';
export type CostInput = {
  state: 'PENDING' | 'RECORDED';
  inputTotalCents?: string;
  taxMode?: 'INCLUDED' | 'EXCLUDED';
  taxTreatment?: 'TAXED' | 'NO_TAX';
  rateBps?: number;
  currency?: 'MXN';
};
export type CostMoney = {
  currency: 'MXN';
  inputTotalCents: string;
  taxMode: 'INCLUDED' | 'EXCLUDED';
  taxTreatment: 'TAXED' | 'NO_TAX';
  rateBps: number;
  netCents: string;
  taxCents: string;
  totalCents: string;
};
export function roundRatio(n: bigint, d: bigint) {
  if (n < 0n || d <= 0n) throw new Error('Invalid monetary ratio');
  return (2n * n + d) / (2n * d);
}
export function cents(value: unknown): bigint {
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]{0,15})$/.test(value))
    throw new UnprocessableEntityException(
      'Indique un importe válido en centavos MXN.',
    );
  return BigInt(value);
}
export function calculateCost(input: CostInput): CostMoney | null {
  if (!input || !['PENDING', 'RECORDED'].includes(input.state))
    throw new UnprocessableEntityException(
      'Indique si el costo está registrado o pendiente.',
    );
  if (input.currency && input.currency !== 'MXN')
    throw new UnprocessableEntityException('Solo se admite MXN.');
  if (input.state === 'PENDING') {
    if (input.inputTotalCents != null)
      throw new UnprocessableEntityException(
        'Un costo pendiente no lleva importe.',
      );
    return null;
  }
  const amount = cents(input.inputTotalCents);
  if (!['INCLUDED', 'EXCLUDED'].includes(input.taxMode!))
    throw new UnprocessableEntityException(
      'Seleccione si el importe incluye IVA.',
    );
  if (!['TAXED', 'NO_TAX'].includes(input.taxTreatment!))
    throw new UnprocessableEntityException('Indique el tratamiento de IVA.');
  const rate = input.taxTreatment === 'NO_TAX' ? 0 : input.rateBps;
  if (!Number.isInteger(rate) || rate! < 0 || rate! > 10000)
    throw new UnprocessableEntityException(
      'La tasa de IVA debe estar entre 0 y 100%.',
    );
  const net =
    input.taxMode === 'INCLUDED'
      ? roundRatio(amount * 10000n, 10000n + BigInt(rate!))
      : amount;
  const tax =
    input.taxMode === 'INCLUDED'
      ? amount - net
      : roundRatio(net * BigInt(rate!), 10000n);
  return {
    currency: 'MXN',
    inputTotalCents: amount.toString(),
    taxMode: input.taxMode!,
    taxTreatment: input.taxTreatment!,
    rateBps: rate!,
    netCents: net.toString(),
    taxCents: tax.toString(),
    totalCents: (net + tax).toString(),
  };
}
export function allocatedCost(value: string, qty: number, available: number) {
  if (
    !Number.isSafeInteger(qty) ||
    qty <= 0 ||
    !Number.isSafeInteger(available) ||
    available < qty
  )
    throw new UnprocessableEntityException('Cantidad no válida para el costo.');
  return roundRatio(BigInt(value) * BigInt(qty), BigInt(available)).toString();
}
