import * as fs from 'fs';
import * as path from 'path';
import { RoleSite, scanRoleSites } from './role-site-scan';

const SRC = path.resolve(__dirname, '..', '..');
const FIXTURE = path.join(__dirname, 'role-sites.baseline.json');

describe('EWO-067 · línea base de autorizaciones por rol dentro de servicios (AC-P13)', () => {
  const current = scanRoleSites(SRC);

  it('genera/actualiza la línea base solo con UPDATE_ACCESS_BASELINE=1', () => {
    if (process.env.UPDATE_ACCESS_BASELINE === '1') {
      fs.writeFileSync(FIXTURE, JSON.stringify(current, null, 2) + '\n');
    }
    expect(fs.existsSync(FIXTURE)).toBe(true);
  });

  it('no aparecen ni desaparecen comprobaciones de rol sin actualizar la línea base', () => {
    const baseline = JSON.parse(fs.readFileSync(FIXTURE, 'utf8')) as RoleSite[];
    expect(current).toEqual(baseline);
  });

  it('el escaneo encuentra las autorizaciones conocidas', () => {
    const files = new Set(current.map((s) => s.file));
    expect(files.has('visitas/checks/canonical-orders.service.ts')).toBe(true);
    expect(files.has('inventario/inventory-costs.service.ts')).toBe(true);
  });
});
