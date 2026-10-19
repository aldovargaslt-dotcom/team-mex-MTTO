# Revisión documental — contratos de análisis de mantenimiento

Fecha cliente2026-10-18. Solicitud: última revisión para precisar contratos.
Alcance: documentos, sin implementación ni EWO de ejecución creado.

**Actualización posterior:** el propietario resolvió las tres decisiones
operativas; diseño técnico completo y AC49–52 en
[cierre de contrato](AN-MTTO-001-contract-closure.md). Los pendientes enumerados
más abajo describen esta primera revisión, no el estado operativo actual.

## Resultado

SPEC y contrato **Proposed**. Revisión útil, no declaración de Ready. AC ahora
01–48, con requisitos verificables adicionales sin reemplazar IDs anteriores.

## Hallazgos y correcciones

| Hallazgo | Corrección y referencia |
|---|---|
| AC32 agrupaba calibración y CHECK como no mantenimiento | Calibración en OT puede contar como revisión/ajuste; CHECK no cuenta por su conclusión (AC32) |
| Viaje operativo podía confundirse con tiempo físico/productivo | Procedencia Logística/Flota y nombres distintos (AC43) |
| Costo/km no explicitaba importes pendientes | Ratio conocido/km parcial, con cobertura, no total definitivo (AC46) |
| Escritura/proyección sugería atomicidad distribuida | Recibo/fuente atómicos por owner; proyección atrasada visible y recuperable (AC41) |
| Snapshot/cursor podía ocultar cambio de alcance | Reautorizar detalle y rechazar revisión vencida sin sustituir silenciosamente (AC44) |
| Horario ausente podía equivaler a día no laborable | Ausente=desconocido; no laborable explícito=denominador0, No aplica (AC45) |
| Coincidencia de orden/externo podía duplicar o fusionar indebidamente | Vínculo por intervención/evidencia, no fecha o sistema solamente (AC47) |
| Fecha económica podía inventar instante de liberación | Conservar precisión día/instante; fecha económica separada de conclusión/operación (AC48) |
| Impuestos/piezas incluidas/factura multiunidad sin forma común | Contrato lógico con asignaciones reconciliables y scope (AC09/12–16/48) |

## Fuentes cotejadas

SPEC-AN-MTTO-001, SPEC-UTIL-INPUTS-001 F6, ABC-UTIL-001-contract,
LOG-JOURNEY-001-contract, ADR025, entidades/consulta de costos y cost-rules.ts.
No se reescriben ADRs ni se declara implementado un endpoint de agregado global.

## Verificación documental

| Check | Estado / alcance |
|---|---|
| Enlaces locales de documentos nuevos/actualizados | PASS: existencia, sin verificar servicios remotos |
| AC01–48 únicos, ordenados, referencias de matriz incluidas | PASS |
| `git diff --check` | PASS |
| Fuentes de código de app cambiadas por este pase | Ninguna |
| Tests API/web, migraciones, concurrencia real, performance | SKIPPED: no implementación |
| proof-ui / better-ui / Visual QA funcional | SKIPPED: documentación, mocks previos no prueban interacciones |

## Pendientes no cerrados por esta revisión

- Autoridad de edición de horarios y reglas finales de calendario/excepciones.
- Aprobación del denominador horario/cohortes y tratamiento de ratio parcial.
- Reconocimiento económico de servicio de varios días que cruza periodos.
- Catálogo final y vínculo por trabajo/intervención en legacy.
- Owner/puertos concretos de captura/configuración, DTO/endpoints/errores,
  esquema/migración, idempotencia/retención, history scope y límites de consulta.

Se mantienen en la SPEC y contrato; no se consideran resueltos por una suposición.
Siguiente paso: validar decisiones pendientes por slice y cerrar diseño técnico
de persistencia/transporte antes del EWO correspondiente. Sin cambios de runtime.

## Artefactos

- [SPEC](../specs/SPEC-AN-MTTO-001.md).
- [Contrato](../contracts/AN-MTTO-001-contract.md).
- [UX](../design-system/ux-analisis-mantenimiento-mock-v1.md).
