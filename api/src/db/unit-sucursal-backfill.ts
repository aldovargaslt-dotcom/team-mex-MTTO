import { DataSource } from 'typeorm';

/**
 * EWO-068. One-off backfill: give every unit that has no `vehicle_facilities`
 * row the sucursal stated explicitly by the Owner. There is no built-in
 * default; the facility id is a required argument. Existing mappings are
 * never touched.
 */
export type BackfillReport = {
  mode: 'DRY_RUN' | 'APPLY';
  facilityId: string;
  facilityExists: boolean;
  totalUnits: number;
  alreadyMapped: number;
  toMap: { id: string; numeroInterno: string }[];
  applied: number;
};

export function parseBackfillArgs(argv: string[]) {
  let facilityId = '';
  let apply = false;
  for (const arg of argv) {
    if (arg === '--apply') apply = true;
    else if (arg.startsWith('--facility=')) facilityId = arg.slice(11).trim();
    else throw new Error(`Argumento no reconocido: ${arg}`);
  }
  if (!facilityId)
    throw new Error('Indique la sucursal con --facility=<id> (obligatorio).');
  return { facilityId, apply };
}

export async function backfillUnitSucursal(
  db: DataSource,
  facilityId: string,
  apply: boolean,
): Promise<BackfillReport> {
  return db.transaction(async (manager) => {
    const facilityExists =
      (
        await manager.query('SELECT 1 FROM public.facilities WHERE id = $1', [
          facilityId,
        ])
      ).length > 0;
    if (apply && !facilityExists)
      throw new Error(
        `SUCURSAL_NOT_FOUND: la sucursal "${facilityId}" no existe; no se escribió nada.`,
      );
    const toMap: { id: string; numeroInterno: string }[] = await manager.query(
      `SELECT u.id, u.numero_interno AS "numeroInterno"
           FROM public.unidades u
          WHERE NOT EXISTS (
                SELECT 1 FROM public.vehicle_facilities vf WHERE vf.unidad_id = u.id)
          ORDER BY u.numero_interno`,
    );
    const [{ total }] = await manager.query(
      'SELECT count(*)::int AS total FROM public.unidades',
    );
    let applied = 0;
    if (apply && toMap.length) {
      const inserted = await manager.query(
        `INSERT INTO public.vehicle_facilities(unidad_id, facility_id, version)
         SELECT u.id, $1, 1 FROM public.unidades u
          WHERE NOT EXISTS (
                SELECT 1 FROM public.vehicle_facilities vf WHERE vf.unidad_id = u.id)
         ON CONFLICT (unidad_id) DO NOTHING
         RETURNING unidad_id`,
        [facilityId],
      );
      applied = inserted.length;
    }
    return {
      mode: apply ? 'APPLY' : 'DRY_RUN',
      facilityId,
      facilityExists,
      totalUnits: total,
      alreadyMapped: total - toMap.length,
      toMap,
      applied,
    };
  });
}
