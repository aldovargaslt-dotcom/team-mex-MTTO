import { assertRollbackSafe } from '../check-foundation';
import { MigrationInterface, QueryRunner } from 'typeorm';
export class CheckGenerationDelivery1790985600007 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`CREATE TABLE public.check_daily_generation(
    unidad_id uuid NOT NULL, operational_date date NOT NULL, facility_id varchar NOT NULL,
    check_id uuid NOT NULL REFERENCES public.visitas(id) ON DELETE RESTRICT, command_id varchar NOT NULL, created_at timestamptz NOT NULL,
    CONSTRAINT check_daily_generation_pkey PRIMARY KEY(unidad_id,operational_date));
   CREATE TABLE public.check_audit(event_id uuid PRIMARY KEY,event_type varchar NOT NULL,check_id uuid NOT NULL REFERENCES public.visitas(id) ON DELETE RESTRICT,
    unidad_id uuid NOT NULL,facility_id varchar NOT NULL,actor_subject varchar NOT NULL,actor_name varchar NOT NULL,attribution_level varchar NOT NULL,source varchar NOT NULL,occurred_at timestamptz NOT NULL);
   CREATE INDEX check_pending_delivery_idx ON public.outbox_events(created_at,id) WHERE type='CHECK_CREATED' AND processed_at IS NULL;
   CREATE SCHEMA IF NOT EXISTS notifications;
   CREATE TABLE notifications.check_inbox(event_id uuid PRIMARY KEY,check_id uuid NOT NULL,unidad_id uuid NOT NULL,facility_id varchar NOT NULL,numero_interno varchar NOT NULL,created_at timestamptz NOT NULL);
   CREATE INDEX check_inbox_facility_idx ON notifications.check_inbox(facility_id,created_at);
   CREATE TABLE notifications.check_inbox_read(event_id uuid NOT NULL REFERENCES notifications.check_inbox(event_id) ON DELETE CASCADE,user_id varchar NOT NULL,read_at timestamptz NOT NULL,PRIMARY KEY(event_id,user_id));`);
  }
  async down(q: QueryRunner) {
    await assertRollbackSafe(q);
    const [{ n }] = await q.query(
      `SELECT (SELECT count(*) FROM public.check_daily_generation)+(SELECT count(*) FROM public.check_audit)+(SELECT count(*) FROM notifications.check_inbox)+(SELECT count(*) FROM public.outbox_events WHERE type='CHECK_CREATED') AS n`,
    );
    if (Number(n) > 0)
      throw new Error(
        'FORWARD_RECOVERY_REQUIRED: CHECK generation/audit/delivery data exists.',
      );
    await q.query(
      'DROP TABLE notifications.check_inbox_read; DROP TABLE notifications.check_inbox; DROP INDEX public.check_pending_delivery_idx; DROP TABLE public.check_audit; DROP TABLE public.check_daily_generation',
    );
  }
}
