# ADR-030 — Contratos y persistencia del análisis de mantenimiento

## Status

### Autorización posterior de construcción

El propietario indicó: «After you finish, go ahead and build, if there are pending
decisions, pass them trough grillme and do the recommendations». Se acepta esta
opción para implementación local mediante EWO-063 y se autoriza aplicar las
recomendaciones técnicas documentadas. Los párrafos Proposed siguientes conservan
historia; esta enmienda prevalece en el alcance construido. No autoriza migración
externa, push ni deploy. No reabrir decisiones operativas ya resueltas.

**Proposed para revisión técnica**. Producto y tres decisiones operativas
confirmados por el propietario: «Tus recomendaciones son bastante acertadas,
sigamos con estas para cerrar los contratos». Se documenta una opción técnica
completa; no registrar aprobación de arquitectura/ejecución que no se ha dado.
Sin código, migraciones ni despliegue. Fecha cliente2026-10-18.

## Context

SPEC-AN-MTTO-001 añade servicios externos generales, horarios esperados y cuatro
vistas. ADR025 conserva autoridad de motivos/liberación; ADR026 conserva costos
y stock en Inventario. La decisión de actor de captura no asigna por sí sola
ownership de tablas. Hace falta una frontera trazable para contratos ejecutables.

## Decision propuesta

1. Mantenimiento implementaría captura económica de servicio externo, catálogo
   de trabajo/intervención y proyección analítica en su área existente. Tablas
   `public.maintenance_*` dentro del monolito; no nuevo schema ni BC. Supervisor
   captura/completa pendientes; Admin corrige con motivo. Logística conserva
   finalización operativa; la fecha económica no la sustituye.
2. Horario esperado se conserva como política de planificación de Mantenimiento,
   Admin configura y Supervisor consulta. No es calendario de ABC ni política de
   salida. Nunca editar `FacilityCalendar` para cambiar utilización.
3. Inventario conserva operaciones de costo/retorno y valoración (ADR026).
   Exposición mediante puerto scoped, paginado y versionado; Mantenimiento no
   corrige stock ni escribe tablas de Inventario. Vinculación de componente
   incluido solo determina contribución de reporte, conservando evidencia original.
4. Proyección con capturas versionadas por fuente, invalidación durable y snapshot
   de consulta de vida limitada. Validar derechos al crear y leer snapshot. Ningún
   snapshot se usa para readiness/seguridad. Sin JOIN/FK entre schemas.
5. Contratos v1 detallados en
   [AN-MTTO-001-technical](../contracts/AN-MTTO-001-technical.md). Límites técnicos
   son decisiones de diseño revisables, no garantías de rendimiento observado.

## Alternatives Considered

- Guardar servicio como pieza en Inventario: confunde cantidad/stock con servicio,
  amplía ownership y permite consumo ficticio. No elegido.
- Crear módulo/schema de contabilidad o BI: fuera de alcance y nueva frontera sin
  necesidad; no elegido.
- Usar calendario ABC como horario laboral: altera seguridad y vigencia de revisión;
  no elegido.
- Calcular todo en navegador o consultar tablas cruzadas: contradice scope,
  conciliación, volúmenes y ADR002; no elegido.
- Reportes siempre live de fuentes mutables sin snapshot: menor persistencia pero
  permite que total y detalle pertenezcan a revisiones distintas; no elegido.

## Consequences / riesgos

Positivo: ownership explícito, servicios sin inventario falso, horarios sin efecto
de seguridad, evidencia conservada y reporte consistente. Coste: migraciones,
puertos scoped, proyección/retención y pruebas de concurrencia. No habrá porcentaje
si el pasado carece de historial de elegibilidad o intervalos; es un límite real,
no una razón para reconstruir hechos inexistentes.

## Follow-up

Revisión técnica de esta propuesta/contrato, rehearsal de migración sin producción,
matriz AC y EWOs por slice. No modificar cuerpos aceptados ADR025/026/027. Hasta
ratificar arquitectura y pruebas de diseño, el paquete no es Ready de ejecución.

## Related Artifacts / ownership

- [SPEC](../specs/SPEC-AN-MTTO-001.md),
  [contrato funcional](../contracts/AN-MTTO-001-contract.md).
- Precedentes: [ADR002](002-schema-per-module.md),
  [ADR025](025-abc-utilization-downtime.md),
  [ADR026](026-inventario-costos-historicos.md),
  [ADR027](027-logistica-durable-journeys.md).
- Dueño de producto: propietario del chat. Propuesta técnica: Codex.
- EWOs: no creados/autorizados por esta documentación.

## Ratificación de ejecución — 2026-10-19

La autorización posterior del propietario «After you finish, go ahead and build,
if there are pending decisions, pass them trough grillme and do the
recommendations» ratifica la ejecución local mediante EWO-063. Las notas anteriores
que retenían runtime describen la etapa documental; no retienen este incremento.
No autoriza despliegue ni altera ADR025/026/027.

Recomendación aplicada: mientras los propietarios compartan esta base, la lectura
scoped de sus puertos participa de una única transacción REPEATABLE READ, con
savepoint por fuente opcional y vector de integridad. No hay exportación de tablas
al navegador ni acceso de analítica a mutaciones de Andon/Logística/stock. La
proyección conserva referencias/versiones; no pretende crear historiales ausentes.
La cobertura temporal permanece incompleta explícitamente; ledger/eligibilidad
ABC/UTIL son otra entrega. Lecturas de odómetro sin límites suficientes no generan
costo/km. Los horarios por tipo se conservan pero no se aplican retrospectivamente
sin historia del tipo. Horarios de unidad/general solo describen tiempo esperado.

Comprobantes privados reutilizan ObjectStoragePort; se referencian después del
registro, con revisión auditada, integridad y enlaces scoped de60segundos. Corregir
importes conserva asignación documental anterior como conciliación pendiente;
Directivo revalida importes exactos mediante nueva revisión.
