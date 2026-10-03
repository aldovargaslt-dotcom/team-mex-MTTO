import type { InsuranceStatus } from '../vehicle-documents/vehicle-insurance.rules';

export type TowerUrgency = 'CRITICAL' | 'ATTENTION' | 'NORMAL';
export type TowerReadiness = 'LISTA' | 'PENDIENTE' | 'BLOQUEADA' | 'DESPACHADA';
export type TowerCheckState =
  'APTA' | 'APTA_CON_OBSERVACION' | 'NO_APTA' | 'EN_PROGRESO' | 'REQUERIDO';

export type TowerCause = {
  code: string;
  severity: Exclude<TowerUrgency, 'NORMAL'>;
  message: string;
  blocking: boolean;
};

type PhysicalKnown = {
  physicalKnowledge: 'KNOWN';
  physicalState: 'EN_PATIO' | 'EN_RUTA' | 'EN_TALLER' | 'INACTIVA';
  physicalSource: 'FLOTA_MOVEMENT' | 'FLOTA_TRANSITION';
  version: number;
  observedAt: Date;
  operationalInconsistency: boolean;
};

type PhysicalUnknown = {
  physicalKnowledge: 'UNAVAILABLE' | 'UNINITIALIZED';
  physicalState: null;
};

export type TowerInput = {
  unidadId: string;
  identification: { numeroInterno: string; placas: string };
  physical: PhysicalKnown | PhysicalUnknown;
  journey: {
    inRoute: boolean;
    salidaAt: Date | null;
    returnDueAt: Date | null;
  };
  insurance: {
    status: InsuranceStatus;
    operationalDate: string;
    documentId?: string | null;
    version?: number | null;
    expirationDate?: string | null;
    reason: string | null;
  };
  check: {
    activeCheck: {
      checkId: string;
      status: string;
      version: number;
      startedAt: Date | null;
    } | null;
    lastCompleted: {
      checkId: string;
      snapshotHash: string;
      result: 'FIT' | 'FIT_WITH_OBSERVATION' | 'UNFIT';
      valid: boolean;
      reason: string | null;
      version: number;
      dayEndInstant: Date;
    } | null;
  };
  maintenanceBlocking: boolean;
  now: Date;
  urgencyConfig: { attentionWindowSeconds: number; version: number };
  calendarAvailable?: boolean;
};

export function configuredUrgency(
  overdueSeconds: number,
  attentionWindowSeconds: number,
): Exclude<TowerUrgency, 'NORMAL'> | null {
  if (overdueSeconds <= 0) return null;
  return overdueSeconds <= attentionWindowSeconds ? 'ATTENTION' : 'CRITICAL';
}

function maxUrgency(causes: TowerCause[]): TowerUrgency {
  if (causes.some((cause) => cause.severity === 'CRITICAL')) return 'CRITICAL';
  if (causes.some((cause) => cause.severity === 'ATTENTION'))
    return 'ATTENTION';
  return 'NORMAL';
}

