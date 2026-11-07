# Inventario: kits de piezas por tipo de unidad

Estado: **PROPUESTA** de shaping, 2026-11-07. No es DECISIÓN aprobada, SPEC aceptada ni EWO. Documentación únicamente: sin cambios de runtime, esquema, permisos ni migraciones. SPEC derivada: [SPEC-INV-002](../../docs/specs/SPEC-INV-002.md) (Proposed).

## Problema

El responsable de mantenimiento quiere seguir el inventario y el costo sin capturar cada SKU para cada camión. Hoy la visita registra piezas línea por línea (`PiezaDto`: `itemId`, `qty`, `origen`). SPEC-INV-001 ya define costo (promedio ponderado móvil, MXN, IVA, snapshot por consumo); no define captura reutilizable.

## Respuestas del dueño (2026-11-07)

1. Cuando una reparación se repite, las piezas suelen ser las mismas.
2. Los kits se definen **por tipo de unidad** por ahora (no por camión).
3. Se pidió esta nota y un borrador de SPEC.

## Dirección propuesta

- **El camión es destino de costo, no ubicación de stock.** Se mantiene almacén único (v0). No se crea inventario por camión.
- **Kit** = lista nombrada de refacciones y cantidades sugeridas, asociada a uno o más `tipo` de unidad (STOCK / RUTAS / CAMIONES 3 Y MEDIA…). Ejemplos: «Servicio A», «Cambio de balatas delanteras».
- En el paso Piezas de la visita el Supervisor elige un kit, ajusta cantidades, quita o agrega piezas sueltas y confirma. El kit **expande** a líneas `PiezaDto` normales.
- **Sugerencia, no regla.** El kit no reserva ni consume stock; solo las líneas confirmadas al cierre consumen, con la validación de stock y el costo histórico de SPEC-INV-001. Lo registrado en la visita es la verdad, aunque el kit cambie después.
- El costo se captura **solo en la entrada al almacén** (SPEC-INV-001 F-03). Nunca por camión ni por kit.
- Costo estimado del kit (opcional, informativo): suma de cantidad × costo promedio vigente, con piezas sin costo marcadas como desconocidas, nunca como cero.

## Qué no cambia

Contrato de `VisitaCerrada`, enums `DESDE_STOCK` / `COMPRA_EXTERNA`, ADR-002 (sin FKs entre esquemas), alertas `min_qty` (ADR-007), Andon sin stock (ADR-005).

## Preguntas abiertas (necesitan decisión humana)

| ID | Pregunta | Propuesta mientras tanto |
|---|---|---|
| K-1 | ¿Quién crea/edita kits: Supervisor, Admin o ambos? | Ambos; Admin audita. Pendiente de confirmar. |
| K-2 | ¿Un kit puede aplicar a varios tipos? | Sí, lista de tipos. Si no, uno por tipo. |
| K-3 | ¿Kits solo de almacén o también COMPRA_EXTERNA? | El origen se elige por línea al aplicar el kit, no se guarda en el kit. |
| K-4 | ¿Se registra qué kit originó las líneas? | Sí, como referencia de trazabilidad en la visita (análisis de uso), sin afectar costo. |
| K-5 | ¿Kit con pieza inactiva o incompatible con el tipo? | Se muestra advertencia; la línea no se agrega sin revisión. |
| K-6 | ¿Ownership de Inventario o Mantenimiento? | **Escalar.** Es concepto de dominio nuevo; requiere ADR antes de ejecución (ver ICM). |
| K-7 | Dependencia con SPEC-INV-001 parte B (costos) | Los kits funcionan sin costo; el costo estimado se activa cuando B esté disponible. |

## Secuencia sugerida

1. Revisar esta nota y SPEC-INV-002; resolver K-1…K-7.
2. ADR de ownership del kit (K-6) con `docs/adr/ADR-TEMPLATE.md`.
3. UX spec del paso Piezas con selector de kit ([plantilla](../../docs/design/UX_SPEC_TEMPLATE.md)).
4. EWO aprobado; implementación con TDD y verificación `verify-api`.
