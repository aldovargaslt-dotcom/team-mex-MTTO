import * as fs from 'fs';
import * as path from 'path';
import { EndpointAccess } from './access-baseline/endpoint-sweep';
import {
  DiscrepancyLog,
  permissionDecision,
  roleDecision,
} from './permissions-shadow.rules';
import { PERMISO_POR_ENDPOINT, PERMISOS_POR_ROL, Permiso } from './permissions';
import { Rol } from './roles.enum';

const baseline = (
  JSON.parse(
    fs.readFileSync(
      path.join(__dirname, 'access-baseline', 'endpoints.baseline.json'),
      'utf8',
    ),
  ) as EndpointAccess[]
).filter((e) => e.roles !== null);
const handlerOf = (e: EndpointAccess) => e.controller.split('#')[1];
const seed = Object.fromEntries(
  Object.values(Rol).map((r) => [r, [...PERMISOS_POR_ROL[r]] as string[]]),
);
const ALL: (Rol | 'SYSTEM')[] = [...Object.values(Rol), 'SYSTEM'];

/** Copia fiel de la selección de rol efectivo de AuthGuard (auth.guard.ts) para probar paridad. */
function authGuardEffectiveRole(
  actorRoles: (Rol | 'SYSTEM')[],
  preferredHeader: string | undefined,
  required: Rol[],
): Rol {
  const preferred = preferredHeader?.trim() as Rol | undefined;
  const role =
    (preferred &&
    actorRoles.includes(preferred) &&
    (!required || required.includes(preferred))
      ? preferred
      : undefined) ??
    (actorRoles.find(
      (r) => r !== 'SYSTEM' && (!required || required.includes(r)),
    ) as Rol | undefined);
  return role ?? (actorRoles[0] as Rol);
}

function subsets<T>(items: T[]): T[][] {
  const out: T[][] = [];
  for (let m = 1; m < 1 << items.length; m++)
    out.push(items.filter((_, i) => m & (1 << i)));
  return out;
}

describe('EWO-069 · decisión por rol vs por permiso (S-05, AC-P01 en runtime)', () => {
  it('coinciden para todo endpoint con @Roles × todo conjunto de roles del actor × X-Role (incl. SYSTEM)', () => {
    let checked = 0;
    for (const e of baseline) {
      const required = e.roles as Rol[];
      const permiso: Permiso = PERMISO_POR_ENDPOINT[handlerOf(e)];
      expect(permiso).toBeDefined();
      for (const actorRoles of subsets(ALL)) {
        for (const header of [undefined, '', ...Object.values(Rol)]) {
          const effective = authGuardEffectiveRole(
            actorRoles,
            header,
            required,
          );
          const byRole = roleDecision(required, effective);
          const byPermission = permissionDecision(permiso, actorRoles, seed);
          if (byRole !== byPermission)
            throw new Error(
              `Discrepancia en ${handlerOf(e)} roles=${actorRoles.join(',')} x-role=${header}`,
            );
          checked++;
        }
      }
    }
    // endpoints × (2^5−1 subconjuntos de roles) × 6 variantes de X-Role
    expect(checked).toBe(baseline.length * 31 * 6);
    expect(baseline.length).toBeGreaterThan(100);
  });

  it('modo legado (X-Role único): el rol del usuario decide igual por rol y por permiso', () => {
    for (const e of baseline)
      for (const r of Object.values(Rol))
        expect(roleDecision(e.roles as Rol[], r)).toBe(
          permissionDecision(PERMISO_POR_ENDPOINT[handlerOf(e)], [r], seed),
        );
  });

  it('SYSTEM no concede permisos y un rol ausente de la matriz deniega', () => {
    expect(permissionDecision('usuarios.administrar', ['SYSTEM'], seed)).toBe(
      false,
    );
    expect(permissionDecision('usuarios.administrar', [Rol.MECANICO], {})).toBe(
      false,
    );
  });
});

describe('EWO-069 · DiscrepancyLog (S-06)', () => {
  const entry = (n: number) => ({
    kind: 'DECISION_DIFFERS' as const,
    endpoint: `Ctrl.handler${n}`,
    roles: ['SUPERVISOR'],
    detail: 'role=allow permission=deny',
  });

  it('emite la primera vez y luego en potencias de dos, contando', () => {
    const log = new DiscrepancyLog(10);
    const emitted: number[] = [];
    for (let i = 1; i <= 20; i++) {
      const r = log.record(entry(1));
      if (r.emit) emitted.push(r.count);
    }
    expect(emitted).toEqual([1, 2, 4, 8, 16]);
  });

  it('respeta el tope de claves: nunca crece sin límite y no pierde conteo de las existentes', () => {
    const log = new DiscrepancyLog(3);
    for (let i = 0; i < 10; i++) log.record(entry(i));
    expect(log.size()).toBeLessThanOrEqual(3);
    expect(log.record(entry(0)).count).toBeGreaterThanOrEqual(1);
  });

  it('la clave solo contiene endpoint, roles y tipo (sin PII)', () => {
    const log = new DiscrepancyLog(10);
    const r = log.record({
      ...entry(1),
      roles: ['MECANICO', 'SUPERVISOR'],
    });
    expect(r.line).toEqual({
      kind: 'DECISION_DIFFERS',
      endpoint: 'Ctrl.handler1',
      roles: ['MECANICO', 'SUPERVISOR'],
      detail: 'role=allow permission=deny',
      count: 1,
    });
    expect(JSON.stringify(r.line)).not.toMatch(/subject|token|bearer|@/i);
  });
});
