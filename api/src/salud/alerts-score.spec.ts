import { alertsScoreFrom, andonOpenAsSourceAlert, derivedHealthAlert } from './alerts-score';
import { AlertOrigin, AlertPenaltySeverity } from './enums';

describe('H4 alert penalties', () => {
  it('sin alertas SOURCE = 100', () => {
    expect(alertsScoreFrom([])).toBe(100);
  });

  it('1 MEDIUM = 85', () => {
    expect(
      alertsScoreFrom([
        { origin: AlertOrigin.SOURCE, severity: AlertPenaltySeverity.MEDIUM },
      ]),
    ).toBe(85);
  });

  it('Andon no resuelto = HIGH −30 → 70', () => {
    expect(alertsScoreFrom([andonOpenAsSourceAlert()])).toBe(70);
  });

  it('acumula SOURCE distintos', () => {
    expect(
      alertsScoreFrom([
        { origin: AlertOrigin.SOURCE, severity: AlertPenaltySeverity.HIGH },
        { origin: AlertOrigin.SOURCE, severity: AlertPenaltySeverity.MEDIUM },
        { origin: AlertOrigin.SOURCE, severity: AlertPenaltySeverity.LOW },
      ]),
    ).toBe(50);
  });

  it('nunca < 0', () => {
    expect(
      alertsScoreFrom([
        { origin: AlertOrigin.SOURCE, severity: AlertPenaltySeverity.CRITICAL },
        { origin: AlertOrigin.SOURCE, severity: AlertPenaltySeverity.CRITICAL },
      ]),
    ).toBe(0);
  });

  it('DERIVED no cambia alerts_score', () => {
    const sourceOnly = alertsScoreFrom([andonOpenAsSourceAlert()]);
    const withDerived = alertsScoreFrom([
      andonOpenAsSourceAlert(),
      derivedHealthAlert(),
    ]);
    expect(withDerived).toBe(sourceOnly);
    expect(alertsScoreFrom([derivedHealthAlert()])).toBe(100);
  });
});
