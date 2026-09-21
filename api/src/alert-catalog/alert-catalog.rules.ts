import { Rol } from '../auth/roles.enum';
import {
  AlertFamily,
  AlertOwningModule,
  AlertTypeRecord,
  ThresholdMode,
} from './alert-catalog.types';

export const MSG_SIN_PERMISO_TIPO =
  'No tiene permiso para crear o desactivar tipos de alerta.';
export const MSG_SIN_PERMISO_UMBRAL =
  'No tiene permiso para editar esta alerta.';
export const MSG_CODIGO_INVALIDO =
  'El código debe ir en MAYÚSCULAS y guion bajo, y no puede empezar con WO-.';
export const MSG_CODIGO_DUPLICADO = 'Ya existe una alerta con ese código.';
export const MSG_TIPO_NO_ENCONTRADO = 'No se encontró esa alerta.';

const CODE_RE = /^[A-Z][A-Z0-9_]*$/;

export function isValidAlertCode(code: string): boolean {
  const trimmed = code.trim();
  if (!CODE_RE.test(trimmed)) return false;
  if (trimmed.startsWith('WO-') || trimmed.startsWith('WO_')) return false;
  return true;
}

export function familyVisibleToRole(family: AlertFamily, rol: Rol): boolean {
  if (rol === Rol.ADMIN_DIRECTIVO) return true;
  if (rol === Rol.SUPERVISOR) return family === AlertFamily.MTTO;
  if (rol === Rol.LOGISTICA) return family === AlertFamily.FLOTA;
  return false;
}

export function canMutateTypes(rol: Rol): boolean {
  return rol === Rol.ADMIN_DIRECTIVO;
}

export function canEditThresholds(family: AlertFamily, rol: Rol): boolean {
  if (rol === Rol.ADMIN_DIRECTIVO) return true;
  if (rol === Rol.SUPERVISOR) return family === AlertFamily.MTTO;
  if (rol === Rol.LOGISTICA) return family === AlertFamily.FLOTA;
  return false;
}

export function listVisibleTypes(
  types: AlertTypeRecord[],
  rol: Rol,
): AlertTypeRecord[] {
  return types.filter((row) => {
    if (!familyVisibleToRole(row.family, rol)) return false;
    if (!row.active && rol !== Rol.ADMIN_DIRECTIVO) return false;
    return true;
  });
}

export function isKnownFamily(value: string): value is AlertFamily {
  return value === AlertFamily.MTTO || value === AlertFamily.FLOTA;
}

export function isKnownOwningModule(value: string): value is AlertOwningModule {
  return (
    value === AlertOwningModule.ANDON ||
    value === AlertOwningModule.INVENTARIO ||
    value === AlertOwningModule.SALUD ||
    value === AlertOwningModule.ALERTAS ||
    value === AlertOwningModule.OTRO
  );
}

export function isKnownThresholdMode(value: string): value is ThresholdMode {
  return value === ThresholdMode.MODULE || value === ThresholdMode.CATALOG;
}
