# ADR-017 — CHECK firmado y seam de salidas Flota/Logística

## Status

Accepted — owner D01/D02/D05/D06/D10/D11/D14, 2026-10-01. Detalles de contratos entregados para revisión; implementación pendiente.

## Context

Flota conserva SALIDA/ENTRADA con CHOFER+AVAL. Logística conserva su journey EN_RUTA/DISPONIBLE. ADR-008/011 separan ambos ciclos. El dashboard actual está en /logistica y /flota es Movimientos.

## Decision

- Mantener ambos ciclos independientes. CHECK no reemplaza CHOFER/AVAL ni sincroniza ops_estado con patio.
- Ambos commands de salida aplicables validan CHECK firmado vigente y documentación mediante puertos server-side. La UI no autoriza salida.
- Un DAILY_AUTOMATIC válido satisface posteriores CHECK_OUT dentro de su misma jornada; una salida no crea CHECK nuevo si puede reusar ese resultado.
- Validez depende de operational_date y timezone configurada de instalación/negocio, termina al finalizar jornada. No TTL de 24h; expiración no genera invalidación.
- No hay CHECK vigente cuando está incompleto, sin firma, expirado o invalidado. Un CHECK vigente UNFIT tampoco permite salir. No se debe confundir “vigente” con “apto”.
- CHECK completado se invalida mediante evento por incidente/daño, nueva anomalía de seguridad, invalidación autorizada Mecánico/Logística con motivo, o mantenimiento finalizado explícitamente marcado requires_reinspection. Se preserva el snapshot.
- Torre es read model compuesto: physicalState, readiness, checkState, urgency, activeCauses y asOf independientes. EN_TALLER proviene de transición/fuente explícita, jamás de existencia de CORRECTIVE.
- Readiness EN_RUTA se representa Despachada. Bloqueos activos siguen visibles como causas/urgencia, sin reescribir custodia ni ignorarse para próxima salida.
- Urgency es max severidad de causas activas: CRITICAL por blocker duro/UNFIT/documento requerido inválido/regreso críticamente vencido; ATTENTION por CHECK requerido/en curso/FIT_WITH_OBSERVATION/regreso no crítico u otra atención no bloqueante; NORMAL sin causas. Umbrales temporales son configuración.
- Mantener /logistica dashboard/Torre y /flota movimientos. Esta decisión aclara/sustituye sólo la restricción histórica de navegación exclusiva /flota; no altera ownership ni la independencia de ADR-011.

## Seam / ownership

Mantenimiento expone SignedCheckReadPort; documentos exponen VehicleInsurancePolicyPort; Logística compone readiness. Flota y Logística consumen una validación coordinada de salida, sin JOIN/FK SQL cruzada. La operación conserva checkId, snapshotHash y versiones de políticas consultadas. Read model no es autorización.

Una coordinación transaccional por unidad serializa salida con invalidación, bloqueos y cambios documentales, usando un lock común y puertos que aceptan el mismo transaction context del monolito. No mutar tablas de otro módulo. Revalidar fecha y fuentes en el punto de commit; cualquier failure impide registrar salida. El contrato detalla orden de locks.

Datos históricos sin fuente física explícita se representan UNKNOWN en el contrato de lectura, sin inventar EN_PATIO/EN_TALLER. Selección de fuente/transiciones se lista como R04, no se deriva de una correctiva.

## Alternatives Considered

Firma mecánica sustituye AVAL; unir loops; autorizar con resultado cacheado de UI; TTL24h: rechazadas por owner.

## Consequences / Risks

Dos gateways de salida deben protegerse, preservar retorno y revalidar bajo concurrencia. CHECK válido se puede reutilizar, pero vigencia y aptitud son conceptos diferentes. Histórico sin referencia sigue legible; nuevas salidas requieren contrato completo.

## Follow-up

Resolver configuración y scopes R01–R05 antes de sus slices. Conservar entrada/retorno aun si póliza expiró, sin bypass de firmas de patio. Definir vínculo CHECK_IN sin bloquear retorno físico.

## Related Artifacts

[Contrato](../contracts/CHK-001-contract.md), [SPEC](../specs/SPEC-CHK-001.md), [ADR-008](008-flota-schema.md), [ADR-011](011-logistica-flota-ops-estado.md), [ADR-019](019-vehicle-insurance-policy.md).

## Ownership

Mantenimiento / Flota / Logística; aprobación owner 2026-10-01, Slice 0 únicamente.


## Approved addendum — R01–R05 / Slice0 approval (2026-10-01)

Este addendum conserva el cuerpo histórico; sustituye sus referencias a revisión/decisiones R pendientes conforme a aprobación actual. No autoriza implementar.

### R01/R04/R05 / approval supplement

Paquete técnico aprobado; los follow-ups R01–05 del cuerpo anterior son históricos y se sustituyen por políticas adoptadas. Flota/Patio es único dueño de physical state (EN_PATIO/EN_RUTA/EN_TALLER/INACTIVA) y su ledger/transición registrada. Kernel ACTIVA/INACTIVA permanece disponibilidad administrativa; journey independiente. EN_TALLER nunca se infiere de CORRECTIVE. Inconsistencia explícita entre fuentes, sin sync automática. Físico desconocido se devuelve physicalState=null con physicalKnowledge=UNAVAILABLE/UNINITIALIZED; UNKNOWN no es quinto estado operacional.

Calendar V1 America/Mexico_City, local midnight→next midnight. Validity no TTL; fixture/históricos no inventan estado/facility. Urgency configurable overdue positivo <=7200s ATTENTION, >7200s CRITICAL; cero no vencido. El retraso se calcula sobre returnDueAt si fuente aprobada lo provee, o baseline configurable vigente sin-regreso (salidaAt+umbral de duración) del loop Logística actual. Dos horas son escalación después del vencimiento, nunca dos horas desde la salida. Valores baseline actuales no se cambian implícitamente. Source unavailable no se considera NORMAL con certainty ni Lista.
