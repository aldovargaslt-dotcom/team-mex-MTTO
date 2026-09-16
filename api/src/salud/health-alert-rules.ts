export type HealthAlertDecision = 'CREATE' | 'KEEP' | 'RESOLVE' | 'NONE';

export type EvaluateHealthAlertInput = {
  enabled: boolean;
  alertThreshold: number;
  recoveryThreshold: number;
  previousScore: number | null;
  currentScore: number | null;
  hasActive: boolean;
  /** Tras PUT de config: crear si current < threshold aunque no haya cruce. */
  reevaluatePolicy?: boolean;
};

/**
 * H9–H13. Crossing + histeresis. Deshabilitar la regla no cierra alertas.
 */
export function evaluateHealthAlertRule(
  input: EvaluateHealthAlertInput,
): HealthAlertDecision {
  if (input.hasActive) {
    if (
      input.currentScore != null &&
      input.currentScore >= input.recoveryThreshold
    ) {
      return 'RESOLVE';
    }
    return 'KEEP';
  }
  if (!input.enabled) {
    return 'NONE';
  }
  if (input.currentScore == null) {
    return 'NONE';
  }
  if (input.currentScore >= input.alertThreshold) {
    return 'NONE';
  }
  if (input.reevaluatePolicy) {
    return 'CREATE';
  }
  if (
    input.previousScore == null ||
    input.previousScore >= input.alertThreshold
  ) {
    return 'CREATE';
  }
  return 'NONE';
}
