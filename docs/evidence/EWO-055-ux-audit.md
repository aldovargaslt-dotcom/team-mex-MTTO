# EWO-055 — Auditoría UX independiente de navegación móvil

Veredicto: **OK visual / PASS** para la corrección solicitada. Sin hallazgos accionables confirmados pendientes.

Revisor: subagente `ux-auditor`, independiente del implementer. Runtime solo lectura; no se manipuló el browser de proof. Este documento es el único archivo escrito por el auditor. Sin Playwright.

## Autoridad y alcance

Se abrió EWO-055 y el diff actual de AppShell/InventarioNav, separando la corrección055 de las modificaciones locales previas de mantenimiento. La instrucción posterior del propietario elimina la excepción móvil Admin: corresponde verificar el patrón inferior en ambos roles, no perpetuar el selector superior aprobado históricamente. Rigen contrato, UX del patrón Inventario, VISUAL_QA y fuentes locales leídas en esta sesión.

El delta retira el selector superior, comparte los cuatro destinos inferiores existentes con Admin y reserva espacio inferior. No se identifican rutas nuevas, ampliación de permisos ni migración de funciones adicionales Admin a esa barra. La condición excluye CHECK enfocado Admin y mantiene los breakpoints desktop/tablet.

## Resultado por criterio

| Criterio | Resultado actual |
| --- | --- |
| AC-01 | **PASS visual:** ambos roles390 tienen una sola barra inferior Inicio/Órdenes/Unidades/Inventario y carecen de selector superior. Los paneles390/320 muestran los seis destinos, Refacciones en Catálogo y actual único. |
| AC-02 | **PASS visual/registro acotado:** panel y barra permanecen nítidos, con fondo desenfocado, cierre visible y panel anclado por encima de la barra. El registro acredita toggle/Escape/retorno de foco, navegación y reserva de espacio. No se infiere interacción a partir de los PNG. |
| AC-03 | **PASS visual/documental acotado:** las capturas1440 mantienen sidebar/subnav y no muestran barra inferior. El registro informa pestañas800 y extras del menú global Admin conservados; el diff no altera sus destinos ni autorización. |
| AC-04 | **PASS para proof visual inspeccionado:** se revisaron ocho PNG actuales y el registro final54PASS; lint/build son responsabilidad de la evidencia canónica, sin convertir compilación pendiente en PASS desde este pase. |

No se observa duplicación de navegación ni recorte nuevo. La corrección conserva jerarquía, selección neutra y semántica de ubicación. No se inventan hallazgos para completar una cuota.

## Capturas inspeccionadas

Abiertas individualmente con `view_image`, paths relativos a `docs/screenshots/`:

- `ewo055_supervisor_stock_m390.png`
- `ewo055_supervisor_panel_m390.png`
- `ewo055_supervisor_panel_m320.png`
- `ewo055_supervisor_stock_d1440.png`
- `ewo055_admin_stock_m390.png`
- `ewo055_admin_panel_m390.png`
- `ewo055_admin_panel_m320.png`
- `ewo055_admin_stock_d1440.png`

Las capturas de stock cerrado muestran carga y acción disabled; acreditan ubicación/espaciado de navegación, no existencia de resultados cargados. Los paneles muestran seis enlaces completos y accesibles visualmente.

## Evidencia y límites

Se leyó [EWO-055-browser.json](EWO-055-browser.json): **54 checks PASS** desde role picker, ambos roles, destinos, toggle/foco, extras Admin, Órdenes/Unidades, padding,320/800/1440. Los resultados dinámicos son del implementer y no se repitieron por el auditor. Los PNG no prueban por sí solos lector de pantalla, teclado virtual, motion o autorización real.

El transporte es un fixture HTTP descartable: prueba presentación/navegación, no permisos backend, persistencia ni reglas de Inventario. Las auditorías anteriores conservan carácter histórico; no sustituyen estas ocho capturas actuales ni acreditan una regresión integral de toda la app. Lint/build/diff-check corresponden a la evidencia canónica del implementer.

**Hold SD / visual OK humano pendiente.** El dictamen independiente no autoriza push ni despliegue.
