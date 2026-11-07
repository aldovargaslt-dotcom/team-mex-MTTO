import { EntityManager } from 'typeorm';
import { SUCURSALES_SEED } from '../db/migrations/1792368000001-UnitSucursales';

/**
 * EWO-069. Local-development convenience only: a database created with
 * `synchronize` never runs the release migration that seeds the sucursales,
 * so a developer could not create a unit. Production never gets facilities
 * from a seed (EWO-015: "no production facility seeds").
 */
export const DEV_SUCURSALES = [
  { id: 'monterrey', name: 'Monterrey' },
  ...SUCURSALES_SEED,
];
export const DEV_DEFAULT_SUCURSAL = 'monterrey';

/** Only an explicit local development run, never a remote database. */
export function devFacilitiesEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.NODE_ENV === 'development' && !env.DATABASE_URL?.trim();
}

/** Idempotent: inserts missing sucursales and maps unmapped units to monterrey. */
export async function seedDevFacilities(manager: EntityManager) {
  for (const { id, name } of DEV_SUCURSALES)
    await manager.query(
      `INSERT INTO public.facilities(id, name, timezone, version)
       VALUES ($1, $2, 'America/Mexico_City', 1)
       ON CONFLICT (id) DO NOTHING`,
      [id, name],
    );
  await manager.query(
    `INSERT INTO public.vehicle_facilities(unidad_id, facility_id, version)
     SELECT u.id, $1, 1 FROM public.unidades u
     WHERE NOT EXISTS (
       SELECT 1 FROM public.vehicle_facilities vf WHERE vf.unidad_id = u.id)
     ON CONFLICT (unidad_id) DO NOTHING`,
    [DEV_DEFAULT_SUCURSAL],
  );
}
