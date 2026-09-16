import { evaluateHealthAlertRule } from './health-alert-rules';

const base = {
  enabled: true,
  alertThreshold: 60,
  recoveryThreshold: 65,
  hasActive: false,
};

describe('H9–H13 health alert rule', () => {
  it('H9 previous 70 current 59 → CREATE', () => {
    expect(
      evaluateHealthAlertRule({
        ...base,
        previousScore: 70,
        currentScore: 59,
      }),
    ).toBe('CREATE');
  });

  it('H10 active 59→55 → KEEP (no duplicate)', () => {
    expect(
      evaluateHealthAlertRule({
        ...base,
        previousScore: 59,
        currentScore: 55,
        hasActive: true,
      }),
    ).toBe('KEEP');
  });

  it('H11 59→62 KEEP; 62→66 RESOLVE', () => {
    expect(
      evaluateHealthAlertRule({
        ...base,
        previousScore: 59,
        currentScore: 62,
        hasActive: true,
      }),
    ).toBe('KEEP');
    expect(
      evaluateHealthAlertRule({
        ...base,
        previousScore: 62,
        currentScore: 66,
        hasActive: true,
      }),
    ).toBe('RESOLVE');
  });

  it('H12 previous null current 45 → CREATE', () => {
    expect(
      evaluateHealthAlertRule({
        ...base,
        previousScore: null,
        currentScore: 45,
      }),
    ).toBe('CREATE');
  });

  it('H13 threshold 60→70 health 65 reevaluate → CREATE', () => {
    expect(
      evaluateHealthAlertRule({
        enabled: true,
        alertThreshold: 70,
        recoveryThreshold: 75,
        previousScore: 65,
        currentScore: 65,
        hasActive: false,
        reevaluatePolicy: true,
      }),
    ).toBe('CREATE');
  });

  it('sin cruce y sin reevaluate no crea (59→55 sin activa)', () => {
    expect(
      evaluateHealthAlertRule({
        ...base,
        previousScore: 59,
        currentScore: 55,
      }),
    ).toBe('NONE');
  });

  it('deshabilitar no cierra si sigue bajo; recuperar sí resuelve', () => {
    expect(
      evaluateHealthAlertRule({
        ...base,
        enabled: false,
        previousScore: 70,
        currentScore: 50,
      }),
    ).toBe('NONE');
    expect(
      evaluateHealthAlertRule({
        ...base,
        enabled: false,
        previousScore: 50,
        currentScore: 50,
        hasActive: true,
      }),
    ).toBe('KEEP');
  });
});
