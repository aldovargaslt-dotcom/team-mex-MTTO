export type InsuranceStatus =
  | 'PRESENT_VALID'
  | 'MISSING'
  | 'EXPIRED_OR_EXPIRES_TODAY'
  | 'SOURCE_UNAVAILABLE';

export type InsuranceEvaluation = {
  status: InsuranceStatus;
  reason:
    | 'MISSING_INSURANCE'
    | 'INVALID_INSURANCE'
    | 'POLICY_SOURCE_UNAVAILABLE'
    | null;
  operationalDate: string;
};

export function evaluateInsurance(
  current: { expirationDate: string } | null,
  operationalDate: string,
): InsuranceEvaluation {
  if (!current) {
    return { status: 'MISSING', reason: 'MISSING_INSURANCE', operationalDate };
  }
  if (current.expirationDate <= operationalDate) {
    return {
      status: 'EXPIRED_OR_EXPIRES_TODAY',
      reason: 'INVALID_INSURANCE',
      operationalDate,
    };
  }
  return { status: 'PRESENT_VALID', reason: null, operationalDate };
}
