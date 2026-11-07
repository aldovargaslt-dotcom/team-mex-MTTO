import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * EWO-068 · Matriz rol→permisos en `auth` (modo sombra: nada la usa para decidir acceso).
 * La siembra es un LITERAL fijo equivalente al acceso vigente (EWO-067); una prueba exige
 * igualdad con `PERMISOS_POR_ROL`. Aditiva y reversible: `down` solo elimina estas tablas.
 */
export const ROLE_PERMISSION_SEED: Readonly<Record<string, readonly string[]>> =
  {
    SUPERVISOR: [
      'alertas.activas.ver',
      'alertas.editar',
      'alertas.ver',
      'analisis.operar',
      'analisis.ver',
      'andon.operar',
      'andon.umbrales.editar',
      'andon.ver',
      'costos.ajustar',
      'costos.capturar',
      'costos.completar',
      'costos.corregir',
      'costos.ver',
      'inventario.operar',
      'inventario.ver',
      'notificaciones.ver',
      'salud.ver',
      'unidades.hub.ver',
      'visitas.cerrar',
      'visitas.escribir',
      'visitas.ver',
    ],
    ADMIN_DIRECTIVO: [
      'alertas.activas.ver',
      'alertas.administrar',
      'alertas.editar',
      'alertas.ver',
      'analisis.operar',
      'analisis.ver',
      'andon.umbrales.editar',
      'andon.ver',
      'catalogos.administrar',
      'costos.ajustar',
      'costos.capturar',
      'costos.completar',
      'costos.corregir',
      'costos.ver',
      'documentos.vehiculo.escribir',
      'documentos.vehiculo.ver',
      'flota.operar',
      'inventario.operar',
      'inventario.ver',
      'logistica.operar',
      'notificaciones.ver',
      'salud.configurar',
      'salud.ver',
      'unidades.hub.ver',
      'usuarios.administrar',
      'visitas.ver',
    ],
    LOGISTICA: [
      'alertas.editar',
      'alertas.ver',
      'documentos.vehiculo.ver',
      'flota.operar',
      'logistica.operar',
      'notificaciones.ver',
    ],
    MECANICO: ['documentos.vehiculo.ver'],
  };

const ROLES = ['SUPERVISOR', 'ADMIN_DIRECTIVO', 'LOGISTICA', 'MECANICO'];

export class RolePermissionMatrix1792368000001 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    await runner.query('CREATE SCHEMA IF NOT EXISTS auth');
    await runner.query(`CREATE TABLE auth.role_permission_versions (
      role text PRIMARY KEY, version integer NOT NULL DEFAULT 1,
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT auth_rpv_role_check CHECK (role = ANY (ARRAY['SUPERVISOR','ADMIN_DIRECTIVO','LOGISTICA','MECANICO']::text[])),
      CONSTRAINT auth_rpv_version_check CHECK (version > 0)
    )`);
    await runner.query(`CREATE TABLE auth.role_permissions (
      role text NOT NULL, permission text NOT NULL,
      CONSTRAINT auth_rp_pk PRIMARY KEY (role, permission),
      CONSTRAINT auth_rp_role_fk FOREIGN KEY (role) REFERENCES auth.role_permission_versions(role)
    )`);
    await runner.query(`CREATE TABLE auth.role_permission_audit (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), role text NOT NULL,
      actor_subject text NOT NULL, action text NOT NULL, reason text NOT NULL,
      before_permissions jsonb, after_permissions jsonb NOT NULL,
      version_after integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT auth_rpa_action_check CHECK (action IN ('SEED','UPDATE'))
    )`);
    for (const role of ROLES) {
      const permissions = [...(ROLE_PERMISSION_SEED[role] ?? [])].sort();
      await runner.query(
        'INSERT INTO auth.role_permission_versions(role, version) VALUES ($1, 1)',
        [role],
      );
      for (const permission of permissions)
        await runner.query(
          'INSERT INTO auth.role_permissions(role, permission) VALUES ($1, $2)',
          [role, permission],
        );
      await runner.query(
        `INSERT INTO auth.role_permission_audit(role, actor_subject, action, reason, before_permissions, after_permissions, version_after)
         VALUES ($1, 'SYSTEM:seed', 'SEED', 'Siembra equivalente al acceso vigente (EWO-067)', NULL, $2::jsonb, 1)`,
        [role, JSON.stringify(permissions)],
      );
    }
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP TABLE IF EXISTS auth.role_permission_audit');
    await runner.query('DROP TABLE IF EXISTS auth.role_permissions');
    await runner.query('DROP TABLE IF EXISTS auth.role_permission_versions');
  }
}
