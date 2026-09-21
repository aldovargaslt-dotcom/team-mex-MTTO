export const ALERT_CATALOG_SCHEMA = 'alert_catalog';

export const AlertFamily = {
  MTTO: 'MTTO',
  FLOTA: 'FLOTA',
} as const;
export type AlertFamily = (typeof AlertFamily)[keyof typeof AlertFamily];

export const AlertOwningModule = {
  ANDON: 'ANDON',
  INVENTARIO: 'INVENTARIO',
  SALUD: 'SALUD',
  ALERTAS: 'ALERTAS',
  OTRO: 'OTRO',
} as const;
export type AlertOwningModule =
  (typeof AlertOwningModule)[keyof typeof AlertOwningModule];

export const ThresholdMode = {
  MODULE: 'MODULE',
  CATALOG: 'CATALOG',
} as const;
export type ThresholdMode = (typeof ThresholdMode)[keyof typeof ThresholdMode];

export const SEED_ALERT_CODES = {
  MTTO_VENCIDO: 'MTTO_VENCIDO',
  STOCK_BAJO: 'STOCK_BAJO',
  SALUD_UMBRAL: 'SALUD_UMBRAL',
  FLOTA_SIN_REGRESO: 'FLOTA_SIN_REGRESO',
} as const;

export type SeedAlertCode =
  (typeof SEED_ALERT_CODES)[keyof typeof SEED_ALERT_CODES];

export type AlertTypeRecord = {
  code: string;
  label: string;
  family: AlertFamily;
  owningModule: AlertOwningModule;
  thresholdMode: ThresholdMode;
  active: boolean;
  seeded: boolean;
};

export const SEED_ALERT_TYPES: AlertTypeRecord[] = [
  {
    code: SEED_ALERT_CODES.MTTO_VENCIDO,
    label: 'Mantenimiento vencido',
    family: AlertFamily.MTTO,
    owningModule: AlertOwningModule.ANDON,
    thresholdMode: ThresholdMode.MODULE,
    active: true,
    seeded: true,
  },
  {
    code: SEED_ALERT_CODES.STOCK_BAJO,
    label: 'Stock bajo',
    family: AlertFamily.MTTO,
    owningModule: AlertOwningModule.INVENTARIO,
    thresholdMode: ThresholdMode.MODULE,
    active: true,
    seeded: true,
  },
  {
    code: SEED_ALERT_CODES.SALUD_UMBRAL,
    label: 'Salud de unidad',
    family: AlertFamily.MTTO,
    owningModule: AlertOwningModule.SALUD,
    thresholdMode: ThresholdMode.MODULE,
    active: true,
    seeded: true,
  },
  {
    code: SEED_ALERT_CODES.FLOTA_SIN_REGRESO,
    label: 'Sin regreso',
    family: AlertFamily.FLOTA,
    owningModule: AlertOwningModule.ALERTAS,
    thresholdMode: ThresholdMode.CATALOG,
    active: true,
    seeded: true,
  },
];
