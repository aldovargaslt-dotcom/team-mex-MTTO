# Evidence — EWO-047, foco visual de navegación (AC-11)

## Summary / Scope

Revisión explícita del propietario: desenfocar ligeramente el resto para enfocar navegación. Fuente canónica: [SPEC AC-11](../specs/SPEC-UI-SUPERVISOR-001.md); [UX](../design-system/ux-supervisor-identidad-sidebar-v1.md); [EWO](../engineering-work-orders/EWO-047.md). Solo CSS funcional de header/main durante apertura del panel inferior móvil Supervisor. Panel/barra, destinos, datos, permisos y comportamiento de Admin conservados. No despliegue.

## Files Changed

`globals.css`: blur2px, opacity0.5 y pointer-events:none del contexto, transición solo de opacity150ms. Selectores acotados por viewport y estado open. SPEC/UX/EWO y estos resultados, [JSON focal](EWO-047-nav-focus.json), [auditoría independiente](EWO-047-nav-focus-audit.md) y cinco PNG nuevos. InventorySectionMenu no cambió en esta revisión.

## Tests Executed

| Comando / pase | Resultado | Evidencia |
|---|---|---|
| `cd web && npm run lint` | PASS | /tmp/ewo047-nav-focus-lint.log, exit0. |
| `cd web && npm run build` | PASS | Build final exit0; compilación, tipos y generación estática. /tmp/ewo047-nav-focus-build.log. |
| `node /tmp/ewo047-nav-focus-proof.mjs` | PASS | 18 comprobaciones, cinco PNG; Chromium CDP, sin Playwright. |
| better-ui | PASS | Contexto desenfatizado, panel/barra nítidos, sin cambios de layout o clipping; filtro no animado, reduced motion0. Sin HIGH pendientes. |
| ux-auditor independiente | PASS | Cinco capturas y18 checks focales revisados; dictamen enlazado. |
| `git diff --check` | PASS | Sin errores de whitespace. |
| API unit/e2e | SKIPPED | No requeridos: no cambian runtime backend, contratos ni reglas. |
| Hold SD / visual OK humano | SKIPPED | Pendiente de evaluación del propietario; no sustituido por auditor. |

## Acceptance Criteria

**AC-11 — PASS técnico.** Con panel open a390: header y main tienen blur2px/opacity0.5, pero panel/barra filter:none/opacity1 y barra operable. El fondo no recibe acciones de puntero; tocar Registrar entrada solo cierra la navegación sin abrir diálogo ni navegar. Restauración confirmada al tocar fondo, Escape (con foco al botón), retocar Inventario, seleccionar Comprobantes, cambiar a Unidades y ampliar a1440. Sin overflow a320. Reduced motion fuerza0s y restaura sin demora. El modal Admin no recibe el tratamiento nuevo.

Los resultados AC-10 y anteriores se conservan como historia; esta revisión sustituye la ausencia de atenuación del fondo, no la navegación no modal o accesibilidad de la barra. No se afirma repetición de todos los checks históricos.

## Visual Evidence

- [Abierto390](../screenshots/ewo047_nav_focus_supervisor_open_m390.png).
- [Abierto320](../screenshots/ewo047_nav_focus_supervisor_open_m320.png).
- [Restaurado390](../screenshots/ewo047_nav_focus_supervisor_closed_m390.png).
- [Desktop sin efecto](../screenshots/ewo047_nav_focus_desktop_d1440.png).
- [Admin sin cambio](../screenshots/ewo047_nav_focus_admin_m390.png).

## Deviations / Known Limitations

El entorno ya no conservaba servidores ni scripts temporales anteriores. El primer intento de proof no arrancó por helper CDP ausente; se reconstruyeron helper, fixture HTTP y preview local y se ejecutaron las18 comprobaciones completas. Sin cambios de código de producto para esta recuperación. Datos ficticios; no API real, dispositivo físico ni lector de pantalla. No se midió rendimiento en hardware de campo; el filtro cambia una vez por estado y solo opacity se anima, evitando animar blur.

El blur es una petición funcional explícita de foco, acotada al estado de navegación, no adopción de blur decorativo de recetas externas. Tocar fondo cierra sin activar acciones subyacentes; la barra permanece disponible. Motion reducido conserva señal visual pero elimina transición.

## Follow-up / Verification completeness

Todos los checks técnicos requeridos completados; pendiente evaluación humana del efecto. Preview temporal puerto3000 con fixture descartable; se reinicia tras build. Sin push o despliegue.
