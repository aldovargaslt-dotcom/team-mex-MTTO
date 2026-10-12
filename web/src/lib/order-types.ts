export type CheckOrderStatus = 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type CheckOrderSummary = {
  id: string; unidadId: string; type: 'CHECK'; status: CheckOrderStatus;
  unit: { numeroInterno: string; placas: string };
  createdAt: string;
};
export type CheckOrderDetail = CheckOrderSummary & {
  source: string; operationalDate: string;
  result: 'FIT' | 'FIT_WITH_OBSERVATION' | 'UNFIT' | null;
  completedAt: string | null;
  validity: { valid: boolean; expired: boolean; invalidated: boolean } | null;
};
export const CHECK_STATUS_LABEL: Record<CheckOrderStatus, string> = {
  PENDING: 'Pendiente', ASSIGNED: 'Asignada', IN_PROGRESS: 'En curso',
  COMPLETED: 'Concluida', CANCELLED: 'Cancelada',
};
export const CHECK_SOURCE_LABEL: Record<string, string> = {
  DAILY_AUTOMATIC: 'Chequeo diario', LOGISTICS_MANUAL: 'Solicitada por Logística',
  CHECK_OUT: 'Chequeo de salida', CHECK_IN: 'Chequeo de retorno', REINSPECTION: 'Reinspección',
};
export const CHECK_RESULT_LABEL = {
  FIT: 'Apta', FIT_WITH_OBSERVATION: 'Apta con observación', UNFIT: 'No apta',
};
