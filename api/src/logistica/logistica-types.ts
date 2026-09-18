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
