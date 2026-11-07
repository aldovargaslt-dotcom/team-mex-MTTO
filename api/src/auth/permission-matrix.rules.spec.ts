import { BadRequestException } from '@nestjs/common';
import { ROLE_PERMISSION_SEED } from '../db/migrations/1792368000001-RolePermissionMatrix';
import { PERMISOS, PERMISOS_POR_ROL } from './permissions';
import { Rol } from './roles.enum';
import {
  normalizeMatrixUpdate,
  PERMISSION_ADMIN_FLOOR,
} from './permission-matrix.rules';

describe('EWO-068 · reglas de la matriz rol→permisos', () => {
  it('la siembra literal de la migración equivale exactamente a PERMISOS_POR_ROL (EWO-067)', () => {
    for (const rol of Object.values(Rol)) {
      expect([...(ROLE_PERMISSION_SEED[rol] ?? [])].sort()).toEqual(
        [...PERMISOS_POR_ROL[rol]].sort(),
      );
    }
    expect(Object.keys(ROLE_PERMISSION_SEED).sort()).toEqual(
      Object.values(Rol).sort(),
    );
  });

  it('acepta un conjunto válido, sin duplicados y ordenado', () => {
    const out = normalizeMatrixUpdate(Rol.MECANICO, {
      permissions: ['inventario.ver', 'documentos.vehiculo.ver'],
      expectedVersion: 1,
      motivo: '  Ajuste inicial  ',
    });
    expect(out.permissions).toEqual([
      'documentos.vehiculo.ver',
      'inventario.ver',
    ]);
    expect(out.motivo).toBe('Ajuste inicial');
  });

  it('rechaza permisos desconocidos (AC-P12: nunca conceder lo no catalogado)', () => {
    expect(() =>
      normalizeMatrixUpdate(Rol.MECANICO, {
        permissions: ['inventario.ver', 'inventado.todo'],
        expectedVersion: 1,
        motivo: 'x',
      }),
    ).toThrow(BadRequestException);
  });

  it('rechaza duplicados, listas no-arreglo y valores no string', () => {
    for (const permissions of [
      ['inventario.ver', 'inventario.ver'],
      'inventario.ver',
      [1],
      null,
    ])
      expect(() =>
        normalizeMatrixUpdate(Rol.MECANICO, {
          permissions,
          expectedVersion: 1,
          motivo: 'x',
        }),
      ).toThrow(BadRequestException);
  });

  it('exige motivo de 1 a 500 caracteres tras recortar espacios (O-3)', () => {
    for (const motivo of ['', '   ', 'a'.repeat(501), undefined])
      expect(() =>
        normalizeMatrixUpdate(Rol.MECANICO, {
          permissions: [],
          expectedVersion: 1,
          motivo,
        }),
      ).toThrow(BadRequestException);
    expect(
      normalizeMatrixUpdate(Rol.MECANICO, {
        permissions: [],
        expectedVersion: 1,
        motivo: 'a'.repeat(500),
      }).permissions,
    ).toEqual([]);
  });

  it('exige expectedVersion entero positivo', () => {
    for (const expectedVersion of [0, -1, 1.5, '1', undefined])
      expect(() =>
        normalizeMatrixUpdate(Rol.MECANICO, {
          permissions: [],
          expectedVersion,
          motivo: 'x',
        }),
      ).toThrow(BadRequestException);
  });

  it('ADMIN_DIRECTIVO siempre conserva usuarios.administrar (AC-P07)', () => {
    expect(PERMISSION_ADMIN_FLOOR).toBe('usuarios.administrar');
    expect(() =>
      normalizeMatrixUpdate(Rol.ADMIN_DIRECTIVO, {
        permissions: PERMISOS.filter((p) => p !== PERMISSION_ADMIN_FLOOR),
        expectedVersion: 1,
        motivo: 'x',
      }),
    ).toThrow(BadRequestException);
    expect(
      normalizeMatrixUpdate(Rol.ADMIN_DIRECTIVO, {
        permissions: [PERMISSION_ADMIN_FLOOR],
        expectedVersion: 1,
        motivo: 'x',
      }).permissions,
    ).toEqual([PERMISSION_ADMIN_FLOOR]);
  });

  it('no permite editar roles que no sean de usuario (SYSTEM) ni roles desconocidos', () => {
    for (const rol of ['SYSTEM', 'ROOT'])
      expect(() =>
        normalizeMatrixUpdate(rol, {
          permissions: [],
          expectedVersion: 1,
          motivo: 'x',
        }),
      ).toThrow(BadRequestException);
  });
});
