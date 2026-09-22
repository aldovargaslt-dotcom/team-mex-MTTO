import { etiquetaIntervaloMantenimiento } from '@/lib/format';
import type { CatalogUmbrales } from '@/lib/types';

/** Honest muted fallback when a type has no configurable thresholds yet. */
export const RESUMEN_SIN_AJUSTE = 'Sin ajuste en lista';

const RESUMEN_STOCK_BAJO = 'Según mínimo en existencias';

/**
 * Taller Spanish “Cuándo avisa” line from live catalog threshold payloads.
 * Does not invent numbers; unknown / empty payloads fall back.
 */
export function resumenCuandoAvisaCatalogo(
  code: string,
  payload: CatalogUmbrales | null | undefined,
): string {
  if (!payload) return RESUMEN_SIN_AJUSTE;

  if (code === 'MTTO_VENCIDO') {
    const umbrales = payload.umbrales ?? [];
    if (umbrales.length === 0) return RESUMEN_SIN_AJUSTE;
    const intervalos = [
      ...new Set(
        umbrales.map((row) =>
          etiquetaIntervaloMantenimiento(row.tKm, row.tDias),
        ),
      ),
    ];
    return intervalos.join(' · ');
  }

  if (code === 'STOCK_BAJO') {
    if (!payload.items) return RESUMEN_SIN_AJUSTE;
    return RESUMEN_STOCK_BAJO;
  }

  if (code === 'SALUD_UMBRAL') {
    const salud = payload.salud;
    if (!salud) return RESUMEN_SIN_AJUSTE;
    if (!salud.alertEnabled) return 'Aviso apagado';
    return `Bajo ${salud.alertThreshold} · recupera ${salud.recoveryThreshold}`;
  }

  if (code === 'FLOTA_SIN_REGRESO') {
    const cfg = payload.sinRegreso;
    if (!cfg) return RESUMEN_SIN_AJUSTE;
    return `Local ${cfg.localH} h · Foránea ${cfg.foraneoH} h`;
  }

  return RESUMEN_SIN_AJUSTE;
}
