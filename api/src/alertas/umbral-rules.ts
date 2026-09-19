import {
  DEFAULT_UMBRAL_FORANEO_H,
  DEFAULT_UMBRAL_LOCAL_H,
} from './enums';

export type AmbitoFlota = 'LOCAL' | 'FORANEO';

/** Frozen ADR-010: umbral_unidad[unidad.id] ?? (FORANEO ? 24 : 8). */
export function resolveUmbralHoras(input: {
  ambito: AmbitoFlota;
  overrideHoras?: number | null;
  defaultLocalH?: number;
  defaultForaneoH?: number;
}): number {
  if (input.overrideHoras != null) {
    return input.overrideHoras;
  }
  if (input.ambito === 'FORANEO') {
    return input.defaultForaneoH ?? DEFAULT_UMBRAL_FORANEO_H;
  }
  return input.defaultLocalH ?? DEFAULT_UMBRAL_LOCAL_H;
}

export function elapsedHoras(salidaAt: Date, now: Date): number {
  return (now.getTime() - salidaAt.getTime()) / 3_600_000;
}

export function alertaSinRegreso(input: {
  opsEstado: 'EN_RUTA' | 'DISPONIBLE';
  salidaAt: Date | null | undefined;
  now: Date;
  thresholdHoras: number;
}): 'SIN_REGRESO' | null {
  if (input.opsEstado !== 'EN_RUTA' || !input.salidaAt) {
    return null;
  }
  if (elapsedHoras(input.salidaAt, input.now) < input.thresholdHoras) {
    return null;
  }
  return 'SIN_REGRESO';
}
