import { TrustedActor } from './trusted-actor';

export abstract class ActorDirectoryPort {
  abstract resolve(
    issuer: string,
    subject: string,
  ): Promise<TrustedActor | null>;
}
export abstract class FacilityDirectoryPort {
  abstract list(): Promise<{ id: string; name: string }[]>;
}

/** Minimal published directory for maintenance assignment; no access-management data. */
export abstract class MaintenanceAssigneesPort {
  abstract maintenanceAssignees(
    facilityId: string,
  ): Promise<{ subject: string; displayName: string }[]>;
}
