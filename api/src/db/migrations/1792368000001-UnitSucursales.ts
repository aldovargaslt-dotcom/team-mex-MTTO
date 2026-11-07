import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * EWO-067. Seeds the sucursales that do not exist yet. `monterrey` (Nuevo Leon)
 * already exists in production and is intentionally not touched. Timezone is
 * fixed by facilities_timezone_check; per-facility timezone is deferred.
 */
export const SUCURSALES_SEED = [
  { id: 'matamoros', name: 'Matamoros' },
  { id: 'reynosa', name: 'Reynosa' },
  { id: 'coahuila', name: 'Coahuila' },
  { id: 'nuevo-laredo', name: 'Nuevo Laredo' },
  { id: 'tampico', name: 'Tampico' },
  { id: 'cd-victoria', name: 'CD Victoria' },
  { id: 'monclova', name: 'Monclova' },
  { id: 'linares', name: 'Linares' },
  { id: 'saltillo', name: 'Saltillo' },
] as const;

export class UnitSucursales1792368000001 implements MigrationInterface {
  name = 'UnitSucursales1792368000001';
  async up(q: QueryRunner) {
    for (const { id, name } of SUCURSALES_SEED)
      await q.query(
        `INSERT INTO public.facilities(id, name, timezone, version)
         VALUES ($1, $2, 'America/Mexico_City', 1)
         ON CONFLICT (id) DO NOTHING`,
        [id, name],
      );
  }
  async down(q: QueryRunner) {
    const ids = SUCURSALES_SEED.map((s) => s.id);
    const [{ used }] = await q.query(
      `SELECT (
         EXISTS (SELECT 1 FROM public.vehicle_facilities WHERE facility_id = ANY($1))
         OR EXISTS (SELECT 1 FROM public.check_inspections WHERE facility_id = ANY($1))
       ) AS used`,
      [ids],
    );
    if (used)
      throw new Error(
        'FORWARD_RECOVERY_REQUIRED: sucursales are referenced by units or checks.',
      );
    await q.query('DELETE FROM public.facilities WHERE id = ANY($1)', [ids]);
  }
}
