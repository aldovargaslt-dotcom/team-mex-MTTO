# Unidades readiness — contrato de ejecución EWO-056

Autorización de build: usuario 2026-10-17. Complementa la SPEC UR-*, sin nuevo BC.

- GET /unit-readiness: actor confiable SUPERVISOR/Admin; scope por facility,
  filtros q/tipo/estado/usage/attention/checkState y offset/limit (1–100).
  Prioridad global antes de paginar; conteos y stockCritical del mismo snapshot.
- GET /unit-readiness/:id: mismo scope, también mecánico/Logística para contexto
  operativo autorizado, con órdenes, ABC y retenciones. Lecturas no conceden cierre.
- PUT /unit-readiness/settings: Admin, facility, scope FLEET/CATEGORY/UNIT,
  target, expectedVersion, interval nullable, usage nullable. Versión 0 crea;
  null hereda. Serializar por facility para evitar cambios de política durante
  review/sign. Eventos auditados; valores positivos y target perteneciente al scope.
- Retención nueva requiere OT de esa unidad, actor mecánico o Logística, razón e
  idempotencyKey. No altera orden, viaje ni dictamen ABC histórico.
- Verificación mecánico requiere OT cerrada, retención de esa OT, observación
  personal, firma PNG no vacía, IDs/versiones actuales e idempotencyKey. Resuelve
  solo retenciones seleccionadas y conserva originales. Bloqueos no elegibles
  siguen visibles. Evidencia/firma personal no sustituye ABC vigente.
- Política capturada al review: daily siguiente día local; weekly +7 días locales;
  monthly +1 mes local con clamp; custom 1–8760 horas. Validez [reviewAt,dueAt).
  Complete revalida versión de política; config cambiada exige review nuevamente.
- Mantener dayEndInstant como deadline firmado para compatibilidad; JSON adicional
  validityPolicy guarda versión/origen/anclaje. Legacy null conserva deadline
  previo. Ningún lector invalida por operationalDate distinto si deadline vigente.
- Listado lee unidades/settings/revisiones/órdenes/retenciones en lotes, nunca un
  hub por fila. Andon se consume por servicio de su dueño, sin JOIN cruzado.
- Fallos de fuentes secundarias explícitos; sin evidencia requerida no hay Apta.
  Todo writer revalida actor/scope y serializa con UnitOperationCoordinator.

Migración aditiva independiente incluida en orders:migration:up, sincronización
prohibida para despliegue. Instalación/activación en otros ambientes separada.

## Detalles de ejecución consolidados

- Generación programada: ledger `check_readiness_generations` por unidad/período
  debido; usa exclusión transaccional por unidad también frente a creación manual.
  Firma vigente reutilizada hasta su deadline; período inicial por jornada, períodos
  siguientes por revisión previa y vencimiento/invalidación. No renueva un firmado.
  El adaptador se invoca según la programación operativa existente; no instala un
  daemon externo nuevo ni garantiza frecuencia de invocación del despliegue.
- GET /unit-readiness/:id/history pagina revisiones concluidas con offset/limit.
- GET /unit-readiness/:id/assignees publica solo subject/nombre de mecánicos activos
  de ese facility a Supervisor; Auth conserva su directorio y control de acceso.
- POST /unit-readiness/:id/orders/:orderId/assign requiere versión esperada;
  registra antes/después. Esta asignación no es la asignación futura de chofer.
- Evidencia de verificación personal permanece privada en la base de datos,
  con firma PNG validada y hash, actor y contenido original. No modifica ABC firmado
  ni resuelve invalidaciones globales previas o motivos ajenos.

### Presentación de foto — EWO-059

Snapshot incluye `fotoDataUrl` nullable de Unidad para reconocerla en lista;
misma autorización/scope y paginación. No se genera evidencia nueva ni se usa foto
para inferir aptitud. Imagen ausente/fallida tiene fallback visual de tipo.

## Sustitución vigente — ADR029 / EWO-060

Programación efectiva DAILY y uso universal; valores históricos no gobiernan.
PUT settings devuelve410 tras validar identidad/scope; no modifica historia.
Query usage heredada se acepta pero no reduce resultados (Stock/Unclassified no
ocultan unidades). UI deja de enviarla. Snapshot conserva forma compatible con
usage DAILY y contadores Stock/Unclassified0. Validez operativa se limita a fin de
jornada de revisión sin reescribir firmas; detalle publica deadline efectivo y
signedDayEndInstant original. Generación idempotente por unidad/jornada con worker
interno y apagado explícito CHECK_DAILY_ENABLED=false; elegibilidad previa intacta.
