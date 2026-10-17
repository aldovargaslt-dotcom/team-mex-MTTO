# EWO-050 — Auditoría UX independiente

Veredicto: **OK visual / PASS** para subnavegación desktop de Inventario en sidebar. Sin hallazgos accionables confirmados en las superficies inspeccionadas.

Revisor: subagente `ux-auditor`, independiente del implementer. Runtime solo lectura; este documento es el único archivo escrito por el auditor. Sin Playwright.

## Fuentes y alcance

Se abrieron EWO-050, `ux-sidebar-module-navigation-v1.md`, el estándar aprobado en DESIGN_SYSTEM, diff WorkspaceSidebar/InventorySectionMenu y CSS scoped de EWO-050. Rigen las instrucciones del auditor, VISUAL_QA, jerarquía, gramática de navegación y fuentes locales leídas en esta sesión. La nueva UX sustituye expresamente las pestañas desktop para Inventario con sidebar; no se consideran ausencia accidental.

Se separó este delta de las correcciones locales anteriores EWO-048/049. Este pase no las revalida íntegramente ni migra Configuración, otros módulos/roles, steppers o navegación de ficha. El estándar futuro queda documentado sin afirmar que esos módulos ya lo implementan.

## Resultados

| Criterio | Resultado actual |
| --- | --- |
| AC-01 | **PASS visual:** sidebar expandida muestra Existencias, Análisis, Comprobantes y grupo Catálogo con Refacciones/Categorías/Proveedores. No queda subnav horizontal duplicada en las capturas desktop. El destino actual tiene selección neutra clara. |
| AC-02 | **PASS visual/documental acotado:** disclosure y chevron reconocibles, jerarquía de hijos legible y rail sin enlaces recortados. A altura corta la sidebar presenta scroll interno y mantiene el plegado accesible. El código conserva enlaces reales y `aria-current=page` solo en subdestino; el padre usa disclosure `aria-expanded/controls`. El registro informa recorrido, cierre/reapertura, teclado, rail, historial y resize/foco. |
| AC-03 | **PASS visual/documental acotado:** ambos roles conservan los seis destinos en móvil390 y su tratamiento existente (bottom panel Supervisor/selector Admin). El diff no altera RoleGate, rutas, API ni CRUD. El registro informa continuidad de pestañas800. |
| AC-04 | **PASS documental:** DESIGN_SYSTEM y UX fijan estándar desktop/teléfono y limitan aplicación actual a Inventario; Configuración, filtros, steppers y fichas quedan fuera de la migración. |

La sububicación se integra en el módulo sin competir con el título/acción de tarea. Superficies y filtros siguen neutros; no se añaden cards, sombras ni CTA. No se inventan hallazgos para cubrir una cuota.

## Capturas actuales inspeccionadas

Abiertas individualmente mediante `view_image`, paths relativos a `docs/screenshots/`:

- `ewo050_supervisor_sidebar_catalog_d1440.png`
- `ewo050_admin_sidebar_catalog_d1440.png`
- `ewo050_supervisor_sidebar_d1024.png`
- `ewo050_admin_sidebar_d1024.png`
- `ewo050_supervisor_rail_d1440.png`
- `ewo050_admin_rail_d1440.png`
- `ewo050_supervisor_mobile_menu_m390.png`
- `ewo050_admin_mobile_menu_m390.png`

Las capturas1024 muestran datos de Refacciones cargando; acreditan navegación/scroll y jerarquía, no una carga completa de catálogo. Las anteriores auditorías no se usan como sustituto de estas capturas actuales.

## Registro y límites

Se leyó [EWO-050-browser.json](EWO-050-browser.json): **61 checks PASS** del implementer, con role picker, ambos roles, seis rutas, selección/disclosure, rail, historial, altura corta,800/390, resize y reduced motion. El auditor no repitió dinámicamente esos pasos; los PNG no prueban por sí solos teclado, foco anunciado, duración o retorno de historial.

El fixture HTTP descartable acredita navegación y URLs, **no backend, CRUD real, datos productivos ni autorización productiva**. Se inspeccionó el delta de código para alcance, sin declarar una regresión integral del shell ni adoptar otros módulos. Este pase no ejecutó lint/build; corresponden a la evidencia canónica del implementer.

**Hold SD / visual OK humano pendiente.** No autoriza push, despliegue ni migraciones adicionales.
