import { randomUUID } from 'crypto';
import { DataSource } from 'typeorm';
import { Rol } from '../src/auth/roles.enum';
import { TrustedActor } from '../src/auth/trusted-actor';
import { operationalDay } from '../src/visitas/checks/facility-calendar';

export function trustedTestActor(
  subject: string,
  role: Rol,
  facilityId: string,
): TrustedActor {
  return {
    subject,
    displayName: `Fixture ${subject}`,
    roles: [role],
    facilityScopes: [facilityId],
    authMode: 'TRUSTED',
    attributionLevel: 'SERVER_VERIFIED',
  };
}

export async function prepareDepartureFixture(
  db: DataSource,
  unidadId: string,
  facilityId: string,
  actorId: string,
) {
  const day = operationalDay(new Date());
  await db.query(
    `UPDATE unidades
     SET estado='ACTIVA', motivo_inactivacion=NULL, ops_estado='DISPONIBLE',
         salida_at=NULL
     WHERE id=$1`,
    [unidadId],
  );
  await db.query(
    `INSERT INTO facilities(id,name,timezone,version)
     VALUES ($1,$2,'America/Mexico_City',1)
     ON CONFLICT (id) DO NOTHING`,
    [facilityId, `Fixture ${facilityId}`],
  );
  await db.query(
    `INSERT INTO vehicle_facilities(unidad_id,facility_id,version)
     VALUES ($1,$2,1)
     ON CONFLICT (unidad_id) DO UPDATE SET facility_id=EXCLUDED.facility_id`,
    [unidadId, facilityId],
  );
  await db.query(
    `INSERT INTO flota.physical_state_events
      (id,unidad_id,state,source,version,reason,actor_id,observed_at)
     VALUES ($1,$2,'EN_PATIO','FLOTA_TRANSITION',
       COALESCE((SELECT max(version)+1 FROM flota.physical_state_events WHERE unidad_id=$2),1),
       'Fixture lista en patio',$3,now())`,
    [randomUUID(), unidadId, actorId],
  );
  await db.query(
    `UPDATE vehicle_documents.document_versions SET "current"=false
     WHERE unidad_id=$1 AND document_type='POLIZA_SEGURO' AND "current"=true`,
    [unidadId],
  );
  await db.query(
    `INSERT INTO vehicle_documents.document_versions
      (id,unidad_id,document_type,expiration_date,version,"current",created_by)
     VALUES ($1,$2,'POLIZA_SEGURO',$3,
       COALESCE((SELECT max(version)+1 FROM vehicle_documents.document_versions WHERE unidad_id=$2),1),
       true,$4)`,
    [randomUUID(), unidadId, shiftDate(day.operationalDate, 1), actorId],
  );
  const checkId = randomUUID();
  await db.transaction(async (manager) => {
    await manager.query(
      `INSERT INTO visitas
        (id,unidad_id,estado,tipo,work_order_type,work_order_status,version,
         legacy_compat_draft,migration_backfilled,blocks_operation,
         requires_reinspection,attribution_level,created_by,completed_at)
       VALUES ($1,$2,NULL,NULL,'CHECK','COMPLETED',2,false,false,false,false,
         'SERVER_VERIFIED',$3,now())`,
      [checkId, unidadId, actorId],
    );
    await manager.query(
      `INSERT INTO check_inspections
        (visita_id,source,facility_id,operational_date,timezone,calendar_version,
         mapping_version,day_end_instant,result,snapshot_hash)
       VALUES ($1,'CHECK_OUT',$2,$3,'America/Mexico_City',1,1,$4,'FIT',$5)`,
      [
        checkId,
        facilityId,
        day.operationalDate,
        day.dayEndInstant,
        'b'.repeat(64),
      ],
    );
  });
}

function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
