import { EntityManager } from 'typeorm';
export type CheckCreatedEvent = {
  eventId: string;
  eventType: 'CHECK_CREATED';
  schemaVersion: 1;
  occurredAt: string;
  checkId: string;
  unidadId: string;
  numeroInterno: string;
  facilityId: string;
  source: string;
  operationalDate: string;
  actorRef: { subject: string; displayName: string; attributionLevel: string };
};
export abstract class CheckDeliveryPort {
  abstract deliver(
    event: CheckCreatedEvent,
    manager: EntityManager,
  ): Promise<void>;
}
