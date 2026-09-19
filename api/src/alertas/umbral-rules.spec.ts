import {
  DEFAULT_UMBRAL_FORANEO_H,
  DEFAULT_UMBRAL_LOCAL_H,
} from './enums';
import {
  alertaSinRegreso,
  elapsedHoras,
  resolveUmbralHoras,
} from './umbral-rules';

describe('resolveUmbralHoras (ADR-004 L8)', () => {
  it('unidad override gana sobre default de ambito', () => {
    expect(
      resolveUmbralHoras({ ambito: 'LOCAL', overrideHoras: 3 }),
    ).toBe(3);
    expect(
      resolveUmbralHoras({ ambito: 'FORANEO', overrideHoras: 10 }),
    ).toBe(10);
  });

  it('sin override: LOCAL 8h / FORANEO 24h', () => {
    expect(resolveUmbralHoras({ ambito: 'LOCAL' })).toBe(
      DEFAULT_UMBRAL_LOCAL_H,
    );
    expect(resolveUmbralHoras({ ambito: 'FORANEO' })).toBe(
      DEFAULT_UMBRAL_FORANEO_H,
    );
    expect(DEFAULT_UMBRAL_LOCAL_H).toBe(8);
    expect(DEFAULT_UMBRAL_FORANEO_H).toBe(24);
  });

  it('regla configurada sustituye el default de ambito si no hay override', () => {
    expect(
      resolveUmbralHoras({
        ambito: 'LOCAL',
        defaultLocalH: 6,
        defaultForaneoH: 20,
      }),
    ).toBe(6);
    expect(
      resolveUmbralHoras({
        ambito: 'FORANEO',
        defaultLocalH: 6,
        defaultForaneoH: 20,
      }),
    ).toBe(20);
    expect(
      resolveUmbralHoras({
        ambito: 'LOCAL',
        overrideHoras: 2,
        defaultLocalH: 6,
      }),
    ).toBe(2);
  });
});

describe('alertaSinRegreso (ADR-004 L9)', () => {
  const now = new Date('2026-09-19T12:00:00.000Z');

  it('EN_RUTA reciente no alerta; elapsed >= umbral sí', () => {
    const hace2h = new Date('2026-09-19T10:00:00.000Z');
    const hace9h = new Date('2026-09-19T03:00:00.000Z');
    expect(
      alertaSinRegreso({
        opsEstado: 'EN_RUTA',
        salidaAt: hace2h,
        now,
        thresholdHoras: 8,
      }),
    ).toBeNull();
    expect(
      alertaSinRegreso({
        opsEstado: 'EN_RUTA',
        salidaAt: hace9h,
        now,
        thresholdHoras: 8,
      }),
    ).toBe('SIN_REGRESO');
    expect(elapsedHoras(hace9h, now)).toBe(9);
  });

  it('DISPONIBLE o sin salida_at no alerta', () => {
    expect(
      alertaSinRegreso({
        opsEstado: 'DISPONIBLE',
        salidaAt: new Date('2026-09-18T00:00:00.000Z'),
        now,
        thresholdHoras: 8,
      }),
    ).toBeNull();
    expect(
      alertaSinRegreso({
        opsEstado: 'EN_RUTA',
        salidaAt: null,
        now,
        thresholdHoras: 8,
      }),
    ).toBeNull();
  });
});
