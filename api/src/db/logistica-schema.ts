type Sql = { query(sql: string, parameters?: unknown[]): Promise<any[]> };
const columns: Record<string, string> = {
  unidades: 'active_logistica_journey_id:uuid logistica_journey_revision:int8',
  logistica_journeys:
    'id:uuid unidad_id:uuid capture_id:uuid origin:varchar revision:int8 departure_audit_id:uuid driver_id:uuid driver_provenance:varchar ambito:varchar destino:varchar context_provenance:varchar legacy_observed_context:jsonb history_gaps:jsonb return_command_id:uuid departed_effective_at:timestamptz departed_registered_at:timestamptz departure_actor_id:varchar departure_auth_mode:varchar departure_attribution_level:varchar departure_facility_id:varchar departure_mapping_version:int4 departure_facility_version:int4 returned_effective_at:timestamptz returned_registered_at:timestamptz return_actor_id:varchar return_auth_mode:varchar return_attribution_level:varchar return_facility_id:varchar return_mapping_version:int4 return_facility_version:int4 created_at:timestamptz',
  logistica_journey_capture:
    'id:uuid schema_version:int4 boundary_at:timestamptz baseline_commit:varchar legacy_open_count:int4 coverage_note:varchar',
  logistica_journey_commands:
    'actor_id:varchar command_id:uuid unidad_id:uuid kind:varchar request_hash:varchar expected_unit_revision:int8 expected_history_state:varchar expected_journey_ref:text expected_journey_revision:int8 result_journey_id:uuid result_unit_revision:int8 result_journey_revision:int8 response_status:int4 registered_at:timestamptz',
};
const journeyChecks = [
  'logistica_journey_revision_check',
  'logistica_journey_origin_check',
  'logistica_journey_endpoint_check',
  'logistica_journey_order_check',
  'logistica_journey_captured_check',
];
const indexes: Record<
  string,
  { table: string; unique: boolean; columns: string; predicate?: string }
> = {
  logistica_journey_open_unit_idx: {
    table: 'logistica_journeys',
    unique: true,
    columns: '(unidad_id)',
    predicate: 'returned_effective_at IS NULL',
  },
  logistica_journey_audit_idx: {
    table: 'logistica_journeys',
    unique: true,
    columns: '(departure_audit_id)',
    predicate: 'departure_audit_id IS NOT NULL',
  },
  logistica_journey_unit_start_idx: {
    table: 'logistica_journeys',
    unique: false,
    columns: '(unidad_id,departed_effective_at,id)',
  },
  logistica_journey_return_idx: {
    table: 'logistica_journeys',
    unique: false,
    columns: '(unidad_id,returned_effective_at)',
    predicate: 'returned_effective_at IS NOT NULL',
  },
  logistica_command_unit_idx: {
    table: 'logistica_journey_commands',
    unique: false,
    columns: '(unidad_id,registered_at)',
  },
};
export const LOGISTICA_TABLES = Object.keys(columns).filter(
  (name) => name !== 'unidades',
);

