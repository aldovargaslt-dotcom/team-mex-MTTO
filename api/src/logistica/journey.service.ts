import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { DataSource, EntityManager, IsNull } from 'typeorm';
import { Rol } from '../auth/roles.enum';
import { TrustedActor } from '../auth/trusted-actor';
import { Chofer } from '../choferes/chofer.entity';
import { UnitOperationCoordinator } from '../kernel/unit-operation.module';
import { AmbitoUnidad } from '../unidades/ambito-unidad.enum';
import { OpsEstadoUnidad } from '../unidades/ops-estado-unidad.enum';
import { Unidad } from '../unidades/unidad.entity';
import { FacilityResourceReadPort } from '../visitas/checks/facility-resource-read.port';
import { LogisticaDepartureAudit } from './departure-audit.entity';
import { DeparturePolicyPort } from './departure-policy.port';
import { JourneyCommand, HistoryState } from './journey-command';
import { LogisticaJourneyCapture } from './journey-capture.entity';
import { LogisticaJourneyReceipt } from './journey-receipt.entity';
import { LogisticaJourney } from './journey.entity';
import { errorAssign, errorRegreso, errorSalida } from './logistica-rules';
import { RegistrarSalidaInput } from './logistica-types';

export type JourneyContext = {
  unidadId: string;
  opsEstado: string;
  unitJourneyRevision: string;
  historyState: HistoryState;
  journeyRef: string | null;
  journeyRevision: string | null;
  ambito: string;
  destino: string | null;
  salidaAt: string | null;
};
@Injectable()
export class LogisticaJourneyService {
  constructor(
    private readonly db: DataSource,
    private readonly units: UnitOperationCoordinator,
    private readonly facilities: FacilityResourceReadPort,
    private readonly policy: DeparturePolicyPort,
  ) {}

  private conflict(context?: JourneyContext): never {
    throw new ConflictException({
      code: 'LOGISTICA_JOURNEY_CONFLICT',
      message: 'El viaje cambió. Revisa la situación actual.',
      details: { ...(context ?? {}), refreshRequired: true },
    });
  }

  private async unit(manager: EntityManager, unidadId: string) {
    await this.units.lock(manager, unidadId);
    const unit = await manager
      .getRepository(Unidad)
      .createQueryBuilder('unit')
      .where('unit.id=:unidadId', { unidadId })
      .setLock('pessimistic_write')
      .getOne();
    if (!unit) throw new NotFoundException('No se encontró la unidad.');
    return unit;
  }

  private async scope(
    manager: EntityManager,
    unit: Unidad,
    actor: TrustedActor,
  ) {
    if (
      !actor.roles.some((r) => r === Rol.LOGISTICA || r === Rol.ADMIN_DIRECTIVO)
    )
      throw new ForbiddenException({
        code: 'LOGISTICA_ROLE_FORBIDDEN',
        message: 'Sin permiso para registrar viajes.',
        details: {},
      });
    const mapping = await this.facilities.resolve(unit.id, manager);
    if (!actor.facilityScopes.includes(mapping.facilityId))
      throw new ForbiddenException({
        code: 'FACILITY_SCOPE_FORBIDDEN',
        message: 'La unidad está fuera del facility autorizado.',
        details: {},
      });
    return mapping;
  }

  private async capture(manager: EntityManager) {
    const capture = await manager.findOne(LogisticaJourneyCapture, {
      where: { schemaVersion: 1 },
      order: { boundaryAt: 'DESC' },
    });
    if (!capture)
      throw new ServiceUnavailableException({
        code: 'LOGISTICA_CAPTURE_NOT_READY',
        message: 'La captura de viajes requiere preparación del esquema.',
        details: {},
      });
    return capture;
  }

