import { maintenanceAxisScore, minScore, scoreFromRemainingRatio } from './maintenance-score';

describe('H3 maintenance curve', () => {
  const interval = 10000;

  it('recién atendido / r>=1 → 100', () => {
    expect(maintenanceAxisScore(10000, interval)).toBe(100);
    expect(maintenanceAxisScore(12000, interval)).toBe(100);
  });

  it('entra a ventana preventiva (15%) → 90', () => {
    expect(maintenanceAxisScore(1500, interval)).toBeCloseTo(90, 5);
  });

  it('en límite remaining 0 → 35', () => {
    expect(maintenanceAxisScore(0, interval)).toBeCloseTo(35, 5);
  });

  it('vencido ligeramente r=-0.15 → 15', () => {
    expect(maintenanceAxisScore(-1500, interval)).toBeCloseTo(15, 5);
  });

  it('vencido un intervalo → 0', () => {
    expect(maintenanceAxisScore(-10000, interval)).toBe(0);
    expect(maintenanceAxisScore(-20000, interval)).toBe(0);
  });

  it('sin acantilado 1001 vs 999 km', () => {
    const a = maintenanceAxisScore(1001, interval);
    const b = maintenanceAxisScore(999, interval);
    expect(Math.abs(a - b)).toBeLessThan(1);
    expect(a).toBeGreaterThan(70);
    expect(a).toBeLessThan(90);
  });

  it('MIN(km, tiempo) toma el eje más restrictivo', () => {
    const km = maintenanceAxisScore(3000, 10000);
    const time = maintenanceAxisScore(5, 90);
    expect(minScore([km, time])).toBe(time);
    expect(time).toBeLessThan(km);
  });

  it('scoreFromRemainingRatio es progresivo en la ventana', () => {
    const hi = scoreFromRemainingRatio(0.14);
    const lo = scoreFromRemainingRatio(0.01);
    expect(hi).toBeGreaterThan(lo);
  });
});
