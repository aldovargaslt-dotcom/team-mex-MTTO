import { PREVENTIVE_WINDOW_RATIO } from './enums';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function diasEntre(fromIso: string, toIso: string): number {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  return Math.floor((to - from) / MS_PER_DAY);
}

/**
 * H3: r = remaining / interval. Ventana w = 0.15.
 * Piecewise lineal para evitar acantilados (1001 vs 999 km).
 */
export function scoreFromRemainingRatio(
  r: number,
  window = PREVENTIVE_WINDOW_RATIO,
): number {
  if (!Number.isFinite(r)) {
    return 0;
  }
  if (r >= 1) return 100;
  if (r >= window) {
    return 90 + (10 * (r - window)) / (1 - window);
  }
  if (r >= 0) {
    return 35 + (55 * r) / window;
  }
  if (r >= -window) {
    return 15 + (20 * (r + window)) / window;
  }
  if (r <= -1) return 0;
  return (15 * (r + 1)) / (1 - window);
}

export function maintenanceAxisScore(
  remaining: number,
  interval: number,
): number {
  if (!Number.isFinite(interval) || interval <= 0) {
    return 0;
  }
  return scoreFromRemainingRatio(remaining / interval);
}

export function minScore(scores: number[]): number {
  if (scores.length === 0) {
    throw new Error('minScore exige al menos un eje');
  }
  return Math.min(...scores);
}

export function remainingFromUsed(used: number, interval: number): number {
  return interval - used;
}
