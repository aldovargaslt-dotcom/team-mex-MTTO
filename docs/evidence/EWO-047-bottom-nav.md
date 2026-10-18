# Evidence — EWO-047, ensayo desde barra inferior (AC-10)

## Summary

Ensayo autorizado por el propietario («tratemosla») tras proponer apertura desde Inventario activo en la barra inferior. Implementer: Codex. Fuentes: [SPEC AC-10](../specs/SPEC-UI-SUPERVISOR-001.md), [UX ensayo](../design-system/ux-supervisor-identidad-sidebar-v1.md), [EWO](../engineering-work-orders/EWO-047.md). No se afirma superioridad comparativa ni aprobación visual humana final.

## Files Changed

- AppShell.tsx: Inventario es enlace directo desde otros módulos y disparador del panel cuando está activo; los otros tres accesos permanecen enlaces.
- InventorySectionMenu.tsx: componente común para menú inferior no modal de Supervisor y selector superior modal de Admin. Maneja foco, cierre, resize y navegación.
- lib/inventory-navigation.ts: destinos/selección existentes compartidos por los dos disparadores y las pestañas desktop.
- InventarioNav.tsx: conserva pestañas desktop y selector superior solo de Admin; Supervisor móvil recupera el espacio de ese control.
- globals.css: panel por encima de barra, flecha de apertura, fade funcional sin tapar los hit targets de la barra y reduced motion.
- SPEC/UX/EWO, este registro, JSON browser, auditoría y nueve PNG finales.

## Tests Added / Changed

Chromium CDP nativo, sin Playwright ni dependencias nuevas; /tmp/ewo047-bottom-nav-proof.mjs y /tmp/ewo047-bottom-nav-supplement.mjs. Role picker real; Next3000 con fixture HTTP descartable en3001. Sin API ni base productivas. [JSON consolidado](EWO-047-bottom-nav.json):55 comprobaciones PASS y9 capturas.

## Tests Executed

| Comando / pase | Resultado | Evidencia |
|---|---|---|
| `cd web && npm run lint` | PASS | Pase final exit0, /tmp/ewo047-bottom-nav-lint.log. |
| `cd web && npm run build` | PASS | Pase final exit0: compilación, tipos y33 páginas; /tmp/ewo047-bottom-nav-build.log. |
| CDP proof y suplemento | PASS | 55 comprobaciones consolidadas, sin FAIL pendientes. |
| better-ui | PASS | Sin HIGH pendientes; hallazgos/correcciones acotados abajo. |
| ux-auditor independiente | PASS | [Dictamen](EWO-047-bottom-nav-audit.md):9 PNG finales y55 checks inspeccionados. |
| `git diff --check` | PASS | Sin errores de whitespace. |
| API unit/e2e | SKIPPED | No requerido: no cambia API, contratos, permisos o reglas de dominio. |
| Hold SD / visual OK humano | SKIPPED | Pendiente de evaluación del propietario; no se sustituye por auditor automático. |

## Acceptance Criteria

**AC-10 — PASS técnico.** Supervisor390/320: primer toque entra en Stock; retocar Inventario activo abre/cierra seis destinos; sin selector superior. Panel alineado a la barra, hit≥44, sin backdrop ni pointer blocking, aria-expanded y aria-modal=false. Se recorrieron seis destinos, cancelación/Escape y selección actual, sin redirección accidental a Stock. Atrás/Adelante actualizan contexto. Clic fuera cierra, Unidades funciona con un toque desde panel abierto y Órdenes/Inicio permanecen directos.

Altura360: scroll vertical propio y Proveedores alcanzable. Tab sale hacia barra y Shift+Tab al disparador; Enter nativo abre; Escape devuelve foco. Reduced motion0s. Resize1440 cierra y enfoca pestaña desktop. Admin conserva selector, seis destinos y modalidad explícita true. Su navegación a Comprobantes permanece operativa.

El suplemento observó frames de entrada: bottom del panel785px coincide con top de barra785px; opacidad varía de0.017 a0.776 y el hit test del botón permanece correcto durante la animación. No se infiere motion a partir de PNG.

La evidencia AC-01–09 anterior se conserva como historia; AC-10 sustituye solo la ubicación/semántica del selector Supervisor móvil. No se afirma que los demás tests del piloto se hayan repetido completos.

## better-ui — hallazgos y correcciones

| Severidad | Superficie | Hallazgo | Corrección / verificación |
|---|---|---|---|
| MEDIUM | Panel no modal | Radix Dialog mantiene loop de Tab incluso con trapped=false | Captura acotada de Tab en límites permite salir hacia barra; tests de Tab/Shift+Tab y Enter. No se altera primitiva global. |
| MEDIUM | Entrada del panel | Slide heredado puede cruzar la barra al entrar/salir | Fade200ms sin traslación en esta variante; frames/hit tests confirman barra libre durante entrada. |
| LOW | Semántica de variantes | Modalidad dependía implícitamente de comportamiento del componente base | aria-modal explícito false/true por variante; nombre de disparador indica mostrar/ocultar y estado expandido. |

Approve para el alcance inspeccionado. Sin cambios de radios, sombras decorativas, escala de botones, coreografías ni librerías de animación. Reduced motion conserva0s de la convención local.

## Domain / Architecture / Scope

Sin datos, permisos, API, backend ni cambios de negocio. Destinos, etiquetas y reglas existentes. No se inventan subsecciones para Órdenes/Unidades/Inicio. Desktop conserva pestañas; Admin conserva acceso superior al no tener bottom nav. La extracción comparte metadatos de navegación UI, no autoridad de permisos (RoleGate/backend permanecen).

## Visual Evidence

- [Supervisor390, cerrada](../screenshots/ewo047_bottom_nav_supervisor_existencias_m390.png).
- [Supervisor390, abierta](../screenshots/ewo047_bottom_nav_supervisor_secciones_m390.png).
- [Supervisor320](../screenshots/ewo047_bottom_nav_supervisor_secciones_m320.png).
- [Comprobantes390](../screenshots/ewo047_bottom_nav_supervisor_comprobantes_m390.png).
- [Altura corta](../screenshots/ewo047_bottom_nav_short_height_m390.png).
- [Admin](../screenshots/ewo047_bottom_nav_admin_m390.png).
- [Desktop](../screenshots/ewo047_bottom_nav_desktop_d1440.png).

Los nueve archivos finales están catalogados en JSON; capturas exploratorias retiradas.

## Deviations / Known Limitations

El primer check Admin esperaba aria-modal=true que Radix no declara por defecto, aunque conservaba overlay y bloqueo exterior; ahora el componente declara explícitamente ambas variantes. El primer envío CDP de Enter sin texto nativo no activó el botón; se corrigió el harness para enviar Enter con carriage return y se verificó activación nativa, sin añadir un handler de Enter de producto.

Pruebas con datos ficticios, no dispositivo físico, lector de pantalla ni integración API real. Este ensayo permite evaluar claridad y acceso con el propietario; no equivale a comparación de eficiencia entre alternativas ni a recomendación universal por ser más moderno.

## Follow-up / Verification completeness

Todos los checks técnicos requeridos completados; pendiente evaluación visual humana. Vista previa puerto3000 se reinicia tras build; no despliegue ni URL pública nueva. No otros checks técnicos omitidos.