  async describe(
    manager: EntityManager,
    unit: Unidad,
  ): Promise<JourneyContext> {
    const open = await manager.findOneBy(LogisticaJourney, {
      unidadId: unit.id,
      returnedEffectiveAt: IsNull(),
    });
    const pointer = unit.activeLogisticaJourneyId;
    const journey = pointer
      ? open?.id === pointer
        ? open
        : await manager.findOneBy(LogisticaJourney, { id: pointer })
      : null;
    const base = {
      unidadId: unit.id,
      opsEstado: unit.opsEstado,
      unitJourneyRevision: String(unit.logisticaJourneyRevision),
      ambito: unit.ambito,
      destino: unit.destino,
      salidaAt: unit.salidaAt?.toISOString() ?? null,
    };
    if (unit.opsEstado === OpsEstadoUnidad.DISPONIBLE) {
      if (pointer || open) this.conflict();
      return {
        ...base,
        historyState: 'AVAILABLE',
        journeyRef: null,
        journeyRevision: null,
      };
    }
    if (
      (open && open.id !== pointer) ||
      (journey && (journey.unidadId !== unit.id || journey.returnedEffectiveAt))
    )
      this.conflict();
    if (journey)
      return {
        ...base,
        historyState: 'KNOWN_OPEN',
        journeyRef: journey.id,
        journeyRevision: String(journey.revision),
      };
    return {
      ...base,
      historyState: pointer ? 'MISSING_ROW' : 'MISSING_POINTER',
      journeyRef:
        pointer ?? `legacy:${unit.id}:${unit.logisticaJourneyRevision}`,
      journeyRevision: null,
    };
  }

  async context(unidadId: string, actor: TrustedActor) {
    return this.db.transaction(async (manager) => {
      const unit = await this.unit(manager, unidadId);
      await this.scope(manager, unit, actor);
      const activeCapture = await this.capture(manager);
      const context = await this.describe(manager, unit);
      const journey = unit.activeLogisticaJourneyId
        ? await manager.findOneBy(LogisticaJourney, {
            id: unit.activeLogisticaJourneyId,
          })
        : null;
      const capture = journey
        ? await manager.findOneBy(LogisticaJourneyCapture, {
            id: journey.captureId,
          })
        : activeCapture;
      if (!capture)
        throw new ServiceUnavailableException({
          code: 'LOGISTICA_CAPTURE_NOT_READY',
          message: 'No se pudo verificar la época de captura.',
          details: {},
        });
      return {
        ...context,
        historyCoverage: {
          captureId: capture.id,
          boundaryAt: capture.boundaryAt.toISOString(),
          activeCaptureId: activeCapture.id,
          activeBoundaryAt: activeCapture.boundaryAt.toISOString(),
          preBoundaryHistory: 'UNASSESSED',
          origin: journey?.origin ?? null,
          gaps:
            journey?.historyGaps ??
            (context.historyState.startsWith('MISSING')
              ? ['MISSING_HISTORY']
              : []),
        },
      };
    });
  }

  async listSnapshot() {
    return this.db.transaction('REPEATABLE READ', async (manager) => {
      const units = await manager.find(Unidad, {
        relations: { tipo: true },
        order: { placas: 'ASC' },
      });
      const contexts = new Map<string, JourneyContext>();
      for (const unit of units)
        contexts.set(unit.id, await this.describe(manager, unit));
      return { units, contexts };
    });
  }

