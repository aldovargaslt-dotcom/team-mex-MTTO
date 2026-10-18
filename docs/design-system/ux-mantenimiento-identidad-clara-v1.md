# UX — Identidad clara en mantenimiento

## Propósito / usuarios / autoridad
[Spec aprobada](../specs/SPEC-UI-MANTENIMIENTO-001.md). Supervisor consulta Órdenes/Unidades, entra en ficha y atiende mantenimiento. Mecánico usa su cola y detalle. Admin mantiene consulta autorizada. Extender estética aprobada, sin nuevas tareas.

## Dirección Impeccable Operate previa a JSX
Clonar paleta/superficie de Comprobantes EWO047 y estructura actual de cada pantalla: Órdenes lista→detalle, Unidades catálogo→ficha, visita wizard/documento, Mi trabajo cola→sheet. Reusar AppShell, Button/PageHeader/ListFilter/Badge y superficies existentes. P0 identidad de orden/unidad; P1 acción actual; P2 datos y condición; P3 filtros y metadatos. Navy estructura, naranja solo acción de tarea/ubicación aprobada; pasteles solo condiciones. No pintar filtros con estados ni inventar hero/cards/KPIs.

## Cambios concretos
Scope CSS de mantenimiento, sin retocar toda la app: usar canvas/borde/muted del workspace. Ritmo16/24px, títulos20px y subheads14–16, superficies blancas radio6, lectura conservada. Órdenes: contorno y divisores suaves, cola seleccionada neutra con texto navy, lista neutra y detalle blanco. Unidades: catálogo/ficha/formularios con mismo borde y radio, selección neutra; no eliminar datos, tipos o indicadores existentes. Visita: un paso/un documento como hoy; no intervenir firmas, cantidades ni validación. Mecánico: cabecera clara con marca actual, acciones visibles, cola seleccionada neutra y misma anatomía de documentos.

## Responsive / estados / interacción
Desktop1440 y1024: conservar sidebar Supervisor/Admin y ancho útil, lista→detalle actual. Móvil390: conservar bottom Supervisor; Mecánico conserva menú actual. No nuevos submenús ni sidebar Mecánico. Foco navy2px y contornos, targets44 móvil, hover solo pointer hover, selected con texto y aria actuales. No animación nueva de páginas; hover150 y sheet200/reduced0. Loading/error/vacío/disabled usan copys y componentes existentes; API inalterada. Portales de sheet/dialog reciben los mismos tokens del ámbito activo.

## Proof
Role picker → Supervisor: Órdenes, selección/búsqueda/filtro, Unidades→ficha→Mantenimiento→visita; Mecánico: Mi trabajo→detalle, colas e historial.1440/390 y smoke1024; Admin consulta. Revisar empty/error controlado, disabled sin guardar en productivo, cierre Escape/foco, reduced motion, no overflow. Fixture representa navegación/estados, no integración o cierre real. Gate better-ui → proof-ui CDP → ux-auditor independiente; aprobación humana visual posterior.
