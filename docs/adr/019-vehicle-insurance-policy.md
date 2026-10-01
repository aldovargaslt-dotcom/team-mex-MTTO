# ADR-019 — Documentos de unidad mínimos y póliza de seguro

## Status

Accepted — owner D09, 2026-10-01. Contrato de ownership y puerto para revisión, no implementación.

## Context

No hay implementación póliza en el checkout. “Preservar regla póliza” en el handoff requiere introducir capacidad mínima, no asumir validación existente.

## Decision

- Capacidad desacoplada Vehicle Documents, preparada para futura Master Data sin implementar su catálogo completo. V1 sólo POLIZA_SEGURO.
- Dueño técnico propuesto: módulo delgado `api/src/vehicle-documents`, schema `vehicle_documents`, bajo capacidad documental compartida; no afirmar nuevo BC.
- unidad_id opaco, sin FK/JOIN hacia Kernel ni Flota. El módulo documental es único escritor de registros/versiones de póliza; readiness y movimientos leen por VehicleInsurancePolicyPort.
- Campo expiration_date DATE. Missing o expiration_date <= fecha operativa actual de facility bloquea duramente nuevas salidas. No gracia de un día ni fecha del browser/host.
- Reemplazo de póliza produce nueva versión; no modifica snapshot de CHECK firmado. No se vuelve a exigir un CHECK sólo porque cambia documento si no se invalidó por causa autorizada.
- V1 documento no válido o fuente no disponible nunca permite autorizar salida. Error técnico se muestra como SOURCE_UNAVAILABLE, no se etiqueta falsamente como póliza vencida.
- Admin mantiene documentos/configuración; Logística y mecánico autorizado leen vigencia mínima para su trabajo, sin editar documentos desde formulario técnico.
- Puertos aceptan contexto transaccional para coordinar revalidación con salida. Registros mínimos y consulta por lote; sin copia de tablas de unidad.

## Data / contract

Registro: id, unidad_id, document_type=POLIZA_SEGURO, expiration_date, version, issuer/reference opcionales, createdAt/createdBy, supersedesId. Una versión actual por unidad+tipo; historial inmutable de sustituciones. ObjectKey opcional si se adjunta documento, usando storage privado; V1 no exige catálogo general ni captura de imagen para decidir vigencia.

Response: PRESENT_VALID / MISSING / EXPIRED_OR_EXPIRES_TODAY / SOURCE_UNAVAILABLE, operationalDate, documentId/version y razones. Al leer referencias, validar existencia de Unidad vía puerto, no FK cross-schema. Contrato/API candidata en documento enlazado.

## Alternatives Considered

Campo póliza dentro de Unidad: acopla futura Master Data. Servicio externo obligatorio sin disponible: no demostrable. Catálogo documental completo: fuera de alcance.

## Consequences / Risks

Nuevo schema necesita migration, guards y fuente configurada; historicos no inventan pólizas. Durante despliegue no activar salidas hasta completar documentación. Estado fuente desconocido no se interpreta como válido.

## Follow-up

Datos de póliza reales y configuración facility/date son inputs de habilitación. Proteger ambos gateways de salida; no bloquear ENTRADA/retorno por póliza que expiró.

## Related Artifacts

[Contrato](../contracts/CHK-001-contract.md), [SPEC](../specs/SPEC-CHK-001.md), [ADR-017](017-check-movement-seam.md), [ADR-002](002-schema-per-module.md).

## Ownership

Capacidad compartida documental, provisional; integración Kernel/Logística/Flota por puertos. Owner aprobó D09 el 2026-10-01; esquema/nombres técnicos detallados quedan para revisión Slice 0.


## Approved addendum — R01–R05 / Slice0 approval (2026-10-01)

Este addendum conserva el cuerpo histórico; sustituye sus referencias a revisión/decisiones R pendientes conforme a aprobación actual. No autoriza implementar.

### R01 / approval supplement

Contrato documental aprobado como parte Slice0. Fecha operativa actual del facility del vehículo usa America/Mexico_City y día calendario local. Póliza faltante o expiration_date<=esa fecha bloquea salida; ni UTC del host ni fecha del navegador. Config facility y documentos reales se provisionan por su dueño, sin backfill ficticio. Port adapter comparte contexto de fecha con departure/CHECK.
