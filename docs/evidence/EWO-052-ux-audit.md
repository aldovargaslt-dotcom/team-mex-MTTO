# EWO-052 — Auditoría independiente del render de Órdenes

Veredicto: **OK visual / PASS** para el corte aprobado. Sin hallazgos visuales accionables confirmados en las superficies inspeccionadas. Esta revisión es posterior al render y no reutiliza como aprobación el pase documental previo a JSX.

Revisor: subagente `ux-auditor`, independiente del implementer. Runtime solo lectura; este documento es el único archivo escrito por el auditor. Sin Playwright.

## Fuentes y alcance

Se abrieron EWO-052, SPEC-UI-MANTENIMIENTO-002 (incluida autorización posterior exclusiva para Órdenes), UX §Corte aprobado — Órdenes EWO-052 y contrato vigente de DESIGN_SYSTEM. Se revisaron el diff de ordenes/page.tsx y CSS, OrderIdentity y el registro final. Aplican las fuentes locales de Visual QA, jerarquía, gramática, accesibilidad y proof-ui leídas en esta sesión.

La composición concreta autoriza PageHeader → toolbar de búsqueda/tipo → lista/detalle existentes → documento/estado compacto al inicio. La región blanca agrupa herramientas de consulta, sin nueva función. El diff retira la banda ancha de estado, estilos superados y literales del alcance; no se observa nueva API, permiso o condición de dominio. La base local051 queda preservada fuera del CSS de Órdenes sustituido.

## Resultados

- **Composición y jerarquía — PASS visual (AC-02/04/06/08):** objeto, condición y siguiente acción se reconocen con claridad. Documento/folio y unidad son conceptos diferenciados; metadatos subordinados. La toolbar tiene labels visibles, filtros neutros y relación clara con el listado. Filas con divisores sustituyen cards repetidas conservando selección navy. Estado compacto textual al inicio del detalle reemplaza la banda de un único estado.
- **Acciones/roles — PASS visual acotado (AC-04/07/08):** Supervisor conserva Nueva orden, Historial y Continuar; cuando la orden atendida tiene acción primaria, Nueva orden aparece secundaria. En móvil listado existe una sola acción naranja de tarea; detalle conserva retorno y H1 de unidad. Admin muestra consulta de cerradas y Ver detalle, sin CTA de creación. No se inventa una escritura para la vista de consulta.
- **Responsive/estados/overlay — PASS visual acotado (AC-05/12/13/14):** desktop1440 conserva lista→detalle; móvil390 y320 separa herramientas/listado, y detalle móvil mantiene identidad/acciones sin superposición nueva. Nueva orden abre íntegra en desktop/móvil con Cancelar y botón disabled legibles. Consulta parcial muestra causa y Reintentar, sin fingir catálogo vacío ni total remoto. El conteo se describe «En esta vista».
- **Marca/contraste — PASS por registro calculado (AC-03):** se requirió suplemento focal antes de cerrar este dictamen. El registro final incluye colores efectivos y ratios calculados: título13.09:1, label/meta5.77:1, badge5.78:1, selección14.74:1, CTA4.75:1 y outline de foco14.13:1. Los elementos medidos satisfacen umbrales de la SPEC; no se presenta como medición independiente de cada elemento del producto.

No se detecta bloqueo visual concreto ni se inventan hallazgos para completar una cuota. La revisión no rediseña otro módulo ni convierte todas las propuestas de SPEC002 en aprobadas.

## Capturas actuales inspeccionadas

Se abrieron individualmente mediante `view_image` los10 paths únicos del JSON final, relativos a `docs/screenshots/`:

- `ewo052_supervisor_detail_d1440.png`
- `ewo052_supervisor_new_order_d1440.png`
- `ewo052_supervisor_list_m390.png`
- `ewo052_supervisor_detail_m390.png`
- `ewo052_supervisor_new_order_m390.png`
- `ewo052_admin_detail_d1440.png`
- `ewo052_admin_list_m390.png`
- `ewo052_admin_detail_m390.png`
- `ewo052_supervisor_list_m320.png`
- `ewo052_supervisor_partial_d1440.png`

Las repeticiones de paths en el JSON no se cuentan como cobertura adicional. No se usa la captura exploratoria `ewo052_supervisor_orders_d1440.png` como evidencia final.

## Verificación y límites

Se leyó [EWO-052-browser.json](EWO-052-browser.json): **48 checks PASS**, incluidos búsqueda/recuperación, filtros/URL, borrador/cerrada/CHECK, visibilidad de escritura, overlay/foco,1024/800/320, parcial/reintento, reduced motion y contraste calculado. Los resultados dinámicos y ratios son del implementer, contrastados con el registro; el auditor no repitió su ejecución en browser. Las capturas no prueban por sí solas foco anunciado, teclado virtual, zoom físico, motion ni una auditoría exhaustiva de accesibilidad. Los datos largos y todas las combinaciones de contraste no se consideran probados por fixtures cortos.

El transporte HTTP descartable valida UI/URLs/estados controlados; no prueba guardados reales, firma, stock, cierre, CRUD ni autorización backend por sesión/patio. Admin/Mecánico/otras superficies conservan el alcance y límites registrados; no se infiere una regresión integral desde este corte. La prueba CHECK acredita lectura de inspección según registro, no una transición de mantenimiento. Lint/build y diff-check pertenecen a la evidencia canónica del implementer; este auditor no los ejecutó ni convierte build pendiente en PASS.

**Hold SD / visual OK humano pendiente.** Este dictamen no autoriza push, despliegue ni ejecución de otros cortes de SPEC002.
