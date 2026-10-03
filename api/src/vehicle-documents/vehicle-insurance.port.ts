import type { EntityManager } from 'typeorm';
import type { InsuranceEvaluation } from './vehicle-insurance.rules';

export type InsurancePolicySnapshot = InsuranceEvaluation & {
  unidadId: string;
  documentId: string | null;
  version: number | null;
  expirationDate: string | null;
};

export abstract class VehicleInsurancePolicyPort {
  abstract evaluateBatch(
    requests: { unidadId: string; operationalDate: string }[],
    transactionContext?: EntityManager,
  ): Promise<Map<string, InsurancePolicySnapshot>>;
}
