# UX — Identidad clara de Inventario v1

## Estado / propósito / usuario
Composición autorizada por «Ahora dale una pasada a inventario». [SPEC-UI-INVENTARIO-001](../specs/SPEC-UI-INVENTARIO-001.md) AC01–09. Supervisor/Admin localiza refacción/documento, entiende estado y accede a su acción actual. Mantener arquitectura de navegación aceptada, sin nueva función de Stitch.

## Dirección Impeccable Operate previa a JSX
Clonar el lenguaje de Órdenes052/Unidades053 con componentes existentes, conservando la anatomía de cada vista. P0 refacción/compra y condición real; P1 acción de almacén/documento; P2 magnitudes/estado; P3 filtros y metadatos. Roboto, navy, un CTA sólido naranja cuando procede, selección neutra y pastel semántico. Sin dashboards nuevos, sombras, KPI inventado o card por dato.

## Composición concreta / hermanos / componentes
- Existencias y Refacciones: PageHeader actual con acciones actuales; sustituir wrapper de filtros por OperationalToolbar compartida. Labels/búsqueda/tipo/filtros de categoría intactos, flex/grid de consulta con wrap móvil. Resultado y tabla/lista existentes debajo, una superficie documental con divisores. Sin cambiar orden de las acciones de stock o alta.
- Comprobantes: PageHeader y toolbar búsqueda/estado, conteo/filas documentales existentes. Conservar advertencias de alcance/origen, costo pendiente/registrado y acción específica por fila; no copiar importes, OCR o cards de métricas de Stitch.
- Análisis: conservar vistas Consumo/Movimientos y todos los filtros/rangos, con toolbar compartida y tipos/rango personalizados legibles. No tocar cálculos, gráficos existentes, drill-down/retorno o tablas. No añadir gráficos por el rediseño.
- Categorías/Proveedores: PageHeader existente; formulario de alta en una sección clara distinguida de la lista. Un buscador único sigue sin card propia; filas separadas por divisores y acción de activación actual. Labels/disabled y formulario persistente sin nueva interacción de guardado.
- Overlays: conservar ficha de pieza, movimiento/entrada, alta, comprobante y editor compacto de alertas tal como funcionan. Compartir tokens de superficies/canvas/borde/muted en layout y portales. No envolver la tabla de alertas en otro contenedor, cambiar su densidad o editar handlers. Foco, scroll, confirmación y recuperación actuales.

## Navegación / responsive / states
Sidebar≥1024 con seis destinos, Refacciones dentro de Catálogo; no restaurar pestañas de módulo arriba de la vista desktop. Selector/panel móvil actual, Admin conserva selector superior; tablet800 conserva solución existente. Navegación interna de Análisis permanece contextual.1440/1024 compacto;390 con herramientas en grupos y targets44;320/altura corta sin recorte global. Mantener safe-area y controles portaled.

Loading/empty/no coincidencias/error/parcial/retry/busy/disabled usan copy y componentes actuales. Estados/colores de stock/documentos no se calculan por estilo. Motion150–250 de overlays ya existentes y reduced0; sin animar contenido/página. No nuevas variantes de Button si ya existe la adecuada.

## Proof / fuera
Role picker Sup/Admin → seis destinos; búsqueda/filtro/reset/rango, catálogos con datos, fichas y overlays abiertos/cancelados, alertas sin guardar en backend real; error/retry controlado y vacío.1440/390 y smoke1024/800/320; contraste/foco/reduced. Cualquier escritura de prueba solo fixture descartable explícito, sin afirmar persistencia real. Web lint/build → better-ui/proof-ui CDP sin Playwright → ux-auditor independiente; aprobación visual humana separada. No API, permisos, consumo/costos, reglas de alertas, navegación nueva o darkmode.


## Corrección aprobada de navegación móvil — EWO-055
La corrección explícita del propietario sustituye la excepción anterior de Admin: Supervisor y Admin usan barra inferior en teléfono (<768), con el botón Inventario activo desplegando sus seis secciones. Se retira el selector superior de Inventario para ambos. Los cuatro módulos reutilizan la barra existente; funciones adicionales Admin permanecen en menú global. Desktop/sidebar y tablet768–1023 no cambian. La evidencia054 describe el estado anterior y no acredita esta corrección; ver [EWO-055](../engineering-work-orders/EWO-055.md).