/** Read-only schema/capture verification, shared by readiness and the isolated runner. */
export async function verifyLogisticaSchema(q: Sql) {
  const found = await q.query(
    `SELECT table_name,column_name,udt_name FROM information_schema.columns
    WHERE table_schema='public' AND table_name=ANY($1)`,
    [Object.keys(columns)],
  );
  for (const [table, fields] of Object.entries(columns))
    for (const field of fields.split(' ')) {
      const [column, type] = field.split(':');
      if (
        !found.some(
          (row) =>
            row.table_name === table &&
            row.column_name === column &&
            row.udt_name === type,
        )
      )
        throw new Error(
          'LOGISTICA_SCHEMA_COLUMN_MISSING_OR_CHANGED: ' + table + '.' + column,
        );
    }
  const primaryKeys: Record<string, string[]> = {
    logistica_journeys: ['id'],
    logistica_journey_capture: ['id'],
    logistica_journey_commands: ['actor_id', 'command_id'],
  };
  const keys = await q.query(
    `SELECT t.relname AS table_name,c.conname,c.convalidated,i.indisvalid,i.indisready,
      ARRAY(SELECT a.attname::text FROM unnest(c.conkey) WITH ORDINALITY AS k(attnum,position)
        JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.attnum ORDER BY k.position) AS columns
      FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid
      JOIN pg_namespace n ON n.oid=t.relnamespace JOIN pg_index i ON i.indexrelid=c.conindid
      WHERE c.contype='p' AND n.nspname='public' AND t.relname=ANY($1)`,
    [Object.keys(primaryKeys)],
  );
  for (const [table, expected] of Object.entries(primaryKeys)) {
    const key = keys.find((k) => k.table_name === table);
    if (
      !key ||
      !key.convalidated ||
      !key.indisvalid ||
      !key.indisready ||
      JSON.stringify(key.columns) !== JSON.stringify(expected) ||
      (table === 'logistica_journey_commands' &&
        key.conname !== 'logistica_journey_commands_pkey')
    )
      throw new Error(
        'LOGISTICA_SCHEMA_PRIMARY_KEY_MISSING_OR_CHANGED: ' + table,
      );
  }
  const actual = await q.query(
    `SELECT idx.relname AS name,t.relname AS table_name,i.indisvalid,i.indisready,i.indisunique,
    pg_get_indexdef(i.indexrelid) AS definition,pg_get_expr(i.indpred,i.indrelid) AS predicate
    FROM pg_index i JOIN pg_class idx ON idx.oid=i.indexrelid JOIN pg_class t ON t.oid=i.indrelid
    JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='public' AND idx.relname=ANY($1)`,
    [Object.keys(indexes)],
  );
  const normalize = (value: string) =>
    value.replace(/[\s"()]/g, '').toLowerCase();
  for (const [name, expected] of Object.entries(indexes)) {
    const index = actual.find((row) => row.name === name);
    if (
      !index ||
      index.table_name !== expected.table ||
      !index.indisvalid ||
      !index.indisready ||
      index.indisunique !== expected.unique ||
      !normalize(index.definition).includes(
        normalize('USING btree' + expected.columns),
      ) ||
      normalize(index.predicate ?? '') !== normalize(expected.predicate ?? '')
    )
      throw new Error('LOGISTICA_SCHEMA_INDEX_MISSING_OR_CHANGED: ' + name);
  }
  const constraints = await q.query(
    `SELECT conname,contype,convalidated FROM pg_constraint
    WHERE conrelid='public.logistica_journeys'::regclass AND conname=ANY($1)`,
    [journeyChecks],
  );
  if (
    journeyChecks.some(
      (name) =>
        !constraints.some(
          (c) => c.conname === name && c.contype === 'c' && c.convalidated,
        ),
    )
  )
    throw new Error('LOGISTICA_SCHEMA_CONSTRAINT_MISSING');
  const fks =
    await q.query(`SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint
    WHERE conrelid='public.logistica_journeys'::regclass AND confrelid='public.logistica_departure_audits'::regclass AND convalidated`);
  if (
    !fks.some((f) =>
      normalize(f.definition.replace(/public\./g, '')).startsWith(
        normalize(
          'FOREIGN KEY (departure_audit_id) REFERENCES logistica_departure_audits(id)',
        ),
      ),
    )
  )
    throw new Error('LOGISTICA_AUDIT_REFERENCE_CONSTRAINT_MISSING');
  if (
    !(
      await q.query(
        'SELECT id FROM public.logistica_journey_capture WHERE schema_version=1',
      )
    ).length
  )
    throw new Error('LOGISTICA_CAPTURE_EPOCH_REQUIRED');
  if (
    (
      await q.query(`SELECT j.id FROM public.logistica_journeys j
    LEFT JOIN public.logistica_journey_capture c ON c.id=j.capture_id
    LEFT JOIN public.logistica_departure_audits a ON a.id=j.departure_audit_id
    WHERE c.id IS NULL OR (j.departure_audit_id IS NOT NULL AND (a.id IS NULL OR a.unidad_id<>j.unidad_id)) LIMIT 1`)
    ).length
  )
    throw new Error('LOGISTICA_HISTORY_REFERENCE_INCONSISTENT');
}
