import { defaultDimensions, validateAlertThresholds, validateWeights } from './config-rules';
import { HealthDimensionId } from './enums';

describe('H2 weight validation', () => {
  it('45 + 40 + 15 = valid', () => {
    expect(validateWeights(defaultDimensions())).toBeNull();
  });

  it('50 + 30 + 20 = valid', () => {
    expect(
      validateWeights([
        { id: HealthDimensionId.MAINTENANCE, weight: 50 },
        { id: HealthDimensionId.ALERTS, weight: 30 },
        { id: HealthDimensionId.INSPECTIONS, weight: 20 },
      ]),
    ).toBeNull();
  });

  it('0 + 100 + 0 = valid', () => {
    expect(
      validateWeights([
        { id: HealthDimensionId.MAINTENANCE, weight: 0 },
        { id: HealthDimensionId.ALERTS, weight: 100 },
        { id: HealthDimensionId.INSPECTIONS, weight: 0 },
      ]),
    ).toBeNull();
  });

  it('50 + 50 + 10 = invalid (120)', () => {
    const msg = validateWeights([
      { id: HealthDimensionId.MAINTENANCE, weight: 50 },
      { id: HealthDimensionId.ALERTS, weight: 50 },
      { id: HealthDimensionId.INSPECTIONS, weight: 10 },
    ]);
    expect(msg).toMatch(/suman 110%/);
  });

  it('30 + 30 + 30 = invalid (90)', () => {
    const msg = validateWeights([
      { id: HealthDimensionId.MAINTENANCE, weight: 30 },
      { id: HealthDimensionId.ALERTS, weight: 30 },
      { id: HealthDimensionId.INSPECTIONS, weight: 30 },
    ]);
    expect(msg).toMatch(/suman 90%/);
  });

  it('negative = invalid', () => {
    expect(
      validateWeights([
        { id: HealthDimensionId.MAINTENANCE, weight: -10 },
        { id: HealthDimensionId.ALERTS, weight: 80 },
        { id: HealthDimensionId.INSPECTIONS, weight: 30 },
      ]),
    ).toMatch(/0 y 100/);
  });

  it('>100 = invalid', () => {
    expect(
      validateWeights([
        { id: HealthDimensionId.MAINTENANCE, weight: 101 },
        { id: HealthDimensionId.ALERTS, weight: 0 },
        { id: HealthDimensionId.INSPECTIONS, weight: 0 },
      ]),
    ).toMatch(/0 y 100/);
  });

  it('recovery must be greater than alert', () => {
    expect(validateAlertThresholds(60, 65)).toBeNull();
    expect(validateAlertThresholds(60, 55)).toMatch(/mayor al porcentaje de alerta/);
    expect(validateAlertThresholds(60, 60)).toMatch(/mayor al porcentaje de alerta/);
  });
});
