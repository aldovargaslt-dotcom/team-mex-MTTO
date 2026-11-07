import { Rol } from './roles.enum';

/** Decisión actual de RolesGuard: el rol efectivo (ya elegido por AuthGuard) debe estar en @Roles. */
export function roleDecision(
  required: readonly Rol[],
  effectiveRole: string,
): boolean {
  return (required as readonly string[]).includes(effectiveRole);
}

/** Decisión por permisos: algún rol del actor (excluido SYSTEM) tiene el permiso en la matriz.
 *  Equivale a la elección de un único rol efectivo de AuthGuard (probado exhaustivamente). */
export function permissionDecision(
  permission: string,
  actorRoles: readonly string[],
  matrix: Readonly<Record<string, readonly string[]>>,
): boolean {
  return actorRoles.some(
    (rol) => rol !== 'SYSTEM' && (matrix[rol] ?? []).includes(permission),
  );
}

export type DiscrepancyKind =
  'DECISION_DIFFERS' | 'ENDPOINT_UNMAPPED' | 'NO_COMPARISON';

export type DiscrepancyEntry = {
  kind: DiscrepancyKind;
  endpoint: string;
  roles: string[];
  detail: string;
};

export type DiscrepancyLine = DiscrepancyEntry & { count: number };

const OVERFLOW_KEY = '__OVERFLOW__';

/**
 * Deduplica discrepancias por (tipo, endpoint, roles, detalle) con contador. Emite la primera
 * ocurrencia y luego en potencias de dos (1, 2, 4, 8…). Tope fijo de claves: al llenarse, lo
 * nuevo se agrega a una cubeta de desborde para que la memoria y el volumen de registro no crezcan.
 * Solo guarda endpoint, roles y tipo: nunca identidad, tokens ni datos de la petición.
 */
export class DiscrepancyLog {
  private readonly counts = new Map<string, number>();
  constructor(private readonly cap = 500) {}

  size() {
    return this.counts.size;
  }

  record(entry: DiscrepancyEntry): {
    emit: boolean;
    count: number;
    line: DiscrepancyLine;
  } {
    const roles = [...entry.roles].sort();
    let key = [entry.kind, entry.endpoint, roles.join('+'), entry.detail].join(
      '|',
    );
    let line: DiscrepancyEntry = { ...entry, roles };
    if (!this.counts.has(key) && this.counts.size >= this.cap - 1) {
      key = OVERFLOW_KEY;
      line = {
        kind: entry.kind,
        endpoint: '(otros)',
        roles: [],
        detail: 'tope de claves alcanzado',
      };
    }
    const count = (this.counts.get(key) ?? 0) + 1;
    this.counts.set(key, count);
    return {
      emit: (count & (count - 1)) === 0,
      count,
      line: { ...line, count },
    };
  }
}
