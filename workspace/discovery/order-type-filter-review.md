# Revisión — filtro de tipos en Órdenes

2026-10-12. Usuario solicita Correctivo/Preventivo/Revisión e identifica Revisión con checklist/ABC(S) operativo de choferes.

## Modelo encontrado

SPEC-CHK-001 §2.1 y ADR016: Visita/OT con CHECK, PREVENTIVE y CORRECTIVE.
Contrato CHK-001: CHECK_COMPLETED separado de VisitaCerrada. CHECK no consume
inventario ni representa mantenimiento realizado. A–E del mantenimiento son
trabajos, no el tipo CHECK. Plan-bandeja-mecanico-v1 llama Chequeos a ABC pre-salida.

Alias UI aprobado por usuario: Revisión→CHECK, Preventivo→PREVENTIVE
(legacy PREDICTIVO), Correctivo→CORRECTIVE (legacy CORRECTIVO).
Estados CHECK propios: PENDING/ASSIGNED/IN_PROGRESS/COMPLETED/CANCELLED;
resultado FIT/FIT_WITH_OBSERVATION/UNFIT separado del estado.

## Estado de código verificado

Órdenes lista por /unidades/:id/visitas. VisitasService.listByUnidad excluye CHECK
por workOrderType en maintenanceTypes. El filtro ya ofrece Todos/Preventivo/
Correctivo, usa TipoVisita legacy y no puede representar Revisión.
GET /checks devuelve cola canónica, con paginación/contadores y scope de patio.
CanonicalOrdersService.list autoriza Mecánico/Logística/Admin para CHECK;
Supervisor/Admin para mantenimiento. Supervisor no puede leer CHECK hoy.

Documentos Slice0 aún dicen target/no implementado; EWO022 posterior registra
implementación local2026-10-03 y el código actual confirma el flujo. No confundir
estado histórico de diseño con capacidad desplegada: no se verificó producción.

## Decisión resuelta

Usuario responde «Sí, Supervisor puede consultarlos». EWO031 implementa consulta
de lista/resumen de CHECK, conserva writers y scope y documenta evidencia.
