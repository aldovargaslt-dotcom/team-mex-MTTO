# SPEC-UI-INVENTARIO-001 — Pasada visual de Inventario

## Status / authority
Approved para el corte delimitado EWO-054. Propietario: «Ahora dale una pasada a inventario», después de construir el sistema visual de mantenimiento. Autoriza aplicar ese contrato a Inventario, sin push/despliegue ni cambio funcional. [Contrato visual](../design/DESIGN_SYSTEM.md#contrato-visual-vigente--lectura-obligatoria-para-agentes), ADR003 y [UX concreta](../design-system/ux-inventario-identidad-clara-v1.md).

## Problem / goals
Inventario comparte navegación, pero sus herramientas/contornos y superficies proceden de distintas etapas del UI. Unificar jerarquía y componentes con el sistema recién aplicado, preservando información y tareas de almacén. Identidad de refacción/documento, estado y acción deben distinguirse antes que metadatos.

## Scope / actors / non-goals
Supervisor/Admin: Existencias, Refacciones, Análisis (Consumo/Movimientos), Comprobantes, Categorías y Proveedores. Rutas heredadas Consumo/Movimientos conservan su conducta. Navegación desktop/móvil aprobada intacta; Refacciones permanece en Catálogo. Formularios/overlays existentes heredan presentación sin rediseñar sus campos ni reglas. Sin API, modelos, permisos, datos, nuevas métricas, cálculos de consumo, librerías, OCR/ERP/CFDI, darkmode o nuevas funciones.

## Behavior / rules / compatibility
Reusar PageHeader, OperationalToolbar, Field/Input/ListFilter y componentes existentes. Agrupar búsqueda/filtros en región de consulta blanca con labels; resultados/tablas/documentos y formularios usan superficies del workspace, selección neutra, pastel semántico y CTA de tarea cuando procede. No envolver cada fila en una card nueva ni cambiar labels que alteren significado.

Fuente de reglas Inventario: ADR002/007/022, [domain card](../../domain/inventario/CONTEXT.md), specs funcionales del módulo. [SPEC-INV-ALERT-001](SPEC-INV-ALERT-001.md) AC-01–15 sigue siendo canónica para selección oculta, lote por unidad, referencia del mes anterior, crítico y recuperación parcial; no se redefinen. Métodos de stock/costos/comprobante, CRUD y permisos no se alteran. Familias/categorías y proveedores conservan activación/inactivación actual. Referencia visual no crea capacidad nueva.

## States / failure / constraints
Loading, inicial vacío, cero coincidencias, parcial/error/retry, busy/disabled y confirmación/guardado conservan controles/copy existentes. No se inferirán errores o éxito a partir de colores. Portales heredan tokens manteniendo scroll, Escape, foco y safe-area. Desktop1440/1024, tablet800, móvil390/smoke320, sin overflow global; tablas con scroll local. Targets44 móvil y reduced0. Mantener lectura/acciones del rol y rutas/parámetros/retorno.

## Acceptance Criteria — fuente canónica de este corte
- **AC-01:** Las seis secciones muestran contrato visual Team Mex y jerarquía consistente, con campos y datos existentes conservados; sin tocar roles/módulos excluidos.
- **AC-02:** Existencias/Refacciones/Comprobantes/Análisis agrupan búsqueda/filtros existentes en OperationalToolbar con labels y selección neutra; filtrado/URL/reset/resultados mantienen comportamiento actual, sin anunciar búsquedas o totales inexistentes.
- **AC-03:** Categorías/Proveedores distinguen formulario de creación y lista/búsqueda; preservan acciones/estados y disabled actuales, sin añadir card decorativa a un solo filtro.
- **AC-04:** Tablas/filas/documentos conservan nombres, SKU/unidad, magnitudes, estado y acciones; tipografía/bordes/radios se ajustan con tokens existentes, no con nuevas capas generales de overrides por página.
- **AC-05:** Sidebar/rail, subnav Inventario, selector móvil y panel inferior se conservan; Refacciones está en Catálogo, selección actual única y las seis secciones siguen alcanzables por ambos roles.
- **AC-06:** Apertura/lectura/cancelación de ficha, alta de refacción, entrada, comprobante y editor de alertas conserva campos, validación, scroll y foco. No se modifica ni presenta como nueva la lógica AC-01–15 de SPEC-INV-ALERT-001; si diff la afectara, bloquear y ampliar pruebas explícitamente.
- **AC-07:** En1440/390 por ambos roles y smoke1024/800/320 no hay overflow global, acciones inaccesibles por barras o controles móviles<44; loading/vacío/no coincidencias/error/retry y disabled mantienen recuperación existente.
- **AC-08:** Texto/CTA/foco relevantes conservan contraste del contrato, estado con texto/icono, teclado/retorno de overlays y reduced motion0; no nuevas animaciones o dependencias.
- **AC-09:** Gates UI: dirección Operate previa, interacción, better-ui/correcciones, proof-ui CDP desktop/móvil sin Playwright y auditoría UX independiente; lint/build y pruebas proporcionales con PASS/FAIL/SKIPPED y límites. No afirmar persistencia/permiso backend real desde fixture.

## Traceability / impact / plan de verificación
PRD/ADR nuevos no aplican: presentación sin proceso/arquitectura nuevos. Afecta wrappers de consulta, layout/token scope de Inventario y estilos; API y handlers de dominio sin cambios. EWO054 referenciará AC anteriores, con evidencia propia. Matriz de verificación: recorrido seis destinos/roles y filtros (AC01–05), overlays y foco (AC06/08), viewports/estados controlados (AC07), comandos/auditoría (AC09). Pruebas planeadas, no PASS hasta ejecución. Contratos/cálculos/consumos/costos/guardados reales se verifican con suites correspondientes solo si el cambio los afecta; este corte los preserva.

## Open questions / risks
Sin decisión de producto abierta para esta pasada. Riesgos: herramientas comprimidas, portales sin scope y afectar editor compacto al cambiar estilos. Mitigar con scope explícito, componentes actuales y prueba de overlays; no refactor de lógica de alertas o costos. Nuevas capacidades/otra semántica exigen volver a shaping.


## Enmienda posterior — navegación móvil EWO-055
La corrección explícita del propietario sustituye la conservación del selector superior Admin en AC-05: ambos roles usan la barra inferior y su botón Inventario para desplegar secciones. Criterios acotados de corrección y evidencia en [EWO-055](../engineering-work-orders/EWO-055.md). El resto del alcance visual permanece intacto.
