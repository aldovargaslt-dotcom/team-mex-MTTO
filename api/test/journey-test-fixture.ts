import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { LogisticaJourneyCapture } from '../src/logistica/journey-capture.entity';
import { LogisticaJourney } from '../src/logistica/journey.entity';
import { Unidad } from '../src/unidades/unidad.entity';
export async function initializeJourneyFixture(db: DataSource) {
  if (
    process.env.EWO_DISPOSABLE_DB !== 'true' ||
    process.env.NODE_ENV !== 'test'
  )
    throw new Error('Disposable test fixture only');
  if (await db.getRepository(LogisticaJourneyCapture).count()) return;
  const capture = await db.getRepository(LogisticaJourneyCapture).save({
    id: randomUUID(),
    schemaVersion: 1,
    boundaryAt: new Date(),
    baselineCommit: '0d7d0b274961bab273d3d57d750c06664af5eed3',
    legacyOpenCount: 0,
    coverageNote: 'Disposable ORM fixture; migration verified separately',
  });
  for (const unit of await db
    .getRepository(Unidad)
    .find({ where: { opsEstado: 'EN_RUTA' as never } })) {
    const journey = await db.getRepository(LogisticaJourney).save({
      id: randomUUID(),
      unidadId: unit.id,
      captureId: capture.id,
      origin: 'LEGACY_OPEN',
      revision: '1',
      driverProvenance: 'UNKNOWN',
      contextProvenance: 'LEGACY_OBSERVED',
      historyGaps: [
        'UNKNOWN_DEPARTURE',
        'UNKNOWN_DRIVER',
        'UNKNOWN_AUTHORIZATION',
      ],
      legacyObservedContext: {
        salidaAt: unit.salidaAt?.toISOString() ?? null,
        ambito: unit.ambito,
        destino: unit.destino,
      },
    });
    await db
      .getRepository(Unidad)
      .update(unit.id, { activeLogisticaJourneyId: journey.id });
  }
}
export async function commandHeaders(
  db: DataSource,
  id: string,
  subject: string,
) {
  const unit = await db.getRepository(Unidad).findOneByOrFail({ id });
  const journey = unit.activeLogisticaJourneyId
    ? await db
        .getRepository(LogisticaJourney)
        .findOneBy({ id: unit.activeLogisticaJourneyId })
    : null;
  const historyState =
    unit.opsEstado === 'DISPONIBLE'
      ? 'AVAILABLE'
      : journey
        ? 'KNOWN_OPEN'
        : unit.activeLogisticaJourneyId
          ? 'MISSING_ROW'
          : 'MISSING_POINTER';
  return {
    'Idempotency-Key': randomUUID(),
    'X-Logistica-Expected-Subject': subject,
    'X-Logistica-Unit-Revision': String(unit.logisticaJourneyRevision),
    'X-Logistica-History-State': historyState,
    ...(unit.opsEstado === 'EN_RUTA'
      ? {
          'X-Logistica-Journey-Ref':
            unit.activeLogisticaJourneyId ??
            `legacy:${id}:${unit.logisticaJourneyRevision}`,
          ...(journey
            ? { 'X-Logistica-Journey-Revision': String(journey.revision) }
            : {}),
        }
      : {}),
  };
}
