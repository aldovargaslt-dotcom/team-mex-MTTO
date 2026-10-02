import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { TrustedActor, validateActor } from '../../auth/trusted-actor';
import { CheckSource } from '../work-order';
import { CanonicalOrdersService } from './canonical-orders.service';
import { VehicleFacility } from './facility.entity';
import { operationalDay } from './facility-calendar';
import { scheduleDue } from './daily-check-rules';
export type DailyResult = {
  unidadId: string;
  status: 'CREATED' | 'SKIPPED' | 'CONFLICT';
  reason?: string;
  checkId?: string;
};
@Injectable()
export class DailyChecksService {
  constructor(
    private readonly db: DataSource,
    private readonly orders: CanonicalOrdersService,
  ) {}
  private authorize(facilityId: string, date: string, actor: TrustedActor) {
    validateActor(actor, process.env.NODE_ENV);
    if (
      !actor.roles.includes('SYSTEM') ||
      !actor.facilityScopes.includes(facilityId)
    )
      throw new ForbiddenException(
        'Daily requires authorized SYSTEM facility scope.',
      );
    if (date !== operationalDay(new Date()).operationalDate)
      throw new BadRequestException(
        'Daily requires the current operational date.',
      );
  }
  async generate(
    facilityId: string,
    date: string,
    actor: TrustedActor,
    commandId: string,
  ) {
    this.authorize(facilityId, date, actor);
    const mappings = await this.db
      .getRepository(VehicleFacility)
      .findBy({ facilityId });
    const results: DailyResult[] = [];
    for (const mapping of mappings)
      results.push(
        await this.generateVehicle(
          facilityId,
          mapping.unidadId,
          date,
          actor,
          commandId,
        ),
      );
    return { facilityId, operationalDate: date, results };
  }
  async generateVehicle(
    facilityId: string,
    unidadId: string,
    date: string,
    actor: TrustedActor,
    commandId: string,
  ): Promise<DailyResult> {
    this.authorize(facilityId, date, actor);
    if (!commandId?.trim())
      throw new BadRequestException('Daily commandId required.');
    try {
      const check = await this.orders.createCheck(
        unidadId,
        CheckSource.DAILY_AUTOMATIC,
        actor,
        { facilityId, operationalDate: date, commandId },
      );
      return { unidadId, status: 'CREATED', checkId: check.id };
    } catch (error) {
      if (!(error instanceof ConflictException)) throw error;
      const body = error.getResponse() as {
        code: string;
        details?: {
          checkId?: string;
          active?: { id: string };
          reason?: string;
          concurrent?: boolean;
        };
      };
      if (body.code === 'DAILY_ALREADY_GENERATED')
        return {
          unidadId,
          status: 'SKIPPED',
          reason: body.code,
          checkId: body.details?.checkId,
        };
      if (body.code === 'DAILY_INELIGIBLE')
        return { unidadId, status: 'SKIPPED', reason: body.details?.reason };
      if (body.code === 'ACTIVE_CHECK_ALREADY_EXISTS')
        return {
          unidadId,
          status: body.details?.concurrent ? 'CONFLICT' : 'SKIPPED',
          reason: body.code,
          checkId: body.details?.active?.id,
        };
      if (body.code === 'CHECK_CREATION_CONFLICT')
        return { unidadId, status: 'CONFLICT', reason: body.code };
      throw error;
    }
  }
}
type Schedule = {
  facilityId: string;
  localTime: string;
  actorSubject: string;
  actorName: string;
};
@Injectable()
export class DailyCheckScheduler
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private timer?: ReturnType<typeof setInterval>;
  constructor(
    private readonly config: ConfigService,
    private readonly daily: DailyChecksService,
  ) {}
  private schedules(): Schedule[] {
    const rows: unknown = JSON.parse(
      this.config.get<string>('CHECK_DAILY_SCHEDULES', '[]'),
    );
    if (!Array.isArray(rows) || !rows.length)
      throw new Error('DAILY_CONFIGURATION_REQUIRED');
    for (const row of rows) {
      if (
        !row ||
        ![row.facilityId, row.localTime, row.actorSubject, row.actorName].every(
          (x) => typeof x === 'string' && x.trim(),
        )
      )
        throw new Error('DAILY_CONFIGURATION_REQUIRED');
      scheduleDue(new Date(), row.localTime);
    }
    return rows;
  }
  async tick(now = new Date()) {
    if (this.config.get('CHECK_DAILY_ENABLED') !== 'true')
      return { status: 'DISABLED' as const };
    const results = [];
    for (const row of this.schedules()) {
      const day = scheduleDue(now, row.localTime);
      if (!day.due) continue;
      const actor: TrustedActor = {
        subject: row.actorSubject,
        displayName: row.actorName,
        roles: ['SYSTEM'],
        facilityScopes: [row.facilityId],
        authMode: 'TRUSTED',
        attributionLevel: 'SERVER_VERIFIED',
      };
      results.push(
        await this.daily.generate(
          row.facilityId,
          day.operationalDate,
          actor,
          `daily:${row.facilityId}:${day.operationalDate}`,
        ),
      );
    }
    return { status: 'CHECKED' as const, results };
  }
  onApplicationBootstrap() {
    if (this.config.get('CHECK_DAILY_ENABLED') !== 'true') return;
    this.schedules(); // Invalid enabled configuration fails startup; no guessed schedule.
    if (this.config.get('NODE_ENV') === 'test') return;
    this.timer = setInterval(() => {
      void this.tick().catch(() => undefined);
    }, 60000);
    this.timer.unref();
    void this.tick().catch(() => undefined);
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}
