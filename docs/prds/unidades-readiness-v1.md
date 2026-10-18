# Unidades — preparación de flota al inicio del turno

## Status

Approved for EWO-056, 2026-10-17. Necesidad, jerarquía y alcance confirmados en GrillMe;
especificación solicitada por el usuario para construir posteriormente. El usuario autorizó el build posteriormente mediante “Go ahead and build it”; deploy separado.

## Problema y usuario

El supervisor de mantenimiento abre Unidades al inicio del turno. La vista actual
le obliga a buscar dentro de ficha para entender operabilidad, revisiones,
órdenes e historial; la jerarquía y los controles no explican qué atender primero.

## Resultado esperado

Identificar qué unidades necesitan atención, por qué y qué acción corresponde;
abrir el expediente para comprobar evidencia y resolver el problema. La revisión
debe funcionar para Daily y Stock sin confundir uso, vigencia técnica y downtime.

## Alcance

- Lista operativa priorizada y búsqueda de unidades.
- Resumen de operabilidad, vigencia ABC, uso, problemas y órdenes abiertas.
- Ficha con resumen, mantenimiento, historial y datos técnicos comprensibles.
- Gate de órdenes existentes antes de crear otra.
- Periodicidad de revisión configurable con herencia flota/categoría/unidad.
- Cierre de orden y verificación técnica en una misma superficie, con efectos,
  permisos y registros independientes.

## Fuera de alcance

Nuevo cálculo de Salud; asignación histórica de choferes y desviaciones por orden;
nuevo canal de reporte de fallas; telemetría; reasignar ownership de módulos;
rediseño de utilización, contabilidad o del tablero de Logística.
No eliminar funcionalidades previas de historial/costos por esta reorganización.

## Evaluación futura

En prueba de tarea, el supervisor debe encontrar en diez segundos una unidad
prioritaria y explicar la razón con la información visible. Verificar por separado
que puede abrir evidencia, detectar una orden existente y comprender bloqueos
restantes tras cierre. Es objetivo de validación, no resultado ya obtenido.

## Fuentes y entrega

- [Acuerdos GrillMe](../../domain/mantenimiento/unidades-readiness-grillme-2026-10-17.md).
- [SPEC canónica de este incremento](../specs/SPEC-UNIDADES-READINESS-001.md).
- [UX](../design-system/unidades-readiness-v1.md).

El SPEC identifica los conflictos pendientes con ABC/ADR025. Su aprobación,
contratos verificables y EWO aprobado preceden al build.
