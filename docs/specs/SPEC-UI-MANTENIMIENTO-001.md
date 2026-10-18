# SPEC-UI-MANTENIMIENTO-001 — Extensión de identidad clara a mantenimiento

## Autoridad / objetivo
Aprobado por petición del propietario 2026-10-17: comenzar cambio estético en vistas de mantenimiento; alcance confirmado «Ambos, empezando por Supervisor». Extender lenguaje visual del piloto EWO047 a Órdenes, Unidades/ficha/visita Supervisor y Mi trabajo Mecánico. Admin comparte vistas autorizadas. Esta instrucción posterior amplía el alcance estético del piloto, sin rediseñar negocio ni navegación.

## Alcance y exclusiones
Presentación: superficies claras cálidas, navy estructural, naranja existente para acción principal, pasteles semánticos, filtros/colas neutros, bordes y radios coherentes, foco y densidad legibles. Mantener estructuras de lista→detalle, fichas y wizard existentes. Mecánico recibe cabecera clara conservando navegación y capacidades actuales; sin sidebar nueva. Checks enfocados, Logística, login y otros dominios excluidos. Sin dark theme, datos, contratos, permisos, reglas de apertura/cierre, nuevos flujos ni adopción generalizada de submenús.

## Acceptance Criteria
- AC-01: Supervisor/Admin en Órdenes y Unidades (incluida ficha y visita) usan los tokens del workspace claro, título navy y superficies blancas/contornos coherentes; la excepción mantiene su semántica y CTA naranja existente.
- AC-02: selección de cola/filtro se muestra neutra y se diferencia de acción; orden seleccionada usa superficie neutra, borde/indicador navy. No naranja decorativo ni cambios de badges de condición. Texto/estado no dependen de color solo.
- AC-03: Mi trabajo Mecánico adopta la misma base clara, cabecera legible, filas y controles coherentes; conserva acceso y cola/detalle/acciones autorizados, sin adquirir sidebar u otras capacidades.
- AC-04: búsqueda, filtros, lectura de detalle, navegación a unidad/mantenimiento y formularios actuales permanecen utilizables; móvil390/desktop1440 y ancho1024 sin overflow global, contenido con scroll propio cuando aplica. Estados loading/error/vacío/disabled conservados. No afirmar guardados reales mediante fixture.
- AC-05: foco de teclado visible, hits44px móvil, movimiento funcional150–250ms/reduced0; overlays portaled mantienen cierre/foco. Login/Logística/checks enfocados y navegación de Inventario no cambian.

## Reglas / fuentes
[ADR-003](../adr/003-shadcn-tailwind.md), [Mantenimiento](../../domain/mantenimiento/CONTEXT.md), [sistema UI](../design/DESIGN_SYSTEM.md), [UX](../design-system/ux-mantenimiento-identidad-clara-v1.md). Revisión/CHECK sigue siendo inspección, no mantenimiento concluido. Reglas de dominio y permisos no se trasladan a CSS. Sin decisión de arquitectura nueva.
