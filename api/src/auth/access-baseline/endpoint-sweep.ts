import * as fs from 'fs';
import * as path from 'path';
import 'reflect-metadata';
import { ROLES_KEY } from '../roles.decorator';

const METHODS = [
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'PATCH',
  'ALL',
  'OPTIONS',
  'HEAD',
];

export type EndpointAccess = {
  controller: string;
  method: string;
  route: string;
  /** null = sin @Roles: cualquier identidad autenticada (RolesGuard no restringe). */
  roles: string[] | null;
};

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.controller.ts')) out.push(p);
  }
  return out;
}

/** Recorre todos los *.controller.ts y calcula el acceso efectivo del RolesGuard
 *  (handler sobrescribe clase, como Reflector.getAllAndOverride). */
export function sweepEndpoints(srcDir: string): EndpointAccess[] {
  const result: EndpointAccess[] = [];
  for (const file of walk(srcDir).sort()) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(file) as Record<string, unknown>;
    for (const value of Object.values(mod)) {
      if (typeof value !== 'function') continue;
      const ctrlPath = Reflect.getMetadata('path', value) as
        string | string[] | undefined;
      if (ctrlPath === undefined) continue;
      const base = Array.isArray(ctrlPath) ? ctrlPath[0] : ctrlPath;
      const classRoles = Reflect.getMetadata(ROLES_KEY, value) as
        string[] | undefined;
      const proto = (value as { prototype: Record<string, unknown> }).prototype;
      for (const name of Object.getOwnPropertyNames(proto)) {
        if (name === 'constructor') continue;
        const handler = proto[name];
        if (typeof handler !== 'function') continue;
        const methodCode = Reflect.getMetadata('method', handler) as
          number | undefined;
        if (methodCode === undefined) continue;
        const sub = Reflect.getMetadata('path', handler) as
          string | string[] | undefined;
        const subPath = Array.isArray(sub) ? sub[0] : (sub ?? '');
        const handlerRoles = Reflect.getMetadata(ROLES_KEY, handler) as
          string[] | undefined;
        const eff = handlerRoles ?? classRoles;
        const roles =
          eff === undefined || eff.length === 0 ? null : [...eff].sort();
        result.push({
          controller: `${path.relative(srcDir, file)}#${(value as { name: string }).name}.${name}`,
          method: METHODS[methodCode] ?? String(methodCode),
          route:
            '/' +
            [base, subPath]
              .filter(Boolean)
              .join('/')
              .replace(/\/+/g, '/')
              .replace(/^\//, ''),
          roles,
        });
      }
    }
  }
  return result.sort((a, b) =>
    (a.route + a.method + a.controller).localeCompare(
      b.route + b.method + b.controller,
    ),
  );
}
