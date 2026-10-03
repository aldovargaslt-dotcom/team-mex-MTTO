export const FINDING_CLASSIFICATIONS = [
  'OBSERVATION',
  'FIXED_DURING_CHECK',
  'REQUIRES_WORK',
] as const;
export type FindingClassification = (typeof FINDING_CLASSIFICATIONS)[number];

export function prepareCorrectiveContext(input: {
  unidadId: string;
  checkId: string;
  findingId: string;
  note: string;
  evidenceRefs: string[];
}) {
  return {
    status: 'PREPARED' as const,
    unidadId: input.unidadId,
    sourceCheckId: input.checkId,
    findingId: input.findingId,
    note: input.note.trim(),
    evidenceRefs: [...new Set(input.evidenceRefs)],
  };
}
