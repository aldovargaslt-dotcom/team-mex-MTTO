import { BadRequestException } from '@nestjs/common';
import { PERMISOS, Permiso } from './permissions';
import { Rol } from './roles.enum';

/** Permiso que ADMIN_DIRECTIVO nunca puede perder (AC-P07 / OQ-5). */
export const PERMISSION_ADMIN_FLOOR: Permiso = 'usuarios.administrar';

export type MatrixUpdateInput = {
  permissions: unknown;
  expectedVersion: unknown;
  motivo: unknown;
};

export type NormalizedMatrixUpdate = {
  rol: Rol;
  permissions: Permiso[];
  expectedVersion: number;
  motivo: string;
};

const known = new Set<string>(PERMISOS);
const roles = new Set<string>(Object.values(Rol));

/** Valida y normaliza una edición. Fallo cerrado: cualquier duda ⇒ 400, nunca se concede. */
export function normalizeMatrixUpdate(
  rol: string,
  input: MatrixUpdateInput,
): NormalizedMatrixUpdate {
  if (!roles.has(rol))
    throw new BadRequestException('El rol indicado no se puede configurar.');
  const { permissions, expectedVersion } = input;
  if (
    !Array.isArray(permissions) ||
    permissions.some((p) => typeof p !== 'string')
  )
    throw new BadRequestException('Indica la lista de permisos del rol.');
  const list = permissions as string[];
  if (new Set(list).size !== list.length)
    throw new BadRequestException('La lista de permisos tiene duplicados.');
  const unknown = list.filter((p) => !known.has(p));
  if (unknown.length)
    throw new BadRequestException(
      `Permisos no reconocidos: ${unknown.join(', ')}.`,
    );
  if (
    typeof expectedVersion !== 'number' ||
    !Number.isInteger(expectedVersion) ||
    expectedVersion < 1
  )
    throw new BadRequestException('Indica la versión que estás editando.');
  const motivo = typeof input.motivo === 'string' ? input.motivo.trim() : '';
  if (motivo.length < 1 || motivo.length > 500)
    throw new BadRequestException(
      'Indica el motivo del cambio (1 a 500 caracteres).',
    );
  if (
    rol === (Rol.ADMIN_DIRECTIVO as string) &&
    !list.includes(PERMISSION_ADMIN_FLOOR)
  )
    throw new BadRequestException(
      'El administrador directivo debe conservar el permiso para administrar usuarios.',
    );
  return {
    rol: rol as Rol,
    permissions: [...list].sort() as Permiso[],
    expectedVersion,
    motivo,
  };
}
