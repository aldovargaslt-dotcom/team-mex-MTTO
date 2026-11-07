import * as fs from 'fs';
import * as path from 'path';
import { Rol } from '../roles.enum';
import {
  ENDPOINTS_ABIERTOS_AUTENTICADOS,
  PERMISOS,
  PERMISOS_POR_ROL,
  PERMISO_POR_ENDPOINT,
  Permiso,
} from '../permissions';
import { EndpointAccess } from './endpoint-sweep';

const baseline = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'endpoints.baseline.json'), 'utf8'),
) as EndpointAccess[];
const handlerOf = (e: EndpointAccess) => e.controller.split('#')[1];
const rolesWith = (p: Permiso) =>
  Object.values(Rol)
    .filter((r) => PERMISOS_POR_ROL[r].includes(p))
    .sort();

describe('EWO-067 · equivalencia permisos ↔ @Roles (AC-P01, P02, P03, P11, P13)', () => {
  it('cada endpoint de la línea base tiene un permiso o está declarado abierto (AC-P13)', () => {
    for (const e of baseline) {
      const h = handlerOf(e);
      const mapped = h in PERMISO_POR_ENDPOINT;
      const open = ENDPOINTS_ABIERTOS_AUTENTICADOS.includes(h);
      expect({ h, ok: mapped !== open }).toEqual({ h, ok: true });
      expect({ h, abierto: open }).toEqual({ h, abierto: e.roles === null });
    }
  });

  it('no hay entradas huérfanas en el mapa de endpoints', () => {
    const handlers = new Set(baseline.map(handlerOf));
    for (const h of [
      ...Object.keys(PERMISO_POR_ENDPOINT),
      ...ENDPOINTS_ABIERTOS_AUTENTICADOS,
    ])
      expect({ h, existe: handlers.has(h) }).toEqual({ h, existe: true });
  });

  it('los roles con el permiso de cada endpoint son exactamente sus @Roles actuales (AC-P01)', () => {
    for (const e of baseline) {
      if (e.roles === null) continue;
      const p = PERMISO_POR_ENDPOINT[handlerOf(e)];
      expect({ h: handlerOf(e), roles: rolesWith(p) }).toEqual({
        h: handlerOf(e),
        roles: [...e.roles].sort(),
      });
    }
  });

  it('SUPERVISOR conserva exactamente sus endpoints actuales (AC-P02)', () => {
    const viaBaseline = baseline
      .filter((e) => e.roles?.includes(Rol.SUPERVISOR))
      .map(handlerOf)
      .sort();
    const viaPermisos = baseline
      .filter(
        (e) =>
          e.roles !== null &&
          PERMISOS_POR_ROL[Rol.SUPERVISOR].includes(
            PERMISO_POR_ENDPOINT[handlerOf(e)],
          ),
      )
      .map(handlerOf)
      .sort();
    expect(viaPermisos).toEqual(viaBaseline);
  });

  it('MECANICO conserva su acceso actual y no se amplía ni recorta (AC-P11)', () => {
    const actual = baseline
      .filter((e) => e.roles?.includes(Rol.MECANICO))
      .map(handlerOf);
    expect(actual).toEqual(['VehicleDocumentsController.current']);
    expect([...PERMISOS_POR_ROL[Rol.MECANICO]]).toEqual([
      'documentos.vehiculo.ver',
    ]);
  });

  it('el catálogo no tiene duplicados ni permisos sin uso ni sin asignar (AC-P03)', () => {
    expect(new Set(PERMISOS).size).toBe(PERMISOS.length);
    const usados = new Set(Object.values(PERMISO_POR_ENDPOINT));
    for (const p of PERMISOS) {
      expect({ p, usado: usados.has(p) }).toEqual({ p, usado: true });
      expect({ p, roles: rolesWith(p).length > 0 }).toEqual({ p, roles: true });
    }
  });

  it('los permisos referidos en PERMISOS_POR_ROL existen en el catálogo', () => {
    for (const r of Object.values(Rol))
      for (const p of PERMISOS_POR_ROL[r]) expect(PERMISOS).toContain(p);
  });
});
