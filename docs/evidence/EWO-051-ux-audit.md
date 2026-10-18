# EWO-051 — Auditoría UX independiente

Veredicto: **OK visual / PASS** para la extensión estética clara de mantenimiento en las superficies inspeccionadas. Sin hallazgos accionables confirmados en este delta.

Revisor: subagente `ux-auditor`, independiente del implementer. Runtime solo lectura; este dictamen es el único archivo escrito por el auditor. Sin Playwright.

## Fuentes y alcance

Se abrieron SPEC-UI-MANTENIMIENTO-001 AC-01–05, UX `ux-mantenimiento-identidad-clara-v1.md`, EWO-051, el diff actual de AppShell/Mi trabajo y CSS scoped de mantenimiento. Rigen las instrucciones del auditor, VISUAL_QA, sistema UI, jerarquía, gramática, targets y proof-ui leídos en esta sesión. La ampliación estética de Mecánico está autorizada expresamente y no implica añadirle sidebar ni capacidades.

El cambio inspeccionado aplica tokens por ruta/rol, selección neutral y cabecera Mecánico clara. La restauración de foco de su sheet guarda el botón disparador y solo enfoca si sigue conectado; no se identificó una nueva regla de negocio en el delta. La revisión no migra la navegación de fichas ni rediseña catálogo, datos o procesos existentes.

## Resultados por criterio

| Criterio | Resultado de este pase |
| --- | --- |
| AC-01 | **PASS visual:** Órdenes, Unidades/ficha y visita Supervisor muestran base clara, identidad navy y superficies legibles. Admin conserva su consulta de cerradas. CTA naranja cuando corresponde, con estados textuales. |
| AC-02 | **PASS visual:** cola y orden seleccionadas usan superficie neutra e indicador navy; filtros permanecen separados de acciones y badges de condición. No se introducen KPIs ni datos nuevos en el delta. |
| AC-03 | **PASS visual/documental:** Mi trabajo1440/390 tiene cabecera clara legible, marca actual, lista y sheet coherentes; sin sidebar. No se modifica RoleGate ni se añaden acciones de negocio. |
| AC-04 | **PASS visual acotado:** listas/detalle, ficha Mantenimiento y paso Datos siguen reconocibles y sin desbordamiento visual nuevo en las capturas. Se observa error con Reintentar Mecánico y estado loading/disabled del wizard. El registro informa búsqueda/filtro,1024 y recuperación. |
| AC-05 | **PASS documental/registro acotado:** el código conserva overlay portaled y añade retorno de foco al disparador Mecánico. Targets/controles móviles y footer se presentan legibles. El registro informa retorno de foco, reduced motion y exclusiones de scope. No se afirma que los PNG prueben esos comportamientos dinámicos. |

Sin defectos confirmados: no se inventan hallazgos para completar una cuota. Las estructuras de ficha, cards/KPIs de Unidades y navegación de objeto existentes se evalúan como estructuras conservadas por la UX; este pase no autoriza rediseñarlas.

## Capturas actuales inspeccionadas

Se abrieron individualmente mediante `view_image` los14 PNG finales de [EWO-051-browser.json](EWO-051-browser.json), paths relativos a `docs/screenshots/`:

- `ewo051_supervisor_orders_d1440.png`, `ewo051_supervisor_orders_d390.png`
- `ewo051_supervisor_units_d1440.png`, `ewo051_supervisor_units_d390.png`
- `ewo051_supervisor_maintenance_d1440.png`, `ewo051_supervisor_maintenance_d390.png`
- `ewo051_supervisor_visit_d1440.png`, `ewo051_supervisor_visit_d390.png`
- `ewo051_mechanic_queue_d1440.png`, `ewo051_mechanic_queue_d390.png`
- `ewo051_mechanic_detail_d1440.png`, `ewo051_mechanic_detail_d390.png`
- `ewo051_admin_orders_d1440.png`
- `ewo051_mechanic_read_error_d1440.png`

La captura exploratoria `_first` no se usa. Los nombres `d390` corresponden a vistas móviles390. Visita muestra Datos con referencias cargando y botones disabled; ficha Mantenimiento muestra consulta parcial. Esos PNG acreditan estética/estado de carga, no formulario completamente cargado, validación de guardado ni cierre de mantenimiento.

## Registro y límites

Se leyó el JSON final: **35 comprobaciones PASS** del implementer, con role picker, navegación Supervisor/Mecánico, Admin,1024, error/reintento y scope CHECK/login/Logística/Inventario. El auditor no repitió dinámicamente las interacciones. Los PNG no acreditan por sí solos foco anunciado, contraste AA medido, motion, lector de pantalla ni teclado físico móvil; no se presentan como verificación integral de accesibilidad.

El transporte es un **fixture HTTP descartable**: acredita UI/URLs/estados controlados, no CRUD real, persistencia, reglas de mantenimiento ni permisos productivos. No se afirma que la consulta de Admin o Mecánico haya validado capacidades contra un backend real. El auditor no ejecutó lint/build; su estado pertenece a [la evidencia canónica](EWO-051.md), sin convertir una compilación pendiente en PASS.

**Hold SD / visual OK humano pendiente.** Este dictamen acotado no autoriza push, despliegue ni cambios de dominio.
