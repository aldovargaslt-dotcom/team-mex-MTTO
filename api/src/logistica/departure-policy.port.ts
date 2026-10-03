import { EntityManager } from 'typeorm';
import { TrustedActor } from '../auth/trusted-actor';
import { DepartureBlockReason } from './departure-policy.rules';

export type DepartureAuthorization = {
  allowed: true;
  reasons: [];
  signedCheckRef: {
    checkId: string;
    snapshotHash: string;
    version: number;
    result: 'FIT' | 'FIT_WITH_OBSERVATION';
  };
  insuranceRef: { documentId: string; version: number; expirationDate: string };
  blockVersions: {
    physicalVersion: number;
    physicalSource: 'FLOTA_MOVEMENT' | 'FLOTA_TRANSITION';
    maintenanceBlocking: false;
    facilityId: string;
    facilityVersion: number;
    mappingVersion: number;
    journeyUpdatedAt: string;
  };
  evaluatedAt: string;
  operationalDate: string;
};

export type DeparturePolicyDenial = {
  allowed: false;
  reasons: DepartureBlockReason[];
  evaluatedAt: string;
  operationalDate: string;
};

export abstract class DeparturePolicyPort {
  abstract authorize(
    unidadId: string,
    actor: TrustedActor,
    manager: EntityManager,
    now?: Date,
  ): Promise<DepartureAuthorization>;
}
