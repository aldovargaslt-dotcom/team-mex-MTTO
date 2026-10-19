# Cierre de diseño — AN-MTTO-001

Fecha cliente2026-10-18. Autorización: «Tus recomendaciones son bastante
acertadas, sigamos con estas para cerrar los contratos». Alcance documental.
Actualiza el estado de pendientes de la revisión anterior sin borrar su historia.

## Decisiones confirmadas / diseño seleccionado

- Admin configura horarios; Supervisor consulta y solicita por proceso existente.
- Utilización porcentual solo con cobertura temporal100% de alcance solicitado.
- Servicio externo se reconoce al concluir; piezas propias conservan consumo.
- Costos netos e IVA con coberturas independientes; IVA desconocido no es cero.
- Catálogo/identidades, roles, API, DTO, persistencia, claims, snapshots,
  retención, límites, refresh y migración/rollback concretos en contrato técnico.

Arquitectura elegida para revisión: Mantenimiento conserva nuevos servicios/
horarios/proyección en su área; Inventario conserva valoración/stock; Logística
conserva liberación. ADR030 es Proposed, no se finge aceptación de arquitectura.
No quedan abiertas las tres preguntas operativas ya respondidas. El siguiente
gate es ratificar propuesta técnica y planificar EWOs por slices, sin runtime.

## Verificaciones ejecutadas

| Verificación | Resultado |
|---|---|
| Existencia de enlaces locales en10documentos afectados | PASS |
| AC01–52 únicos, ordenados | PASS |
|20rutas GET/POST sin duplicados | PASS |
| Secciones de contrato, idempotencia, snapshot, cobertura y estados presentes | PASS |
| Aritmética de piezas propias, pieza incluida, costo conocido/km, ratio3/8 y retorno neto negativo | PASS (ejemplos documentales, no runtime) |
| Fechas30oct/2nov conservan distinto mes de reconocimiento según concepto | PASS (ejemplo documental) |
| `git diff --check` | PASS |
| SQL real, migraciones, locks/retry y performance | SKIPPED: sin implementación |
| Unit/e2e, lint/build y proof-ui | SKIPPED: solo documentación |

No tests de aplicación nuevos ni código modificado. Los chequeos de documentos
no prueban el comportamiento futuro del sistema. No hay aprobación de producción,
despliegue, EWO ejecutable o capacidad activa inferida desde estos archivos.

## Artefactos y estado

- [SPEC](../specs/SPEC-AN-MTTO-001.md): Proposed,52AC; producto confirmado.
- [Contrato funcional](../contracts/AN-MTTO-001-contract.md): Proposed actualizado.
- [Contrato técnico](../contracts/AN-MTTO-001-technical.md): opción completa para revisión.
- [ADR030](../adr/030-maintenance-analysis-contracts.md): Proposed, sin ratificación técnica aún.
- [Revisión previa](AN-MTTO-001-contract-review.md): hallazgos/historia anteriores.
- UX/PRD/discovery/glosario e índice ADR sincronizados con las decisiones nuevas.
