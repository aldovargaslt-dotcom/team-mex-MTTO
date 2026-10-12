import { prioridadMantenimiento } from './andon-rules';

describe('Prioridad mantenimiento — AC-03', () => {
  const input = {
    kmDesde: 0,
    diasDesde: 89,
    tKm: 10000,
    tDias: 90,
    criticalOverdueKm: 1000,
    criticalOverdueDays: 30,
  };
  it('no alerta antes del límite; seguimiento en el límite', () => {
    expect(prioridadMantenimiento(input)).toBeNull();
    expect(prioridadMantenimiento({ ...input, diasDesde: 90 })).toBe('WARNING');
  });
  it('escala al alcanzar 30 días adicionales y respeta nuevo margen', () => {
    expect(prioridadMantenimiento({ ...input, diasDesde: 119 })).toBe(
      'WARNING',
    );
    expect(prioridadMantenimiento({ ...input, diasDesde: 120 })).toBe(
      'CRITICAL',
    );
    expect(
      prioridadMantenimiento({
        ...input,
        diasDesde: 120,
        criticalOverdueDays: 31,
      }),
    ).toBe('WARNING');
  });
  it('vía km es independiente y límites inclusivos', () => {
    expect(prioridadMantenimiento({ ...input, kmDesde: 10000 })).toBe(
      'WARNING',
    );
    expect(prioridadMantenimiento({ ...input, kmDesde: 11000 })).toBe(
      'CRITICAL',
    );
  });
  it('subir intervalos retira condición, sin mantenimiento ficticio', () => {
    expect(
      prioridadMantenimiento({ ...input, diasDesde: 120, tDias: 130 }),
    ).toBeNull();
  });
});
