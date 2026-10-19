import { MigrationInterface, QueryRunner } from 'typeorm';

const TABLES: Record<string, string> = {
  maintenance_external_services:
    "id uuid PRIMARY KEY,unit_ref uuid NOT NULL,facility_ref varchar NOT NULL,version int NOT NULL CHECK(version>0),performed_on date NOT NULL,provider_name varchar NOT NULL,maintenance_type varchar NOT NULL CHECK(maintenance_type IN ('PREVENTIVE','CORRECTIVE')),data jsonb NOT NULL,registered_at timestamptz NOT NULL,registered_by varchar NOT NULL",
  maintenance_service_revisions:
    'service_id uuid NOT NULL,version int NOT NULL,data jsonb NOT NULL,actor varchar NOT NULL,reason varchar NOT NULL,registered_at timestamptz NOT NULL,PRIMARY KEY(service_id,version)',
  maintenance_service_cost_lines:
    "id uuid PRIMARY KEY,service_id uuid NOT NULL,version int NOT NULL,system varchar,net_cents bigint,tax_cents bigint,gross_cents bigint,state varchar NOT NULL CHECK(state IN ('PENDING','RECORDED')),data jsonb NOT NULL,CHECK((state='PENDING' AND net_cents IS NULL AND tax_cents IS NULL AND gross_cents IS NULL) OR (state='RECORDED' AND net_cents IS NOT NULL AND tax_cents IS NOT NULL AND gross_cents IS NOT NULL AND net_cents>=0 AND tax_cents>=0 AND gross_cents=net_cents+tax_cents))",
  maintenance_service_work:
    'id uuid PRIMARY KEY,service_id uuid NOT NULL,system varchar NOT NULL,kind varchar NOT NULL,intervention_id uuid NOT NULL,conclusion_date date NOT NULL,data jsonb NOT NULL',
  maintenance_cost_claims:
    'id uuid PRIMARY KEY,service_id uuid NOT NULL,service_line_id uuid NOT NULL,unit_ref uuid NOT NULL,source_op_ref uuid NOT NULL,source_version int NOT NULL,qty_from int NOT NULL CHECK(qty_from>=0),qty_to int NOT NULL CHECK(qty_to>qty_from),UNIQUE(source_op_ref,qty_from,qty_to)',
  maintenance_schedule_scopes:
    'id uuid PRIMARY KEY,facility_ref varchar NOT NULL,scope varchar NOT NULL,scope_ref varchar NOT NULL,revision int NOT NULL CHECK(revision>=0),UNIQUE(facility_ref,scope,scope_ref)',
  maintenance_schedule_versions:
    'id uuid PRIMARY KEY,scope_id uuid NOT NULL,facility_ref varchar NOT NULL,scope varchar NOT NULL,scope_ref varchar NOT NULL,version int NOT NULL,valid_from timestamptz NOT NULL,valid_to timestamptz,data jsonb NOT NULL,actor varchar NOT NULL,reason varchar NOT NULL,CHECK(valid_to IS NULL OR valid_to>valid_from)',
  maintenance_command_receipts:
    'actor_subject varchar NOT NULL,command_id uuid NOT NULL,request_hash varchar NOT NULL,facility_refs jsonb NOT NULL,unit_refs jsonb NOT NULL,result jsonb NOT NULL,registered_at timestamptz NOT NULL,PRIMARY KEY(actor_subject,command_id)',
  maintenance_report_snapshots:
    'id uuid PRIMARY KEY,subject varchar NOT NULL,facility_refs jsonb NOT NULL,unit_mapping jsonb NOT NULL,query_hash varchar NOT NULL,result jsonb NOT NULL,created_at timestamptz NOT NULL,expires_at timestamptz NOT NULL',
  maintenance_cost_classifications:
    'id uuid PRIMARY KEY,source_op_ref uuid NOT NULL,source_version int NOT NULL,revision int NOT NULL,unit_ref uuid NOT NULL,data jsonb NOT NULL,actor varchar NOT NULL,reason varchar NOT NULL,created_at timestamptz NOT NULL,UNIQUE(source_op_ref,revision)',
  maintenance_work_catalog:
    'code varchar NOT NULL,version int NOT NULL,active boolean NOT NULL,actor varchar NOT NULL,reason varchar NOT NULL,PRIMARY KEY(code,version)',
  maintenance_document_groups:
    'id uuid PRIMARY KEY,version int NOT NULL,facility_refs jsonb NOT NULL,unit_refs jsonb NOT NULL,data jsonb NOT NULL',
  maintenance_document_allocations:
    'line_id uuid PRIMARY KEY,group_id uuid NOT NULL,line_version int NOT NULL',
  maintenance_document_group_revisions:
    'group_id uuid NOT NULL,version int NOT NULL,data jsonb NOT NULL,actor varchar NOT NULL,reason varchar NOT NULL,PRIMARY KEY(group_id,version)',
  maintenance_projection_invalidations:
    'id uuid PRIMARY KEY,unit_ref uuid,facility_ref varchar NOT NULL,source_ref varchar NOT NULL,version int NOT NULL,created_at timestamptz NOT NULL',
  maintenance_projection_captures:
    'id uuid PRIMARY KEY,source_vector jsonb NOT NULL,status varchar NOT NULL,completed_at timestamptz NOT NULL',
  maintenance_projection_facts:
    'owner varchar NOT NULL,source_ref varchar NOT NULL,source_version varchar NOT NULL,unit_ref uuid NOT NULL,facility_ref varchar NOT NULL,integrity_hash varchar NOT NULL,data jsonb NOT NULL,PRIMARY KEY(owner,source_ref,source_version)',
};
export class MaintenanceAnalysis1792281600000 implements MigrationInterface {
  name = 'MaintenanceAnalysis1792281600000';
  async up(q: QueryRunner) {
    for (const [table, columns] of Object.entries(TABLES))
      await q.query(`CREATE TABLE public.${table} (${columns})`);
    for (const [table, column, target, targetColumn] of [
      [
        'maintenance_service_revisions',
        'service_id',
        'maintenance_external_services',
        'id',
      ],
      [
        'maintenance_service_cost_lines',
        'service_id',
        'maintenance_external_services',
        'id',
      ],
      [
        'maintenance_service_work',
        'service_id',
        'maintenance_external_services',
        'id',
      ],
      [
        'maintenance_cost_claims',
        'service_id',
        'maintenance_external_services',
        'id',
      ],
      [
        'maintenance_cost_claims',
        'service_line_id',
        'maintenance_service_cost_lines',
        'id',
      ],
      [
        'maintenance_schedule_versions',
        'scope_id',
        'maintenance_schedule_scopes',
        'id',
      ],
      [
        'maintenance_document_allocations',
        'line_id',
        'maintenance_service_cost_lines',
        'id',
      ],
      [
        'maintenance_document_allocations',
        'group_id',
        'maintenance_document_groups',
        'id',
      ],
      [
        'maintenance_document_group_revisions',
        'group_id',
        'maintenance_document_groups',
        'id',
      ],
    ])
      await q.query(
        `ALTER TABLE public.${table} ADD CONSTRAINT ${table}_${column}_fk FOREIGN KEY (${column}) REFERENCES public.${target}(${targetColumn}) ON DELETE RESTRICT`,
      );
    for (const [table, cols] of Object.entries({
      maintenance_external_services: 'facility_ref,unit_ref,performed_on,id',
      maintenance_service_cost_lines: 'service_id',
      maintenance_service_work: 'system,kind,conclusion_date,intervention_id',
      maintenance_cost_claims: 'source_op_ref',
      maintenance_schedule_versions: 'scope_id,valid_from',
      maintenance_projection_invalidations: 'facility_ref,created_at',
      maintenance_report_snapshots: 'expires_at',
      maintenance_cost_classifications: 'source_op_ref,source_version',
    }))
      await q.query(
        `CREATE INDEX ${table}_lookup_idx ON public.${table} (${cols})`,
      );
  }
  async down(q: QueryRunner) {
    for (const table of Object.keys(TABLES)) {
      const rows = await q.query(
        `SELECT EXISTS(SELECT 1 FROM public.${table}) AS populated`,
      );
      if (rows[0]?.populated)
        throw new Error(
          'Refusing destructive rollback: maintenance analysis contains evidence. Disable flags and recover forward.',
        );
    }
    for (const table of Object.keys(TABLES).reverse())
      await q.query(`DROP TABLE public.${table}`);
  }
}
