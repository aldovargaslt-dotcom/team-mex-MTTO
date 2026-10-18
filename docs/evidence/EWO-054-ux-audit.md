# EWO-054 — Auditoría independiente del render de Inventario

Veredicto: **OK visual / PASS** para las superficies inspeccionadas. Sin hallazgos accionables confirmados pendientes. La revisión documental previa no sustituye este pase sobre el render.

Revisor: subagente `ux-auditor`, independiente del implementer. No se manipuló el browser de proof ni se editó runtime; este documento es el único archivo escrito por el auditor. Sin Playwright.

## Fuentes y alcance

Se abrieron SPEC-UI-INVENTARIO-001 AC-01–09, UX `ux-inventario-identidad-clara-v1.md`, EWO-054, diff de layout/wrappers de consulta/InventoryAnalysis y CSS scoped, además del registro final. Se aplicaron contrato DESIGN_SYSTEM, VISUAL_QA, patrón/jerarquía, gramática, targets y proof-ui leídos en esta sesión.

El delta reutiliza OperationalToolbar y tokens del workspace/portales. No cambia destinos, RoleGate, cálculos, handlers de movimientos/costos ni estructura/lógica del editor de alertas. No se interpreta esta pasada como autorización para reescribir sus AC-01–15 funcionales.

## Resultado de inspección

- **Jerarquía/componentes — PASS visual (AC-01–04):** seis secciones coherentes, títulos navy y superficies claras; herramientas agrupadas en las cuatro consultas. Datos, unidades, SKU, condiciones y acciones siguen diferenciados. Catálogos separan formulario de alta de búsqueda/lista sin card decorativa para el buscador único. Selección/filtros neutros, pasteles semánticos y una acción sólida de tarea cuando procede.
- **Navegación/responsive — PASS visual acotado (AC-05/07):** sidebar conserva Refacciones en Catálogo y sububicación única. Móvil mantiene variante Supervisor/Admin. Controles y datos observados envuelven sin desbordamiento global nuevo; tablas pueden conservar scroll local. Algunas capturas de Análisis muestran carga/lectura parcial y acreditan ese estado, no consulta completa.
- **Overlays — PASS visual acotado (AC-06/08):** ficha, alta, entrada, comprobante y alertas mantienen anatomía legible, labels y controles visibles. La selección oculta y lote mixto del editor se reconocen sin solapado; footer/CTA conserva posición y la lista su scroll. La captura extra del footer de entrada acredita Cancelar alcanzable. No se ha aprobado un guardado ni una recuperación de dominio con estas imágenes.
- **Contraste/foco — PASS focal por registro (AC-08):** valores efectivos registrados: título13.09:1, label5.77:1, conteo5.34:1 e input16.76:1. Las imágenes de entrada/ficha/alta muestran foco navy legible; el registro contiene comprobaciones de outline y reduced motion. No equivale a auditoría exhaustiva de contraste o accesibilidad de cada control.

## Observaciones resueltas antes de cerrar

1. En capturas iniciales de entrada390 no se veía X. Se pidió contrastar geometría y recapturar: las imágenes finales de ambos roles muestran X; el registro acredita hit44×44 visible y Cancelar alcanzable/cierre seguro. No se confirmó defecto runtime ni se cambió código por esta sospecha.
2. La primera captura de Movimientos mostraba Entrada con cantidad negativa y filtro Salidas. Se corrigió el enum inválido **solo en fixture** a SALIDA_OT y se reabrió la captura final: ahora muestra Salida y -3pza. No se propone ni acredita modificación de reglas de movimientos.
3. Faltaban imágenes de alta para inspeccionar el overlay afectado por tokens. Se solicitaron y abrieron las dos capturas finales1440/390; el hueco de cobertura visual quedó cerrado, sin cambio runtime.

No quedan hallazgos visuales accionables de este pase; las observaciones anteriores no se presentan como tres defectos de producto.

## Capturas inspeccionadas

Se abrieron individualmente con `view_image` los **44 paths únicos finales** de [EWO-054-browser.json](EWO-054-browser.json), bajo `docs/screenshots/`. Índice compacto de los paths exactos inspeccionados:

- Las36 combinaciones `ewo054_{rol}_{ancho}_{vista}.png`, con rol `supervisor`/`admin`, ancho `1440`/`390` y vista `stock`, `items`, `analysis`, `documents`, `categories`, `providers`, `alerts`, `entry`, `document_detail`.
- `ewo054_empty_stock.png`, `ewo054_error_stock.png`, `ewo054_analysis_custom_m390.png`, `ewo054_entry_footer_m390.png`.
- `ewo054_item_detail_1440.png`, `ewo054_item_detail_390.png`, `ewo054_new_item_1440.png`, `ewo054_new_item_390.png`.

Se reabrieron las recapturas finales de entrada390 y Movimientos. Los paths repetidos del registro no cuentan como cobertura adicional. Las nuevas imágenes de alta muestran controles/aviso existentes; no acreditan un intento de creación ni su persistencia.

## Registro y límites

Se leyó el JSON final: **114 PASS y2 RESOLVED de harness/fixture;44 PNG únicos**. Los RESOLVED corresponden a expectativa de copy de vacío y forma de respuesta de costos del fixture; las comprobaciones finales repetidas no requieren cambio de producto. El registro incluye ambos roles1440/390, smoke1024/800/320, filtros, estados controlados/reintento, redirects heredados, overlays y foco/scroll/reduced motion. Los resultados dinámicos son del implementer; este auditor no repitió interacciones en browser.

El transporte HTTP es descartable: no prueba permisos backend, stock/costos, CRUD, consumo calculado, eventos ni persistencia real. La matriz funcional histórica de alertas se conserva por inspección del delta y smoke actual; **no se declara reejecutada íntegramente** (lotes por unidad, calendario mensual, ajuste crítico y recuperación de guardados parciales). No se realizaron guardados reales. Los PNG no prueban teclado virtual, lector de pantalla, zoom físico, todos los targets o motion por sí solos.

Lint/build/diff-check corresponden a [la evidencia canónica](EWO-054.md); no fueron ejecutados por el auditor. **Hold SD / visual OK humano pendiente**. Este OK independiente no autoriza push, despliegue ni ampliación de alcance.
