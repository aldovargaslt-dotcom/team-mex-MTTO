# Evidence — EWO-047, revisión de navegación móvil (AC-09)

## Summary

Revisión solicitada por el propietario sobre el piloto: mejorar la navegación superior de Inventario en móvil. Implementer: Codex. Fuente: [SPEC AC-09](../specs/SPEC-UI-SUPERVISOR-001.md), [UX revisión](../design-system/ux-supervisor-identidad-sidebar-v1.md), [EWO](../engineering-work-orders/EWO-047.md). Sin cambios de API/datos/permisos ni despliegue.

## Files Changed

- InventarioNav.tsx: disparador con sección actual, Sheet inferior y seis destinos reales agrupados en Operación/Catálogo. Panel accesible, cancelación y foco; adaptación al cruzar768px.
- globals.css: estilos acotados al selector/panel, visibilidad móvil de subnav, scroll contenido, safe-area y reduced motion.
- SPEC/UX/EWO: AC-09, dirección y verificación de la revisión solicitada.

## Tests Added / Changed

Prueba de interacción CDP nativa mediante /tmp/ewo047-mobile-nav-proof.mjs, reutilizando fixture HTTP descartable y Next en3000. Sin Playwright, dependencias nuevas ni tests que repliquen CSS. [Resultados completos](EWO-047-mobile-nav.json):57 checks PASS,12 PNG finales.

## Tests Executed

| Comando / pase | Resultado | Evidencia |
|---|---|---|
| `cd web && npm run lint` | PASS | /tmp/ewo047-mobile-nav-lint.log, exit0. |
| `cd web && npm run build` | PASS | Build final exit0: compilación, tipos y generación estática. /tmp/ewo047-mobile-nav-build.log. |
| `node /tmp/ewo047-mobile-nav-proof.mjs` | PASS | 57 checks y12 PNG en JSON. |
| better-ui | PASS | Inspección acotada: overlay sin clipping, scroll contenido, foco visible, tokens/radios/iconos existentes, sin HIGH pendientes. |
| ux-auditor independiente | PASS | [Dictamen](EWO-047-mobile-nav-audit.md),12 capturas finales inspeccionadas. |
| `git diff --check` | PASS | Sin errores de whitespace. |
| API unit/e2e | SKIPPED | No requeridos por esta revisión visual; sin cambios de API ni contratos. No se afirma validación backend real. |
| Hold SD / visual OK humano | SKIPPED | Pendiente de que el propietario pruebe la revisión. |

## Acceptance Criteria

**AC-09 — PASS.** Supervisor390 y320; Admin390, entrada por picker. Para cada combinación: seis destinos, etiqueta actual, sin overflow de página, selección actual anunciada, hit≥44, apertura en foco actual, Escape y selección del destino actual devuelven foco. Navegación real por todos los destinos y actualización con Atrás/Adelante. Altura360: panel≤90dvh, scroll vertical y Proveedores accesible. Foco contenido mediante Tab, reduced motion0s en panel/chevron, resize1440 cierra y enfoca pestaña desktop. Desktop conserva cinco enlaces primarios y subnav Catálogo.

La verificación anterior AC-01–08 permanece histórica en [EWO-047](EWO-047.md); sus capturas móviles previas a esta revisión muestran la navegación antigua. Las pruebas focales nuevas sustituyen la evidencia visual de navegación móvil, sin afirmar que se repitió el resto de pruebas del piloto.

## Domain / Architecture / Scope

Sin reglas de stock/documentos/costos ni rutas nuevas. Se reutiliza el Sheet del menú móvil como patrón de navegación en panel, con enlace activo muted/check y no filtro. Las pestañas y subnav Catálogo siguen en desktop; solo su presentación <768 cambia. Las listas y acciones conservan distribución/función. No se cambia topbar de marca ni bottom nav Supervisor.

## Visual Evidence

- [Existencias390](../screenshots/ewo047_mobile_nav_supervisor_m390_existencias.png).
- [Secciones390](../screenshots/ewo047_mobile_nav_supervisor_m390_secciones.png).
- [Secciones320](../screenshots/ewo047_mobile_nav_supervisor_m320_secciones.png).
- [Admin390](../screenshots/ewo047_mobile_nav_admin_m390_secciones.png).
- [Altura corta](../screenshots/ewo047_mobile_nav_short_height_m390.png).
- [Desktop](../screenshots/ewo047_mobile_nav_desktop_existencias_d1440.png).

## Deviations / Known Limitations

Ninguna desviación funcional. Primer intento de lint se invocó desde la raíz sin package.json y falló antes de ejecutar eslint; se corrigió al directorio web y pasó. Capturas exploratorias previas se retiraron para conservar solo pruebas finales de esta revisión.

Datos ficticios, no API productiva ni dispositivo físico o lector de pantalla. Movimiento comprobado mediante estilos efectivos y cambio de estado, sin nueva animación de carga. Al cancelar, foco de Radix vuelve al disparador; al navegar a otra ruta se conserva la gestión de foco de Next; al ampliar se enfoca pestaña visible. No se instala infraestructura ni se despliega.

## Follow-up / Verification completeness

Todos los checks técnicos requeridos completados; pendiente prueba visual del propietario. Vista previa del workspace en puerto3000, datos simulados. Se reinicia después de build, sin convertirlo en URL pública ni despliegue.
