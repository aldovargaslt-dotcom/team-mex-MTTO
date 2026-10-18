# EWO-049 — Auditoría UX independiente

Veredicto: **OK visual / PASS** para reclasificar Refacciones dentro de Catálogo. Sin hallazgos accionables confirmados en el cambio inspeccionado.

Revisor: subagente `ux-auditor`, independiente del implementer. Solo lectura de runtime; este documento es el único archivo escrito en el pase. Sin Playwright.

## Fuentes y alcance

Se leyeron EWO-049, el diff actual de InventarioNav e inventory-navigation, el RoleGate de Inventario y el registro final `EWO-049-browser.json`. Aplican las instrucciones del auditor, VISUAL_QA, sistema UI y gramática de navegación/filtros leídos en esta sesión. La petición expresa del propietario y el EWO sustituyen la clasificación histórica de Refacciones como operación; no crean nuevas capacidades ni permisos.

## Resultados

| Criterio | Resultado |
| --- | --- |
| AC-01 | **PASS visual/documental:** ambos desktop muestran Existencias, Análisis, Comprobantes y Catálogo; Refacciones aparece en la subnav de Catálogo junto a Categorías/Proveedores. El enlace Catálogo apunta a `/inventario`. |
| AC-02 | **PASS visual:** ambos paneles móviles contienen Refacciones únicamente en Catálogo; Operación mantiene tres destinos. Los seis enlaces y sus etiquetas son legibles, con actual único en las capturas. No se observan recortes ni duplicación. El registro final recorre selección única/cierre en las seis rutas. |
| AC-03 | **PASS documental y registro:** la raíz conserva `exact: true`; InventarioNav transmite `exact` al calcular catálogo y subdestino. Esto evita que Stock/Categorías/Proveedores activen Refacciones. RoleGate continúa permitiendo solo SUPERVISOR/ADMIN_DIRECTIVO, excluyendo MECANICO; no se modificó ese archivo ni rutas/permisos. |

La navegación conserva jerarquía primaria/secundaria y filtros separados. No se inventan defectos para completar una cuota de hallazgos; no se propone modificar CRUD, estilos ni la arquitectura del catálogo.

## Capturas actuales inspeccionadas

Se abrieron individualmente con `view_image`, paths relativos a `docs/screenshots/`:

- `ewo049_supervisor_catalog_d1440.png`
- `ewo049_admin_catalog_d1440.png`
- `ewo049_supervisor_catalog_menu_m390.png`
- `ewo049_admin_catalog_menu_m390.png`

Las capturas desktop muestran el estado «Cargando refacciones…»; sirven para revisar la ubicación en navegación, no para acreditar carga completa del catálogo.

## Evidencia dinámica y límites

Se releyó el JSON final: **64 comprobaciones PASS**, recorrido Supervisor/Admin desde role picker en1440/390, clasificación, selección única y ausencia de overflow en las seis rutas. El resultado preliminar interrumpido por espera del harness fue reemplazado por la ejecución final; no se interpreta como defecto del producto.

Los checks dinámicos son del implementer y no fueron repetidos por el auditor. El transporte usa fixture HTTP descartable: no prueba CRUD real, datos productivos, permisos backend ni autorizaciones contra proveedor real. La exclusión de MECANICO se verifica por el RoleGate existente y ausencia de cambio de permisos, sin afirmar una prueba de login productivo. Este pase no reutiliza capturas anteriores como evidencia actual ni declara verificación integral del resto del shell.

**Hold SD / visual OK humano pendiente.** Este dictamen no autoriza push ni despliegue.
