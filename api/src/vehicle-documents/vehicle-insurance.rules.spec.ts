import { evaluateInsurance } from './vehicle-insurance.rules';

describe('evaluateInsurance', () => {
  const operationalDate = '2026-10-02';

  it('bloquea póliza faltante, vencida o que vence hoy', () => {
    expect(evaluateInsurance(null, operationalDate).status).toBe('MISSING');
    expect(
      evaluateInsurance({ expirationDate: '2026-10-01' }, operationalDate)
        .status,
    ).toBe('EXPIRED_OR_EXPIRES_TODAY');
    expect(
      evaluateInsurance({ expirationDate: operationalDate }, operationalDate)
        .status,
    ).toBe('EXPIRED_OR_EXPIRES_TODAY');
  });

  it('considera válida una póliza que vence mañana', () => {
    expect(
      evaluateInsurance({ expirationDate: '2026-10-03' }, operationalDate),
    ).toEqual({
      status: 'PRESENT_VALID',
      reason: null,
      operationalDate,
    });
  });
});
