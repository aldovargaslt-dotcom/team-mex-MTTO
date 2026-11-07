import { ExecutionContext, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { PermissionsShadowGuard } from './permissions-shadow.guard';
import { PERMISOS_POR_ROL } from './permissions';
import { Roles } from './roles.decorator';
import { Rol } from './roles.enum';

class Ctrl {
  @Roles(Rol.ADMIN_DIRECTIVO)
  read() {
    return 1;
  }
  open() {
    return 1;
  }
}
// Nombre de handler real del mapa: PermissionsAdminController.read ⇒ usuarios.administrar.
class PermissionsAdminController {
  @Roles(Rol.ADMIN_DIRECTIVO)
  read() {
    return 1;
  }
}
class UnmappedController {
  @Roles(Rol.SUPERVISOR)
  somethingNew() {
    return 1;
  }
}

const seedView = () => ({
  mode: 'CONFIG' as const,
  editable: false,
  enforced: false as const,
  catalog: [],
  roles: Object.fromEntries(
    Object.values(Rol).map((r) => [
      r,
      { version: null, permissions: [...PERMISOS_POR_ROL[r]] },
    ]),
  ),
});

function setup(
  env: Record<string, string>,
  matrix: { read: jest.Mock } = {
    read: jest.fn().mockResolvedValue(seedView()),
  },
) {
  const guard = new PermissionsShadowGuard(
    new Reflector(),
    new ConfigService(env),
    matrix as never,
  );
  const ctx = (
    cls: new () => unknown,
    handler: string,
    request: Record<string, unknown>,
  ) =>
    ({
      getClass: () => cls,
      getHandler: () =>
        (cls.prototype as Record<string, () => unknown>)[handler],
      switchToHttp: () => ({ getRequest: () => request }),
    }) as unknown as ExecutionContext;
  return { guard, matrix, ctx };
}

describe('EWO-069 · PermissionsShadowGuard', () => {
  let warn: jest.SpyInstance;
  const firstWarn = () => String((warn.mock.calls as unknown[][])[0][0]);
  let debug: jest.SpyInstance;
  beforeEach(() => {
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    debug = jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });
  afterEach(() => jest.restoreAllMocks());

  const adminReq = {
    user: { rol: Rol.ADMIN_DIRECTIVO, userId: 'u' },
    actor: { subject: 'u', roles: [Rol.ADMIN_DIRECTIVO] },
  };

  it('S-01 · con off (por defecto) no lee la matriz ni registra y devuelve true', async () => {
    for (const env of [
      {},
      { PERMISSIONS_SHADOW: 'off' },
      { PERMISSIONS_SHADOW: 'basura' },
    ] as Record<string, string>[]) {
      const { guard, matrix, ctx } = setup(env);
      expect(
        await guard.canActivate(
          ctx(PermissionsAdminController, 'read', adminReq),
        ),
      ).toBe(true);
      expect(matrix.read).not.toHaveBeenCalled();
    }
    expect(warn).not.toHaveBeenCalled();
  });

  it('S-02 · con log y matriz sembrada no registra discrepancias y devuelve true', async () => {
    const { guard, matrix, ctx } = setup({ PERMISSIONS_SHADOW: 'log' });
    expect(
      await guard.canActivate(
        ctx(PermissionsAdminController, 'read', adminReq),
      ),
    ).toBe(true);
    expect(matrix.read).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
  });

  it('S-03 · matriz editada que difiere ⇒ DECISION_DIFFERS y sigue devolviendo true', async () => {
    const view = seedView();
    view.roles.ADMIN_DIRECTIVO.permissions = [];
    const { guard, ctx } = setup(
      { PERMISSIONS_SHADOW: 'log' },
      { read: jest.fn().mockResolvedValue(view) },
    );
    expect(
      await guard.canActivate(
        ctx(PermissionsAdminController, 'read', adminReq),
      ),
    ).toBe(true);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(firstWarn()).toContain('DECISION_DIFFERS');
    expect(firstWarn()).toContain('matrixDiffersFromSeed');
  });

  it('S-04 · fallo al leer la matriz ⇒ NO_COMPARISON y devuelve true', async () => {
    const { guard, ctx } = setup(
      { PERMISSIONS_SHADOW: 'log' },
      { read: jest.fn().mockRejectedValue(new Error('db caída')) },
    );
    expect(
      await guard.canActivate(
        ctx(PermissionsAdminController, 'read', adminReq),
      ),
    ).toBe(true);
    expect(firstWarn()).toContain('NO_COMPARISON');
  });

  it('S-04 · una petición malformada nunca lanza', async () => {
    const { guard, ctx } = setup({ PERMISSIONS_SHADOW: 'log' });
    for (const req of [{}, { user: null }, { user: { rol: 'X' } }, undefined])
      expect(
        await guard.canActivate(
          ctx(PermissionsAdminController, 'read', req as never),
        ),
      ).toBe(true);
  });

  it('S-07 · endpoint con @Roles sin permiso mapeado ⇒ ENDPOINT_UNMAPPED', async () => {
    const { guard, ctx } = setup({ PERMISSIONS_SHADOW: 'log' });
    await guard.canActivate(
      ctx(UnmappedController, 'somethingNew', {
        user: { rol: Rol.SUPERVISOR, userId: 'u' },
      }),
    );
    expect(firstWarn()).toContain('ENDPOINT_UNMAPPED');
  });

  it('endpoints sin @Roles no se comparan', async () => {
    const { guard, matrix, ctx } = setup({ PERMISSIONS_SHADOW: 'log' });
    await guard.canActivate(ctx(Ctrl, 'open', adminReq));
    expect(matrix.read).not.toHaveBeenCalled();
  });

  it('muestreo 0 ⇒ no compara; muestreo inválido ⇒ se trata como 1', async () => {
    const zero = setup({
      PERMISSIONS_SHADOW: 'log',
      PERMISSIONS_SHADOW_SAMPLE: '0',
    });
    await zero.guard.canActivate(
      zero.ctx(PermissionsAdminController, 'read', adminReq),
    );
    expect(zero.matrix.read).not.toHaveBeenCalled();
    const bad = setup({
      PERMISSIONS_SHADOW: 'log',
      PERMISSIONS_SHADOW_SAMPLE: 'x',
    });
    await bad.guard.canActivate(
      bad.ctx(PermissionsAdminController, 'read', adminReq),
    );
    expect(bad.matrix.read).toHaveBeenCalledTimes(1);
  });

  it('la cobertura se informa a nivel debug una vez por combinación endpoint×rol', async () => {
    const { guard, ctx } = setup({ PERMISSIONS_SHADOW: 'log' });
    for (let i = 0; i < 3; i++)
      await guard.canActivate(
        ctx(PermissionsAdminController, 'read', adminReq),
      );
    expect(debug).toHaveBeenCalledTimes(1);
  });
});
