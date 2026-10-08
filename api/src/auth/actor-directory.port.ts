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
