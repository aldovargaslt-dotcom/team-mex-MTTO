export type OpsChofer = 'DISPONIBLE' | 'EN_RUTA';

export type ChipLogistica = 'DISPONIBLE' | 'EN_RUTA' | 'TODOS';

export type LogisticaChoferRow = {
  choferId: string;
  nombre: string;
  ops: OpsChofer;
  unidadId?: string;
  placas?: string;
};

export interface UnidadChoferAssignmentPort {
  assign(unidadId: string, choferId: string): Promise<void>;
  unassign(unidadId: string): Promise<void>;
}

export const UNIDAD_CHOFER_ASSIGNMENT_PORT = Symbol(
  'UnidadChoferAssignmentPort',
);

export type ChipLogisticaUnidad = 'EN_RUTA' | 'DISPONIBLE' | 'TODAS';

export type AmbitoFlota = 'FORANEO' | 'LOCAL';

export type RegistrarSalidaInput = {
  ambito: AmbitoFlota;
  destino?: string;
  choferId?: string;
};

/** Frozen ADR-010 envelope. */
export type FlotaSinRegresoAbierto = {
  eventId: string;
  eventType: 'FLOTA_SIN_REGRESO';
  unidadId: string;
  ambito: AmbitoFlota;
  salidaAt: string;
  thresholdHoras: number;
  elapsedHoras: number;
  occurredAt: string;
  numeroInterno?: string | null;
  placas?: string | null;
};

export interface FlotaSinRegresoPort {
  onAbierto(event: FlotaSinRegresoAbierto): Promise<void>;
  onCerrado(unidadId: string): Promise<void>;
}

export const FLOTA_SIN_REGRESO_PORT = Symbol('FlotaSinRegresoPort');

export type LogisticaUnidadRow = {
  unidadId: string;
  placas: string;
  numeroInterno: string;
  choferNombre: string | null;
  opsEstado: 'EN_RUTA' | 'DISPONIBLE';
  ambito: AmbitoFlota;
  destino: string | null;
  salidaAt: string | null;
  alerta: 'SIN_REGRESO' | null;
};
