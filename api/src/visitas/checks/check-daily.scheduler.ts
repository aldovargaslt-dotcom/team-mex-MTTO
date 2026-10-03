import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TrustedActor } from '../../auth/trusted-actor';
import { CanonicalOrdersService } from './canonical-orders.service';

/** Runtime adapter: scheduling policy lives outside the command. */
@Injectable()
export class CheckDailyScheduler {
  constructor(
    private readonly config: ConfigService,
    private readonly checks: CanonicalOrdersService,
  ) {}

  run(facilityId: string, operationalDate: string, commandId: string) {
    if (this.config.get('CHECK_DAILY_ENABLED') !== 'true')
      return { enabled: false };
    const actor: TrustedActor = {
      subject: 'system:check-daily',
      displayName: 'CHECK daily scheduler',
      roles: ['SYSTEM'],
      facilityScopes: [facilityId],
      authMode: 'TRUSTED',
      attributionLevel: 'SERVER_VERIFIED',
    };
    return this.checks.generateDailyVehicleChecks(
      facilityId,
      operationalDate,
      commandId,
      actor,
    );
  }
}
