import { emitIfActive } from './ports';

describe('emitIfActive (K5)', () => {
  it('emite si el puerto falta (default activo)', async () => {
    const calls: string[] = [];
    const emitted = await emitIfActive(undefined, 'MTTO_VENCIDO', async () => {
      calls.push('ok');
    });
    expect(emitted).toBe(true);
    expect(calls).toEqual(['ok']);
  });

  it('no emite si isActive es false', async () => {
    const calls: string[] = [];
    const emitted = await emitIfActive(
      { isActive: async () => false },
      'MTTO_VENCIDO',
      async () => {
        calls.push('ok');
      },
    );
    expect(emitted).toBe(false);
    expect(calls).toEqual([]);
  });

  it('emite si isActive es true', async () => {
    const calls: string[] = [];
    const emitted = await emitIfActive(
      { isActive: async () => true },
      'STOCK_BAJO',
      async () => {
        calls.push('ok');
      },
    );
    expect(emitted).toBe(true);
    expect(calls).toEqual(['ok']);
  });
});