  async execute(
    kind: 'DEPARTURE' | 'RETURN',
    unidadId: string,
    input: RegistrarSalidaInput | null,
    actor: TrustedActor,
    command: JourneyCommand,
  ): Promise<boolean> {
    if (command.expectedSubject !== actor.subject)
      throw new ConflictException({
        code: 'LOGISTICA_COMMAND_SUBJECT_CHANGED',
        message: 'La sesión cambió. Revisa la operación pendiente.',
        details: {},
      });
    // Presence of destino is meaningful: omitted preserves existing destination.
    const body = input
      ? {
          ambito: input.ambito,
          ...(input.destino !== undefined
            ? { destino: input.destino.trim() }
            : {}),
          ...(input.choferId !== undefined ? { choferId: input.choferId } : {}),
        }
      : null;
    const hash = createHash('sha256')
      .update(JSON.stringify({ kind, unidadId, body, command }))
      .digest('hex');
    const receiptKey = { actorId: actor.subject, commandId: command.commandId };
    const match = (receipt: LogisticaJourneyReceipt) => {
      if (receipt.requestHash !== hash)
        throw new ConflictException({
          code: 'LOGISTICA_COMMAND_REUSED',
          message: 'La clave ya corresponde a otra operación.',
          details: { refreshRequired: true },
        });
    };
    const run = async () =>
      this.db.transaction(async (manager) => {
        const unit = await this.unit(manager, unidadId);
        const mapping = await this.scope(manager, unit, actor);
        const receipt = await manager.findOneBy(
          LogisticaJourneyReceipt,
          receiptKey,
        );
        if (receipt) {
          match(receipt);
          return false;
        }
        const capture = await this.capture(manager);
        const context = await this.describe(manager, unit);
        if (
          command.unitRevision !== context.unitJourneyRevision ||
          command.historyState !== context.historyState ||
          command.journeyRef !== context.journeyRef ||
          command.journeyRevision !== context.journeyRevision
        )
          this.conflict(context);
        let journey: LogisticaJourney;
        if (kind === 'DEPARTURE') {
          const error = errorSalida(input?.ambito);
          if (error) throw new BadRequestException(error);
          const authorization = await this.policy.authorize(
            unidadId,
            actor,
            manager,
          );
          if (context.historyState !== 'AVAILABLE') this.conflict(context);
          if (input!.choferId) {
            const chofer = await manager.findOneBy(Chofer, {
              id: input!.choferId,
            });
            if (!chofer)
              throw new NotFoundException('No se encontró el chofer.');
            const occupied = await manager.findOneBy(Unidad, {
              choferId: input!.choferId,
            });
            const error = errorAssign({
              choferEstado: chofer.estado,
              unidadExiste: true,
              unidadChoferId: unit.choferId,
              choferUnidadId: occupied?.id ?? null,
              choferId: input!.choferId,
            });
            if (error) throw new BadRequestException(error);
            unit.choferId = input!.choferId;
          }
          const [{ instant }] = await manager.query(
            'SELECT clock_timestamp() AS instant',
          );
          const at = new Date(instant);
          unit.opsEstado = OpsEstadoUnidad.EN_RUTA;
          unit.ambito =
            input!.ambito === 'FORANEO'
              ? AmbitoUnidad.FORANEO
              : AmbitoUnidad.LOCAL;
          if (input!.destino !== undefined)
            unit.destino = input!.destino.trim() || null;
          unit.salidaAt = at;
          const audit = await manager.save(
            manager.create(LogisticaDepartureAudit, {
              id: randomUUID(),
              unidadId,
              actorId: actor.subject,
              sourceCheckId: authorization.signedCheckRef.checkId,
              snapshotHash: authorization.signedCheckRef.snapshotHash,
              checkVersion: authorization.signedCheckRef.version,
              validationRefs: authorization,
              evaluatedAt: new Date(authorization.evaluatedAt),
              operationalDate: authorization.operationalDate,
            }),
          );
          const [{ registered }] = await manager.query(
            'SELECT clock_timestamp() AS registered',
          );
          journey = manager.create(LogisticaJourney, {
            id: randomUUID(),
            unidadId,
            captureId: capture.id,
            origin: 'CAPTURED',
            revision: '1',
            departedEffectiveAt: at,
            departedRegisteredAt: new Date(registered),
            departureActorId: actor.subject,
            departureAuthMode: actor.authMode,
            departureAttributionLevel: actor.attributionLevel,
            departureFacilityId: mapping.facilityId,
            departureMappingVersion: mapping.version,
            departureFacilityVersion: mapping.facility.version,
            departureAuditId: audit.id,
            driverId: unit.choferId,
            driverProvenance: input!.choferId
              ? 'EXPLICIT_DEPARTURE'
              : unit.choferId
                ? 'STANDING_ASSIGNMENT_SNAPSHOT'
                : 'UNKNOWN',
            ambito: unit.ambito,
            destino: unit.destino,
            contextProvenance: 'DEPARTURE_SNAPSHOT',
            historyGaps: [],
          });
          unit.activeLogisticaJourneyId = journey.id;
        } else {
          const error = errorRegreso(unit.opsEstado);
          if (error) throw new BadRequestException(error);
          if (context.historyState === 'KNOWN_OPEN') {
            journey = await manager.findOneOrFail(LogisticaJourney, {
              where: { id: context.journeyRef! },
              lock: { mode: 'pessimistic_write' },
            });
          } else {
            journey = manager.create(LogisticaJourney, {
              id:
                context.historyState === 'MISSING_ROW'
                  ? context.journeyRef!
                  : randomUUID(),
              unidadId,
              captureId: capture.id,
              origin: 'LEGACY_RECOVERED',
              revision: '1',
              driverProvenance: 'UNKNOWN',
              contextProvenance: 'LEGACY_OBSERVED',
              historyGaps: [
                'MISSING_HISTORY',
                'UNKNOWN_DEPARTURE',
                'UNKNOWN_DRIVER',
                'UNKNOWN_AUTHORIZATION',
              ],
              legacyObservedContext: {
                salidaAt: context.salidaAt,
                ambito: unit.ambito,
                destino: unit.destino,
              },
            });
          }
          const [{ instant }] = await manager.query(
            'SELECT clock_timestamp() AS instant',
          );
          journey.returnedEffectiveAt = new Date(instant);
          // Registered time is sampled separately, after the effective instant.
          const [{ registered }] = await manager.query(
            'SELECT clock_timestamp() AS registered',
          );
          journey.returnedRegisteredAt = new Date(registered);
          journey.returnActorId = actor.subject;
          journey.returnAuthMode = actor.authMode;
          journey.returnAttributionLevel = actor.attributionLevel;
          journey.returnFacilityId = mapping.facilityId;
          journey.returnMappingVersion = mapping.version;
          journey.returnFacilityVersion = mapping.facility.version;
          journey.returnCommandId = command.commandId;
          journey.revision = '2';
          unit.opsEstado = OpsEstadoUnidad.DISPONIBLE;
          unit.salidaAt = null;
          unit.activeLogisticaJourneyId = null;
        }
        unit.logisticaJourneyRevision = (
          BigInt(unit.logisticaJourneyRevision) + 1n
        ).toString();
        await manager.save(journey);
        await manager.save(unit);
        await manager.insert(LogisticaJourneyReceipt, {
          ...receiptKey,
          unidadId,
          kind,
          requestHash: hash,
          expectedUnitRevision: command.unitRevision,
          expectedHistoryState: command.historyState,
          expectedJourneyRef: command.journeyRef,
          expectedJourneyRevision: command.journeyRevision,
          resultJourneyId: journey.id,
          resultUnitRevision: unit.logisticaJourneyRevision,
          resultJourneyRevision: journey.revision,
          responseStatus: 204,
        });
        return true;
      });
    try {
      return await run();
    } catch (error) {
      // A shared key used on different units can race outside the unit lock.
      const pg = error as { code?: string; constraint?: string };
      if (
        pg.code !== '23505' ||
        pg.constraint !== 'logistica_journey_commands_pkey'
      )
        throw error;
      await this.db.transaction(async (manager) => {
        const unit = await this.unit(manager, unidadId);
        await this.scope(manager, unit, actor);
        const winner = await manager.findOneByOrFail(
          LogisticaJourneyReceipt,
          receiptKey,
        );
        match(winner);
      });
      return false;
    }
  }
}
