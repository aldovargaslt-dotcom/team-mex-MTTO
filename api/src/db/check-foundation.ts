type SqlExecutor = {
  query(sql: string, parameters?: unknown[]): Promise<any[]>;
};

export async function auditLegacy(q: SqlExecutor) {
  const issues: unknown[] =
    await q.query(`SELECT id, 'invalid_visita' AS issue FROM public.visitas v
    WHERE tipo IS NULL OR tipo::text NOT IN ('PREDICTIVO','CORRECTIVO')
    OR estado IS NULL OR estado::text NOT IN ('BORRADOR','CERRADO')
    OR unidad_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.unidades u WHERE u.id=v.unidad_id)
    OR (chofer_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.choferes c WHERE c.id=v.chofer_id))
    OR (estado::text='CERRADO' AND cerrado_at IS NULL)`);
  issues.push(
    ...(await q.query(`SELECT unidad_id, array_agg(id) AS ids, 'duplicate_draft' AS issue FROM public.visitas
    WHERE estado::text='BORRADOR' GROUP BY unidad_id HAVING count(*)>1`)),
  );
  for (const table of [
    'visita_trabajos',
    'visita_fotos',
    'visita_firmas',
    'visita_piezas',
  ]) {
    issues.push(
      ...(await q.query(`SELECT id, '${table}_orphan' AS issue FROM public.${table} c
      WHERE visita_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.visitas v WHERE v.id=c.visita_id)`)),
    );
  }
  issues.push(
    ...(await q.query(`SELECT id, 'invalid_outbox_envelope' AS issue FROM public.outbox_events
    WHERE type='VisitaCerrada' AND (NOT (payload ?& ARRAY['eventId','eventType','occurredAt','visitaId','unidadId','tipoVehiculoId','km','cerradoAt','consumos'])
    OR payload->>'eventType' IS DISTINCT FROM 'VisitaCerrada' OR payload->>'eventId' IS DISTINCT FROM id::text
    OR payload->>'occurredAt' IS DISTINCT FROM payload->>'cerradoAt' OR jsonb_typeof(payload->'consumos') IS DISTINCT FROM 'array')`)),
  );
  if (issues.length)
    throw new Error(`LEGACY_AUDIT_FAILED: ${JSON.stringify(issues)}`);
}

export async function assertRollbackSafe(q: SqlExecutor) {
  const unsafe =
    await q.query(`SELECT id FROM public.visitas WHERE NOT migration_backfilled OR version<>1
    OR work_order_type IS DISTINCT FROM CASE tipo::text WHEN 'PREDICTIVO' THEN 'PREVENTIVE' WHEN 'CORRECTIVO' THEN 'CORRECTIVE' END
    OR work_order_status IS DISTINCT FROM CASE estado::text WHEN 'BORRADOR' THEN 'PENDING' WHEN 'CERRADO' THEN 'COMPLETED' END
    OR blocks_operation OR requires_reinspection OR assigned_user_id IS NOT NULL OR source_check_id IS NOT NULL
    OR assigned_at IS NOT NULL OR started_at IS NOT NULL OR cancelled_at IS NOT NULL OR finding_id IS NOT NULL
    OR block_reason IS NOT NULL OR block_actor IS NOT NULL OR created_actor_name IS NOT NULL
    OR attribution_level<>'LEGACY_HEADER' OR creation_key IS NOT NULL OR creation_hash IS NOT NULL
    OR completed_at IS DISTINCT FROM cerrado_at
    OR legacy_compat_draft IS DISTINCT FROM (estado::text='BORRADOR') LIMIT 1`);
  const config = await q.query('SELECT id FROM public.facilities LIMIT 1');
  if (unsafe.length || config.length)
    throw new Error(
      'FORWARD_RECOVERY_REQUIRED: canonical data/configuration exists; disable new writes and recover forward.',
    );
}

export const FOUNDATION_CONSTRAINTS: Record<string, string> = {
  visitas_canonical_values_ck:
    "work_order_type IN ('CHECK','PREVENTIVE','CORRECTIVE') AND work_order_status IN ('PENDING','ASSIGNED','IN_PROGRESS','COMPLETED','CANCELLED') AND version>=1",
  visitas_legacy_mirror_ck: `(work_order_type='CHECK' AND estado IS NULL AND tipo IS NULL AND NOT legacy_compat_draft)
    OR (work_order_type IN ('PREVENTIVE','CORRECTIVE') AND
      ((work_order_status IN ('PENDING','ASSIGNED','IN_PROGRESS') AND estado IS NOT NULL AND estado::text='BORRADOR')
      OR (work_order_status='COMPLETED' AND estado IS NOT NULL AND estado::text='CERRADO')
      OR (work_order_status='CANCELLED' AND estado IS NULL))
      AND (tipo IS NULL OR (tipo::text='PREDICTIVO' AND work_order_type='PREVENTIVE') OR (tipo::text='CORRECTIVO' AND work_order_type='CORRECTIVE')))`,
  visitas_legacy_slot_ck:
    "NOT legacy_compat_draft OR (work_order_type IN ('PREVENTIVE','CORRECTIVE') AND work_order_status IN ('PENDING','ASSIGNED','IN_PROGRESS'))",
};

