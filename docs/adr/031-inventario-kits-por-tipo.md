# ADR-031 — Kits de piezas por tipo de unidad (propiedad en Inventario)

## Status

Accepted (2026-11-07, aceptación explícita del dueño en el chat). La aceptación cubre la dirección arquitectónica; **no** autoriza código, esquema, migraciones ni cambios de acceso. Falta SPEC aprobada y EWO.

## Context

La captura de piezas en la visita es línea por línea (`PiezaDto`: `itemId`, `qty`, `origen`). Las reparaciones repetidas usan las mismas piezas; el responsable de mantenimiento no quiere capturar cada SKU por camión. [SPEC-INV-002](../specs/SPEC-INV-002.md) define el comportamiento. Ampliar Inventario requiere ADR ([domain/inventario](../../domain/inventario/CONTEXT.md), AGENTS). ADR-002 prohíbe FKs/JOIN entre schemas; el envelope `VisitaCerrada` está congelado (ADR-001).

## Decision

1. **Inventario es dueño del kit**: nombre, líneas (`itemId`, cantidad entera ≥ 1), tipos de unidad aplicables y estado. Sin precios. Los `tipoId` se guardan como identificadores opacos del Kernel, sin FK entre schemas.
2. **El kit es una plantilla, no stock**: aplicarlo en el paso Piezas **expande** a líneas `PiezaDto` normales en el borrador. No reserva ni consume. Solo las líneas confirmadas al cierre consumen, por el camino existente (validación de stock y snapshot de costo de ADR-026).
3. **Sin cambios al envelope `VisitaCerrada`.** La referencia al kit usado, si se conserva, es una anotación opaca de la visita en Mantenimiento, no parte del evento ni del costo. Cualquier cambio de envelope requeriría revisar ADR-001.
4. **Lectura por puerto**: Mantenimiento obtiene los kits aplicables a un tipo mediante un puerto de lectura de Inventario; no lee tablas de `inventario`.
5. **Permisos**: Supervisor y Admin crean y editan kits (decisión del dueño, 2026-11-07); Admin audita (quién/cuándo). Ver kits y aplicarlos sigue el permiso actual de captura de piezas. El costo estimado del kit respeta el permiso financiero de SPEC-INV-001 D-02.
6. **Costo estimado del kit** es informativo (cantidad × costo promedio vigente); piezas sin costo se marcan desconocidas, nunca cero. No es fuente de gasto: el gasto sale del snapshot al cierre.
7. **Historia inmutable**: editar o inactivar un kit no altera visitas cerradas.

## Alternatives Considered

### Option A — Kit propiedad de Mantenimiento
Más cercano a la visita, pero mezcla catálogo de refacciones y compatibilidad (de Inventario) con el módulo de visitas; Mantenimiento tendría que validar piezas que no posee. No elegida.

### Option B — Inventario por camión
Contradice almacén único v0 y el modelo de costo en la entrada; multiplica captura y conciliación. Descartada por el objetivo (menos captura) y por estar fuera de v0.

### Option C — Plantilla copiada sin entidad (autocompletar desde la última visita)
Cero esquema nuevo, pero no es administrable ni auditable, y arrastra errores de una visita a otra. Podría complementar, no sustituir.

## Consequences

### Positive
- Menos captura, mismo control de stock y costo; sin tocar el contrato de cierre.
- Propiedad clara y coherente con ADR-002 y ADR-026.

### Negative / Trade-offs
- Nueva entidad y administración de kits (UI/permisos/auditoría).
- Los kits pueden quedar desactualizados; mitigado por revisión de líneas antes de cerrar.
- Nuevo puerto de lectura Inventario → Mantenimiento.

## Risks

Ampliar ownership sin aceptación (mitigado: Proposed). Referencia al kit que se confunda con parte del envelope (mitigado: anotación opaca). Piezas inactivas o incompatibles en kits viejos (AC-K06/K07).

## Follow-up

Aceptación del dueño; UX spec del paso Piezas; EWO con TDD (`verify-api`); decidir si la referencia al kit se guarda y dónde (K-4); evidencia de activación de costos en producción (ver SPEC-INV-002, dependencia).

## Related Artifacts

SPEC: [SPEC-INV-002](../specs/SPEC-INV-002.md), [SPEC-INV-001](../specs/SPEC-INV-001.md).
Shaping: [inventario-kits-por-tipo-v0](../../workspace/shaping/inventario-kits-por-tipo-v0.md).
Engineering Work Orders (`EWO-xxx`): ninguno.
Previous ADR: [ADR-001](001-visita-cerrada-outbox.md), [ADR-002](002-schema-per-module.md), [ADR-007](007-inventario-stock-bajo.md), [ADR-026](026-inventario-costos-historicos.md).

## Ownership

Date (YYYY-MM-DD): 2026-11-07
Owner: dueño del producto
Approval / decision reference: respuestas del chat 2026-11-07 (kits por tipo; Supervisor y Admin editan; ADR solicitado). Aceptación: «yes i accept them», chat 2026-11-07.
