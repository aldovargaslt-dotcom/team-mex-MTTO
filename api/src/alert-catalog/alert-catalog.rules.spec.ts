import { Rol } from '../auth/roles.enum';
import {
  canEditThresholds,
  canMutateTypes,
  familyVisibleToRole,
  isValidAlertCode,
  listVisibleTypes,
} from './alert-catalog.rules';
import { SEED_ALERT_TYPES } from './alert-catalog.types';

describe('alert catalog rules (K1–K4)', () => {
  it('K1: Supervisor ve MTTO; Logística FLOTA; Admin todos', () => {
    const supervisor = listVisibleTypes(SEED_ALERT_TYPES, Rol.SUPERVISOR);
    expect(supervisor.map((t) => t.code).sort()).toEqual([
      'MTTO_VENCIDO',
      'SALUD_UMBRAL',
      'STOCK_BAJO',
    ]);
    const logistica = listVisibleTypes(SEED_ALERT_TYPES, Rol.LOGISTICA);
    expect(logistica.map((t) => t.code)).toEqual(['FLOTA_SIN_REGRESO']);
    expect(listVisibleTypes(SEED_ALERT_TYPES, Rol.ADMIN_DIRECTIVO)).toHaveLength(
      4,
    );
  });

  it('K1: no-admin no lista tipos inactivos', () => {
    const inactive = SEED_ALERT_TYPES.map((t) =>
      t.code === 'MTTO_VENCIDO' ? { ...t, active: false } : t,
    );
    expect(
      listVisibleTypes(inactive, Rol.SUPERVISOR).map((t) => t.code),
    ).not.toContain('MTTO_VENCIDO');
    expect(
      listVisibleTypes(inactive, Rol.ADMIN_DIRECTIVO).find(
        (t) => t.code === 'MTTO_VENCIDO',
      )?.active,
    ).toBe(false);
  });

  it('K2: solo Admin muta tipos', () => {
    expect(canMutateTypes(Rol.ADMIN_DIRECTIVO)).toBe(true);
    expect(canMutateTypes(Rol.SUPERVISOR)).toBe(false);
    expect(canMutateTypes(Rol.LOGISTICA)).toBe(false);
  });

  it('K3: swimlane de umbrales por familia', () => {
    expect(canEditThresholds('MTTO', Rol.SUPERVISOR)).toBe(true);
    expect(canEditThresholds('FLOTA', Rol.SUPERVISOR)).toBe(false);
    expect(canEditThresholds('FLOTA', Rol.LOGISTICA)).toBe(true);
    expect(canEditThresholds('MTTO', Rol.LOGISTICA)).toBe(false);
    expect(familyVisibleToRole('MTTO', Rol.LOGISTICA)).toBe(false);
  });

  it('K4: códigos WO- rechazados; MAYÚSCULAS válidas', () => {
    expect(isValidAlertCode('WO-VISITA')).toBe(false);
    expect(isValidAlertCode('WO_VISITA')).toBe(false);
    expect(isValidAlertCode('mtto_x')).toBe(false);
    expect(isValidAlertCode('MTTO_EXTRA')).toBe(true);
  });
});