export function composeTowerRow(input: TowerInput) {
  const activeCauses: TowerCause[] = [];
  const staleSources: string[] = [];
  const add = (cause: TowerCause) => activeCauses.push(cause);

  if (input.calendarAvailable === false) {
    staleSources.push('FACILITY_CALENDAR');
    add({
      code: 'FACILITY_CONFIGURATION_REQUIRED',
      severity: 'CRITICAL',
      message: 'Falta la configuración de facility y calendario operativo.',
      blocking: true,
    });
  }

  if (input.physical.physicalKnowledge !== 'KNOWN') {
    staleSources.push('PHYSICAL_STATE');
    add({
      code: 'PHYSICAL_SOURCE_UNAVAILABLE',
      severity: 'CRITICAL',
      message: 'No hay una fuente física confiable para la unidad.',
      blocking: true,
    });
  } else {
    if (
      input.physical.physicalState === 'EN_TALLER' ||
      input.physical.physicalState === 'INACTIVA'
    ) {
      add({
        code: 'PHYSICAL_NOT_READY',
        severity: 'CRITICAL',
        message:
          input.physical.physicalState === 'EN_TALLER'
            ? 'La unidad está registrada en taller.'
            : 'La unidad está físicamente inactiva.',
        blocking: true,
      });
    }
    if (input.physical.operationalInconsistency) {
      add({
        code: 'PHYSICAL_JOURNEY_CONFLICT',
        severity: 'CRITICAL',
        message: 'La custodia de patio y el viaje de Logística no coinciden.',
        blocking: true,
      });
    }
  }

  if (input.insurance.status === 'SOURCE_UNAVAILABLE') {
    staleSources.push('VEHICLE_DOCUMENTS');
    add({
      code: 'POLICY_SOURCE_UNAVAILABLE',
      severity: 'CRITICAL',
      message: 'No fue posible verificar la póliza.',
      blocking: true,
    });
  } else if (input.insurance.status === 'MISSING') {
    add({
      code: 'MISSING_INSURANCE',
      severity: 'CRITICAL',
      message: 'Falta la póliza de seguro vigente.',
      blocking: true,
    });
  } else if (input.insurance.status === 'EXPIRED_OR_EXPIRES_TODAY') {
    add({
      code: 'INVALID_INSURANCE',
      severity: 'CRITICAL',
      message: 'La póliza venció o vence hoy.',
      blocking: true,
    });
  }

  let checkState: TowerCheckState = 'REQUERIDO';
  if (input.check.activeCheck) {
    checkState = 'EN_PROGRESO';
    add({
      code: 'CHECK_IN_PROGRESS',
      severity: 'ATTENTION',
      message: 'El CHECK todavía está en progreso.',
      blocking: false,
    });
  } else if (input.check.lastCompleted?.valid) {
    if (input.check.lastCompleted.result === 'UNFIT') {
      checkState = 'NO_APTA';
      add({
        code: 'CHECK_UNFIT',
        severity: 'CRITICAL',
        message: 'El último CHECK vigente resultó no apto.',
        blocking: true,
      });
    } else if (input.check.lastCompleted.result === 'FIT_WITH_OBSERVATION') {
      checkState = 'APTA_CON_OBSERVACION';
      add({
        code: 'CHECK_OBSERVATION',
        severity: 'ATTENTION',
        message: 'El CHECK vigente tiene observaciones.',
        blocking: false,
      });
    } else checkState = 'APTA';
  } else {
    add({
      code: 'CHECK_REQUIRED',
      severity: 'ATTENTION',
      message: 'Se requiere un CHECK firmado y vigente.',
      blocking: false,
    });
  }

  if (input.maintenanceBlocking) {
    add({
      code: 'MAINTENANCE_BLOCKING',
      severity: 'CRITICAL',
      message: 'Existe mantenimiento marcado como bloqueante.',
      blocking: true,
    });
  }

  if (input.journey.inRoute && input.journey.returnDueAt) {
    const overdueSeconds = Math.floor(
      (input.now.getTime() - input.journey.returnDueAt.getTime()) / 1000,
    );
    const severity = configuredUrgency(
      overdueSeconds,
      input.urgencyConfig.attentionWindowSeconds,
    );
    if (severity) {
      add({
        code: 'RETURN_OVERDUE',
        severity,
        message: 'El regreso está vencido respecto a la hora esperada.',
        blocking: false,
      });
    }
  }

  const hardBlocked = activeCauses.some((cause) => cause.blocking);
  const checkPending = activeCauses.some((cause) =>
    ['CHECK_REQUIRED', 'CHECK_IN_PROGRESS'].includes(cause.code),
  );
  const readiness: TowerReadiness = input.journey.inRoute
    ? 'DESPACHADA'
    : hardBlocked
      ? 'BLOQUEADA'
      : checkPending
        ? 'PENDIENTE'
        : 'LISTA';

  return {
    unidadId: input.unidadId,
    identification: input.identification,
    physicalKnowledge: input.physical.physicalKnowledge,
    physicalState: input.physical.physicalState,
    physicalSource:
      input.physical.physicalKnowledge === 'KNOWN'
        ? input.physical.physicalSource
        : null,
    operationalInconsistency:
      input.physical.physicalKnowledge === 'KNOWN'
        ? input.physical.operationalInconsistency
        : false,
    readiness,
    checkState,
    urgency: maxUrgency(activeCauses),
    activeCauses,
    activeCheck: input.check.activeCheck,
    lastValidCheck: input.check.lastCompleted,
    insurance: input.insurance,
    asOf: input.now.toISOString(),
    sourceVersions: {
      physical:
        input.physical.physicalKnowledge === 'KNOWN'
          ? input.physical.version
          : null,
      insurance: input.insurance.version ?? null,
      check:
        input.check.lastCompleted?.version ??
        input.check.activeCheck?.version ??
        null,
      urgency: input.urgencyConfig.version,
    },
    staleSources,
  };
}
