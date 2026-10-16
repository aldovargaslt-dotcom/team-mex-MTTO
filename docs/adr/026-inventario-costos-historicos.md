# ADR-026 — Costos históricos y valoración de refacciones en Inventario

## Status

**Accepted for the requested implementation** — explicit user instruction to implement the consolidated changes and open a PR. No production migration/deploy approval inferred. Diseño solicitado después de las respuestas de GrillMe. Las reglas de negocio citadas fueron aceptadas; esta arquitectura y el contrato son propuesta concreta para revisión, sin ejecución, migración ni despliegue autorizados por el documento.

## Context

Inventario conoce entradas/cantidades y aplica consumos al cerrar visitas, pero no guarda importes. Se requiere promedio ponderado y costo histórico de refacciones por orden/unidad. Capturar un precio mutable en catálogo permitiría modificar gastos antiguos al cambiarlo. Costeo amplía v0 y requiere ownership explícito según ADR-002 y AGENTS.

## Decision

Proponer que Inventario posea importes de recepción/compra directa, valoración y snapshots financieros de consumo, con revisiones auditadas y puertos de lectura para mantenimiento. Mantener en Mantenimiento cantidades/origen de sus líneas y estado de visita; no trasladarle el stock. No declarar un BC nuevo.

Capturar total por refacción/operación en MXN con modo IVA; guardar neto/impuesto/total, tasa y modo. Valoración neta; cantidades enteras; dinero en centavos exactos; reparto proporcional half-up con absorción explícita de residuo al agotar saldo. No redondear promedio visual y después usarlo como saldo autoritativo.

Usar efecto de cierre actual y sus referencias opacas para confirmar snapshot de costo conocido o pendiente. Envelope VisitaCerrada permanece sin precios y congelado. Handler transaccional actual se extiende dentro de Inventario, con deduplicación de aplicación; no FKs/JOIN cruzadas. Las revisiones tardías de costo no reemiten cierre ni consumen piezas nuevamente.

Stock sin costo conocido no se presume gratis: estado incompleto, apertura/regularización Admin y cobertura explícita. Nueva recepción no autoriza retrovaloración. Históricos conocidos no se sobrescriben. Supervisión completa pendientes; Admin aplica correcciones/regularizaciones con motivo y autorización real.

Escrituras financieras/idempotentes requieren actor confiable, clave de operación, versión y atomicidad de stock/valor/snapshot. Se conserva la autorización vigente de operación física; la capacidad financiera se evalúa separadamente. Adjuntar documentos después de RECIBIDA es capacidad auditada sin efectos de stock o importes.

Diseño detallado y decisiones técnicas propuestas: [contrato INV-001](../contracts/INV-001-costos.md). Ningún nombre de endpoint/tablas de ese contrato se afirma existente.

## Alternatives Considered

### Precio actual en catálogo

Implementación sencilla; no conserva gasto histórico ni variación de compras. Rechazada como fuente universal. Último costo queda como consulta de referencia.

### Campos financieros autoritativos en Visita y JOIN a Inventario

Facilita una consulta, pero rompe ownership y ADR-002; mezcla cantidades de mantenimiento con valoración de stock. No elegida.

### Promedio unitario redondeado como saldo

Fácil de mostrar, pero acumula residuos al multiplicar por cantidad. Se propone conservar valor neto exacto y razón de promedio, con costo aplicado explícito.

### FIFO/lotes o contabilidad completa

Mayor detalle y complejidad fuera del alcance aceptado. Método de negocio elegido: promedio ponderado móvil.

## Consequences

Positivas: trazabilidad histórica, separación de módulos, captura flexible de IVA y gasto por unidad sustentado en consumo. Costos pendientes no paralizan mantenimiento.

Trade-offs: nuevas tablas/operaciones, auditoría, regularización de stock sin costo y casos de concurrencia. Un promedio puede quedar incompleto; el sistema debe decirlo. Correcciones requieren protocolo, no UPDATE silencioso. La primera lectura financiera es Costo de refacciones, no costo completo de mantenimiento.

## Risks

Datos iniciales sin valor; actor legacy no confiable para costos; doble aplicación tras timeout; corrección tardía y reportes de periodos anteriores. Mitigar con contrato, apertura/corte, idempotencia, revisiones y pruebas. Política de fecha de retorno y límites técnicos del contrato siguen Proposed hasta revisar el paquete; no atribuirlos a respuestas de usuario.

## Follow-up

Revisar contrato; aceptar ADR antes de implementar cambios de schema/ownership; elaborar migración reversible y pruebas descartables; desglosar ejecución financiera en EWO autorizado. No alterar ADRs aceptados ni aplicar migraciones desde esta tarea documental.

## Related Artifacts

[SPEC-INV-001](../specs/SPEC-INV-001.md), [SPEC-MTTO-UX-002](../specs/SPEC-MTTO-UX-002.md), [PRD-INV-001](../prds/PRD-INV-001.md), [ADR-002](002-schema-per-module.md), [ADR-001](001-visita-cerrada-outbox.md). UI A: EWO-038/039 separados y sin implementación financiera.

## Ownership

Fecha de cliente: 2026-10-15. Elaborado por Codex a petición del usuario. Reglas de negocio: respuestas del chat; decisión arquitectónica: **propuesta**, no se registra aprobación inexistente.

## Production release amendment — 2026-10-15 (client date)

The user subsequently authorized: “Go ahead and do the changes to push to production.” This supersedes the initial implementation-only release hold. It extends the narrow production guard of ADR024 to the inventory-cost migration ledger, without changing its historical decision or running CHECK/Auth migrations. The existing Railway pre-deploy command and production bootstrap fallback prepare only these three explicitly approved additive migrations. Costing now defaults enabled after that guard; explicit `INVENTORY_COSTS_ENABLED=false` remains an operator disable and skips the inventory migration. Both manual and release runners share the inventory advisory lock/ledger. No seed, down, synchronize, guessed stock price or quantity backfill is introduced. No deployment credentials or successful production migration are inferred from this authorization.
