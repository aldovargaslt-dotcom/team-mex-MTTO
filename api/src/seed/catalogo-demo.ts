import { IconoTipoVehiculo } from '../unidades/icono-tipo-vehiculo.enum';

/** Ops groups (not vehicle models). Exact strings — Slice 1 catalog. */
export const TIPO_STOCK = 'STOCK';
export const TIPO_RUTAS = 'RUTAS';
export const TIPO_CAMIONES_3_Y_MEDIA = 'CAMIONES 3 Y MEDIA';

export const TIPOS_DEMO = [
  { nombre: TIPO_STOCK, icono: IconoTipoVehiculo.VAN },
  { nombre: TIPO_RUTAS, icono: IconoTipoVehiculo.VAN },
  { nombre: TIPO_CAMIONES_3_Y_MEDIA, icono: IconoTipoVehiculo.TRUCK },
] as const;

export const CHOFERES_DEMO = [
  'WERO',
  'DON NOE',
  'DON MIGUEL',
  'JULIO',
  'JOEL',
  'BRYAN',
  'RUBEN',
] as const;

export type UnidadDemoSeed = {
  nombre: string;
  placas: string;
  tipoNombre: string;
  choferNombre: (typeof CHOFERES_DEMO)[number] | null;
};

export const UNIDADES_DEMO: readonly UnidadDemoSeed[] = [
  {
    nombre: 'FOTON',
    placas: 'VU2625C',
    tipoNombre: TIPO_STOCK,
    choferNombre: null,
  },
  {
    nombre: 'NISSAN REDILAS',
    placas: 'VU2632C',
    tipoNombre: TIPO_STOCK,
    choferNombre: null,
  },
  {
    nombre: 'URVAN',
    placas: 'VU2629C',
    tipoNombre: TIPO_STOCK,
    choferNombre: null,
  },
  {
    nombre: 'NISSAN CERRADA',
    placas: 'VU2630C',
    tipoNombre: TIPO_RUTAS,
    choferNombre: 'WERO',
  },
  {
    nombre: 'URVAN 2018',
    placas: 'VU2634C',
    tipoNombre: TIPO_RUTAS,
    choferNombre: 'DON NOE',
  },
  {
    nombre: 'TOYOTA 2017',
    placas: 'VU2628C',
    tipoNombre: TIPO_RUTAS,
    choferNombre: 'DON MIGUEL',
  },
  {
    nombre: 'DUCATO 2021',
    placas: 'VU2626C',
    tipoNombre: TIPO_RUTAS,
    choferNombre: 'JULIO',
  },
  {
    nombre: 'TRANSIT 2023',
    placas: 'WH9236C',
    tipoNombre: TIPO_RUTAS,
    choferNombre: 'JOEL',
  },
  {
    nombre: 'DUCATO 2023',
    placas: 'VU2627C',
    tipoNombre: TIPO_RUTAS,
    choferNombre: 'BRYAN',
  },
  {
    nombre: 'RAM CODISA',
    placas: 'VU2622C',
    tipoNombre: TIPO_CAMIONES_3_Y_MEDIA,
    choferNombre: null,
  },
  {
    nombre: 'RAM FORANEO',
    placas: '63AL5K',
    tipoNombre: TIPO_CAMIONES_3_Y_MEDIA,
    choferNombre: null,
  },
  {
    nombre: 'FORD 2017',
    placas: 'VU2624C',
    tipoNombre: TIPO_CAMIONES_3_Y_MEDIA,
    choferNombre: 'RUBEN',
  },
  {
    nombre: 'CHATO NUEVO',
    placas: 'WR2023C',
    tipoNombre: TIPO_CAMIONES_3_Y_MEDIA,
    choferNombre: null,
  },
];

/** Previous placeholder seed — retired on upsert so a reused demo DB matches Aldo. */
export const LEGACY_TIPOS_DEMO = ['Camión', 'Camioneta', 'Van'] as const;
export const LEGACY_CHOFERES_DEMO = [
  'Juan Pérez',
  'María López',
  'Carlos Ruiz',
] as const;
export const LEGACY_UNIDADES_PLACAS = [
  'TMX-101-A',
  'TMX-102-B',
  'TMX-103-C',
] as const;

/** Unit that carries the demo VisitaCerrada so Andon opens on a fresh DB. */
export const UNIDAD_ANDON_DEMO = 'FOTON';
export const PLACAS_ANDON_DEMO = 'VU2625C';
export const UNIDAD_SEGUNDA_DEMO = 'NISSAN REDILAS';
export const CHOFER_ANDON_DEMO = 'WERO';
export const CHOFER_SEGUNDO_DEMO = 'DON NOE';
