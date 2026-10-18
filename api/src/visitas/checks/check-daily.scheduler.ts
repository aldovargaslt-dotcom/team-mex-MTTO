import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { TrustedActor } from '../../auth/trusted-actor';
import { CanonicalOrdersService } from './canonical-orders.service';
import { Facility } from './facility.entity';
import { operationalDay } from './facility-calendar';

/** Minute retries cover startup, midnight and vehicles returning to the yard. */
@Injectable()
export class CheckDailyScheduler
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(CheckDailyScheduler.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  constructor(
    private readonly config: ConfigService,
    private readonly checks: CanonicalOrdersService,
    @Optional() private readonly db?: DataSource,
  ) {}
  private get enabled() {
    return this.config.get('CHECK_DAILY_ENABLED') !== 'false';
  }
  onApplicationBootstrap() {
    if (process.env.NODE_ENV === 'test' || !this.enabled || !this.db) return;
    void this.tick();
    this.timer = setInterval(() => {
      void this.tick();
    }, 60_000);
    this.timer.unref();
  }
  onApplicationShutdown() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }
  async tick() {
    if (this.running || !this.enabled || !this.db) return;
    this.running = true;
    try {
      const day = operationalDay(new Date()).operationalDate;
      const facilities = await this.db.manager.find(Facility, {
        select: { id: true },
      });
      for (const facility of facilities) {
        try {
          await this.run(facility.id, day, `daily:${facility.id}:${day}`);
        } catch {
          this.logger.error(
            'No se pudo generar el chequeo diario de un patio; se reintentará en el siguiente ciclo.',
          );
        }
      }
    } catch {
      this.logger.error(
        'No se pudieron consultar los patios para el chequeo diario; se reintentará.',
      );
    } finally {
      this.running = false;
    }
  }
  run(facilityId: string, operationalDate: string, commandId: string) {
    if (!this.enabled) return { enabled: false };
    const actor: TrustedActor = {
      subject: 'system:check-daily',
      displayName: 'Generador de chequeos diarios',
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
