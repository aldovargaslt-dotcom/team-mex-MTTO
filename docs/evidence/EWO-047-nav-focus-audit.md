# EWO-047 — Auditoría independiente del foco visual AC-11

Veredicto: **OK visual**, sin hallazgos accionables confirmados en este delta. La navegación abierta concentra la atención; el panel y la barra inferior conservan nitidez y legibilidad, mientras cabecera/contenido pasan a segundo plano. Al cerrar, la captura vuelve a mostrar contenido nítido. No se extrapola cobertura funcional del resto del piloto.

Revisor: subagente `ux-auditor`, independiente del implementer. Solo lectura de runtime; este dictamen es el único archivo escrito en el pase. Sin Playwright.

## Autoridad e inspección

Se abrieron SPEC-UI-SUPERVISOR-001 AC-11, la sección «Foco visual solicitado» de `ux-supervisor-identidad-sidebar-v1.md` y el delta CSS en globals. Rigen las fuentes locales de Visual QA, jerarquía, overlays y proof-ui ya abiertas en [la auditoría principal](EWO-047-ux-audit.md).

AC-11 enmienda expresamente la ausencia de atenuación de AC-10. El desenfoque solicitado no se trata como decoración no autorizada ni como motivo para exigir un modal: el panel continúa no modal y la barra debe permanecer operable. El selector CSS se limita al panel inferior abierto y al breakpoint móvil; no modifica layout, destinos ni API.

Se inspeccionaron individualmente con `view_image` las cinco capturas finales de [EWO-047-nav-focus.json](EWO-047-nav-focus.json), paths relativos a `docs/screenshots/`:

- `ewo047_nav_focus_supervisor_open_m390.png`
- `ewo047_nav_focus_supervisor_closed_m390.png`
- `ewo047_nav_focus_desktop_d1440.png`
- `ewo047_nav_focus_supervisor_open_m320.png`
- `ewo047_nav_focus_admin_m390.png`

## Resultado visual

- **Jerarquía — PASS:** abierto a 390/320, el tratamiento del fondo reduce competencia con el título, grupos y enlaces del panel. Los seis destinos y cierre permanecen legibles; no se añaden CTA ni colores de filtro. Fuente: AC-11 y VISUAL_HIERARCHY.
- **Límites de superficie — PASS:** panel y barra se ven nítidos, sin desenfoque heredado ni solapado nuevo; el fondo conserva contexto reconocible con atenuación. Fuente: AC-11 y OPERATE_CRAFT §Overlays.
- **Restauración y exclusiones — PASS visual:** el cerrado móvil y desktop aparecen nítidos. Admin conserva su overlay modal existente con fondo oscurecido y sin el nuevo desenfoque. Fuente: AC-11 y UX.

Sin defectos confirmados: estas tres observaciones son resultados, no hallazgos inventados.

## Evidencia dinámica y límites

Se leyó el registro focal final: **18 checks PASS**. Documenta valores efectivos de blur/opacidad, nitidez de panel/barra, bloqueo de puntero en fondo, toque sobre CTA que solo descarta, restauración por toque exterior/Escape/toggle/navegación/cambio de módulo/resize, reduced motion0, 320 sin overflow y exclusión Admin. Los resultados corresponden al implementer; no fueron repetidos en browser por este auditor. Los PNG no prueban duración de opacidad, coste del filtro, foco anunciado por lector de pantalla ni comportamiento en dispositivo físico. El cambio CSS inspeccionado anima solo opacidad150ms y mantiene blur instantáneo, conforme a la UX.

No se revalida aquí toda la matriz AC-01–10: véanse sus dictámenes y registros separados. **Hold SD / visual OK humano vigente**; este OK no autoriza despliegue ni sustituye evaluación del ensayo por el propietario.