export async function installFoundationConstraints(q: SqlExecutor) {
  for (const [name, expression] of Object.entries(FOUNDATION_CONSTRAINTS)) {
    const exists = await q.query(
      "SELECT 1 FROM pg_constraint WHERE conrelid='public.visitas'::regclass AND conname=$1",
      [name],
    );
    if (!exists.length)
      await q.query(
        `ALTER TABLE public.visitas ADD CONSTRAINT ${name} CHECK (${expression}) NOT VALID`,
      );
  }
  await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS check_un_activo_por_unidad_uidx ON public.visitas(unidad_id)
    WHERE work_order_type='CHECK' AND work_order_status IN ('PENDING','ASSIGNED','IN_PROGRESS')`);
  await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS visitas_legacy_draft_slot_uidx ON public.visitas(unidad_id)
    WHERE legacy_compat_draft=true AND work_order_type IN ('PREVENTIVE','CORRECTIVE') AND work_order_status IN ('PENDING','ASSIGNED','IN_PROGRESS')`);
  await q.query(`CREATE UNIQUE INDEX IF NOT EXISTS visitas_maintenance_request_uidx ON public.visitas(created_by,creation_key)
    WHERE creation_key IS NOT NULL AND work_order_type IN ('PREVENTIVE','CORRECTIVE')`);
  await q.query(`CREATE OR REPLACE FUNCTION public.enforce_check_subtype() RETURNS trigger LANGUAGE plpgsql AS $$
    DECLARE target uuid; kind text; n integer;
    BEGIN
      IF TG_TABLE_NAME='visitas' THEN target:=COALESCE(NEW.id,OLD.id);
      ELSE target:=COALESCE(NEW.visita_id,OLD.visita_id); END IF;
      SELECT work_order_type INTO kind FROM public.visitas WHERE id=target;
      IF FOUND THEN
        SELECT count(*) INTO n FROM public.check_inspections WHERE visita_id=target;
        IF (kind='CHECK' AND n<>1) OR (kind<>'CHECK' AND n<>0) THEN
          RAISE EXCEPTION 'CHECK_SUBTYPE_REQUIRED: %',target USING ERRCODE='23514';
        END IF;
      END IF;
      IF TG_TABLE_NAME='check_inspections' AND TG_OP='UPDATE' THEN
        IF OLD.visita_id<>NEW.visita_id THEN
        IF EXISTS(SELECT 1 FROM public.visitas WHERE id=OLD.visita_id AND work_order_type='CHECK')
          AND NOT EXISTS(SELECT 1 FROM public.check_inspections WHERE visita_id=OLD.visita_id) THEN
          RAISE EXCEPTION 'CHECK_SUBTYPE_REQUIRED: %',OLD.visita_id USING ERRCODE='23514';
        END IF;
      END IF;
      END IF;
      RETURN NULL;
    END $$`);
  for (const [table, name] of [
    ['visitas', 'visitas_check_subtype_ct'],
    ['check_inspections', 'inspection_check_subtype_ct'],
  ]) {
    const exists = await q.query(
      'SELECT 1 FROM pg_trigger WHERE tgname=$1 AND tgrelid=$2::regclass',
      [name, `public.${table}`],
    );
    if (!exists.length)
      await q.query(`CREATE CONSTRAINT TRIGGER ${name} AFTER INSERT OR UPDATE OR DELETE ON public.${table}
      DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.enforce_check_subtype()`);
  }
}

export async function verifyFoundation(q: SqlExecutor) {
  const rows =
    await q.query(`SELECT c.relname AS name, i.indisunique, i.indisvalid, pg_get_expr(i.indpred,i.indrelid) AS predicate,
    i.indnkeyatts, pg_get_indexdef(i.indexrelid,1,true) AS key FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid
    WHERE i.indrelid='public.visitas'::regclass AND c.relname IN ('check_un_activo_por_unidad_uidx','visitas_legacy_draft_slot_uidx')`);
  const normalize = (expression: string) =>
    expression
      .replace(/::(?:character varying|text)(?:\[\])?/g, '')
      .replace(/[()\s]/g, '');
  const statuses =
    "work_order_status=ANYARRAY['PENDING','ASSIGNED','IN_PROGRESS']";
  const expected: Record<string, string> = {
    check_un_activo_por_unidad_uidx: `work_order_type='CHECK'AND${statuses}`,
    visitas_legacy_draft_slot_uidx: `legacy_compat_draft=trueANDwork_order_type=ANYARRAY['PREVENTIVE','CORRECTIVE']AND${statuses}`,
  };
  for (const name of [
    'check_un_activo_por_unidad_uidx',
    'visitas_legacy_draft_slot_uidx',
  ]) {
    const row = rows.find((r: { name: string }) => r.name === name);
    if (
      !row?.indisunique ||
      !row.indisvalid ||
      row.indnkeyatts !== 1 ||
      row.key !== 'unidad_id' ||
      typeof row.predicate !== 'string' ||
      normalize(row.predicate) !== expected[name]
    )
      throw new Error(`FOUNDATION_INDEX_INVALID: ${name}`);
  }
  const triggers = await q.query(`SELECT tgname FROM pg_trigger WHERE
    ((tgname='visitas_check_subtype_ct' AND tgrelid='public.visitas'::regclass) OR
     (tgname='inspection_check_subtype_ct' AND tgrelid='public.check_inspections'::regclass))
    AND tgdeferrable AND tginitdeferred AND tgenabled<>'D'`);
  if (triggers.length !== 2)
    throw new Error('FOUNDATION_SUBTYPE_CONSTRAINT_MISSING');
}
