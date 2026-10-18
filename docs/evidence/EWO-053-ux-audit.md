# EWO-053 — Auditoría independiente de las anatomías compartidas

Veredicto: **OK visual / PASS** para las superficies inspeccionadas. Sin hallazgos accionables confirmados en el delta. El pase documental previo a JSX no se usa como aprobación del render.

Revisor: subagente `ux-auditor`, independiente del implementer. Runtime solo lectura; este documento es el único archivo escrito por el auditor. Sin Playwright.

## Fuentes y alcance

Se abrieron EWO-053, SPEC-UI-MANTENIMIENTO-002 y su autorización posterior, UX §Cortes aprobados — Unidades, visita y Mecánico EWO-053 y contrato DESIGN_SYSTEM. Se revisaron OperationalToolbar/OrderDocumentHeader y los diffs de UnidadesCatalogo, HubIdentityHeader, visita, Mi trabajo y CSS asociado. Rigen Visual QA, jerarquía, gramática, targets y proof-ui leídos en esta sesión.

OperationalToolbar aporta estructura visual sin filtrar ni consultar. OrderDocumentHeader recibe estado/tone del llamador y compone primitivas existentes; no deduce condiciones del dominio. Las expresiones de estado permanecen en sus consumidores. El delta inspeccionado no añade permisos, servicios ni secuencias de captura. Se conserva navegación contextual de ficha y exclusión de sidebar Mecánico.

## Resultados

- **Composición compartida — PASS visual (AC-02/04/06/16):** PageHeader, herramientas e identidad documental mantienen anatomía reconocible sin convertir tareas distintas en una plantilla universal. Unidades conserva cuatro indicadores y sus funciones, con valores de menor énfasis. Filtros/cola son neutros y distintos de estado/acción. Documento/folio y unidad se distinguen en visita, Mecánico y regresión Órdenes.
- **Unidades/ficha — PASS visual acotado (AC-05/07/09):** ambos roles conservan identidad, health, acciones permitidas, navegación contextual y metadatos legibles. Las acciones Admin de catálogo/ficha permanecen visibles, sin aparecer en Supervisor. No se detecta recorte nuevo ni duplicación de navegación global.
- **Visita — PASS visual acotado (AC-05/10/12):** identidad/estado anteceden a unidad y datos; Datos se capturó cargado en1440/390. Stepper y footer conservan estructura; Confirmar muestra faltantes textuales y Cerrar visita disabled. Admin muestra documento cerrado de lectura. Piezas se capturó cargando con Continuar disabled: acredita ese estado visual, no stock cargado ni una prueba de cantidades.
- **Mecánico y regresión Órdenes — PASS visual acotado (AC-08/11/12/13):** cola/tipo agrupados, filas y sheet legibles, sin sidebar nueva. Error parcial conserva Reintentar y no finge catálogo vacío definitivo. Órdenes sigue lista→detalle y acción contextual única después de consumir componentes compartidos.
- **Contraste — PASS por registro calculado (AC-03):** el suplemento final registra título13.09:1 y label5.77:1 en las anatomías compartidas. Son mediciones efectivas focales del implementer, no verificación exhaustiva independiente de cada elemento.

No se inventan hallazgos para completar una cuota. Los indicadores existentes de Unidades y anatomías documentales se conservan según UX; no se propone un rediseño ajeno.

## Capturas actuales inspeccionadas

Se abrieron individualmente con `view_image` los22 paths únicos del JSON final, relativos a `docs/screenshots/`:

- `ewo053_supervisor_units_d1440.png`, `ewo053_supervisor_units_m390.png`
- `ewo053_supervisor_hub_d1440.png`, `ewo053_supervisor_hub_m390.png`
- `ewo053_supervisor_visit_d1440.png`, `ewo053_supervisor_visit_m390.png` (recapturas con Datos cargado)
- `ewo053_supervisor_parts_d1440.png`, `ewo053_supervisor_parts_m390.png`
- `ewo053_supervisor_confirmation_d1440.png`, `ewo053_supervisor_confirmation_m390.png`
- `ewo053_admin_units_d1440.png`, `ewo053_admin_units_m390.png`
- `ewo053_admin_hub_d1440.png`, `ewo053_admin_hub_m390.png`
- `ewo053_admin_visit_d1440.png`, `ewo053_admin_visit_m390.png`
- `ewo053_mechanic_queue_d1440.png`, `ewo053_mechanic_queue_m390.png`
- `ewo053_mechanic_detail_d1440.png`, `ewo053_mechanic_detail_m390.png`
- `ewo053_orders_shared_d1440.png`
- `ewo053_mechanic_partial_d1440.png`

Las fichas muestran lectura parcial de mantenimiento preventivo; los estados «Consultando» no se cuentan como consulta concluida. Los ejemplos cerrados/firmas ausentes del fixture no prueban validez de un cierre de dominio.

## Verificación y límites

Se leyó [EWO-053-browser.json](EWO-053-browser.json) final: **60 checks únicos PASS**, incluidos rutas/roles, retorno filtrado, siete pasos de UI, restricción de cierre, foco Mecánico, historial, error/reintento,1024/800/320, reduced motion y contraste focal. Los resultados dinámicos son del implementer; el auditor no repitió esas interacciones en browser. Los PNG no prueban por sí solos movimiento, foco anunciado, zoom físico, teclado virtual ni lector de pantalla. La revisión no declara cobertura exhaustiva de textos largos o accesibilidad.

El transporte es un fixture HTTP descartable. Los PATCH durante el recorrido del wizard modifican **solo memoria del fixture**, sin persistencia real ni validación backend; no se ejecutó cierre. No se afirma probar guardado, stock, firma, recuperación productiva ni autorización real por sesión/patio. La inspección del diff sustenta alcance visual y conservación de handlers, sin sustituir pruebas de invariantes del dominio.

Lint/build y diff-check pertenecen a la evidencia canónica del implementer; el auditor no los ejecutó ni convierte un build pendiente en PASS. **Hold SD / visual OK humano pendiente**. Este dictamen no autoriza push, despliegue ni ampliación a módulos excluidos.
