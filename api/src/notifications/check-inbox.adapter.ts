import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { TrustedActor, validateActor } from '../auth/trusted-actor';
import { Rol } from '../auth/roles.enum';
import {
  CheckCreatedEvent,
  CheckDeliveryPort,
} from '../visitas/checks/check-delivery.port';
import { CheckInboxItem, CheckInboxRead } from './entities/check-inbox.entity';
@Injectable()
export class CheckInboxAdapter extends CheckDeliveryPort {
  constructor(private readonly db: DataSource) {
    super();
  }
  async deliver(event: CheckCreatedEvent, manager: EntityManager) {
    // Owner-local write with the caller's transaction; no cross-schema join/FK or remote I/O.
    await manager
      .createQueryBuilder()
      .insert()
      .into(CheckInboxItem)
      .values({
        eventId: event.eventId,
        checkId: event.checkId,
        unidadId: event.unidadId,
        facilityId: event.facilityId,
        numeroInterno: event.numeroInterno,
        createdAt: new Date(event.occurredAt),
      })
      .orIgnore()
      .execute();
  }
  private scoped(actor: TrustedActor) {
    validateActor(actor, process.env.NODE_ENV);
    const qb = this.db
      .getRepository(CheckInboxItem)
      .createQueryBuilder('i')
      .where('i.facility_id IN (:...facilities)', {
        facilities: actor.facilityScopes,
      });
    // CHECK_CREATED has no assigned mechanic: only the authorized operational/audit audience.
    if (
      !actor.roles.some((r) => r === Rol.LOGISTICA || r === Rol.ADMIN_DIRECTIVO)
    )
      qb.andWhere('false');
    return qb;
  }
  async list(actor: TrustedActor, all = false) {
    const qb = this.scoped(actor).leftJoin(
      CheckInboxRead,
      'r',
      'r.event_id=i.event_id AND r.user_id=:subject',
      { subject: actor.subject },
    );
    const unread = await qb.clone().andWhere('r.event_id IS NULL').getCount();
    if (!all) qb.andWhere('r.event_id IS NULL');
    const rows = await qb
      .select([
        'i.event_id AS id',
        'i.check_id AS "checkId"',
        'i.numero_interno AS "numeroInterno"',
        'i.unidad_id AS "unidadId"',
        'i.created_at AS "createdAt"',
        'r.read_at AS "readAt"',
      ])
      .orderBy('i.created_at', 'DESC')
      .addOrderBy('i.event_id', 'DESC')
      .limit(100)
      .getRawMany();
    return {
      items: rows.map((r) => ({
        ...r,
        sourceModule: 'CHECK',
        sourceEvent: 'CHECK_CREATED',
        sourceRef: r.checkId,
        subjectType: 'UNIDAD',
        subjectRef: r.unidadId,
        severity: 'INFO',
        body: 'Consulta el chequeo operativo de la unidad.',
        dedupeKey: `CHECK:${r.id}`,
        expiresAt: null,
        title: `Chequeo solicitado · ${r.numeroInterno}`,
        deeplinkPath: `/checks/${r.checkId}`,
      })),
      unread,
    };
  }
  async markAllRead(actor: TrustedActor) {
    const items = await this.scoped(actor).getMany();
    if (!items.length) return { marked: 0 };
    const result = await this.db
      .createQueryBuilder()
      .insert()
      .into(CheckInboxRead)
      .values(
        items.map((item) => ({
          eventId: item.eventId,
          userId: actor.subject,
          readAt: new Date(),
        })),
      )
      .orIgnore()
      .returning('event_id')
      .execute();
    return { marked: result.raw.length };
  }
  async markRead(id: string, actor: TrustedActor) {
    const item = await this.scoped(actor)
      .andWhere('i.event_id=:id', { id })
      .getOne();
    if (!item) throw new NotFoundException('No se encontró la notificación.');
    await this.db
      .createQueryBuilder()
      .insert()
      .into(CheckInboxRead)
      .values({ eventId: id, userId: actor.subject, readAt: new Date() })
      .orIgnore()
      .execute();
    return { id };
  }
}
