# EWO-047 — Auditoría UX independiente

Veredicto: **OK visual para las superficies inspeccionadas**. Sin hallazgos accionables confirmados. Se sostienen jerarquía, filtros neutros y un CTA sólido cuando procede; no se requieren cambios de producto para este pase.

Revisor: subagente `ux-auditor`, independiente del implementer. Pase de solo lectura sobre runtime; este archivo es el único artefacto escrito por el auditor. Inspección real mediante `view_image`, sin Playwright.

## Autoridad y alcance

Se abrieron `.cursor/agents/ux-auditor.md`, EWO-047, SPEC-UI-SUPERVISOR-001 y `docs/design-system/ux-supervisor-identidad-sidebar-v1.md`, además de VISUAL_QA, EXTERNAL_SKILLS y el brief de chrome. Se aplicaron PAGE_PATTERNS, VISUAL_HIERARCHY, UI_ANTI_PATTERNS, DESIGN_SYSTEM, OPERATE_CRAFT, ADR-003, proof-ui y briefs locales de densidad, filtros, botones y targets, leídos en esta sesión.

La UX del piloto enmienda expresamente la geometría topbar para Supervisor/Admin: la sidebar clara a partir de 1024 px no constituye incumplimiento de la topbar histórica. Se conservan tokens de marca, tareas y reglas. Se revisaron AppShell, el nuevo WorkspaceSidebar, CSS y los cambios acotados de Comprobantes/Piezas; sin modificaciones de API runtime en el diff inspeccionado.

## Resultado de la inspección

1. **Navegación y jerarquía — PASS visual.** Sidebar expandida/plegada reconocible, destino activo con indicador naranja, tooltips visibles sin recorte, contenido legible a 1440 y 1024. Admin conserva destinos secundarios y Usuarios; menú completo a 800/390, navegación inferior Supervisor conservada. Fuentes: SPEC AC-01–04/08, UX §States/Mobile, VISUAL_HIERARCHY.
2. **Comprobantes y overlays — PASS visual.** Filtros neutros, listado documental conservado, acciones secundarias claras; sheets y menús no quedan recortados. Loading, empty y error usan feedback textual. «Tomar o subir» permanece en español. Fuentes: SPEC AC-05/06, PAGE_PATTERNS 3/7/10, OPERATE_CRAFT §Overlays, proof-ui.
3. **Piezas — PASS visual.** Las capturas muestran cantidad **19 contra stock 4**: warning e input inválido con Continuar disabled; compra externa elimina bloqueo y muestra Continuar naranja enabled. A 390 px el footer queda accesible y los controles se presentan con tamaño táctil. Fuentes: SPEC AC-05/06, UX §Mobile, proof-ui y brief mobile 44px.

No se inventan tres hallazgos para completar una cuota: estas tres entradas describen observaciones verificadas, no defectos. La sospecha preliminar de doble destino activo en Configuración/Usuarios se retiró al comprobar que los href reales son rutas hermanas `/configuracion/alertas` y `/configuracion/usuarios`.

## PNG inspeccionados

Todos los siguientes paths son relativos a `docs/screenshots/` y se abrieron individualmente; no se infiere cobertura a partir del nombre del archivo.

- `ewo047_supervisor_comprobantes_d1440.png`, `ewo047_supervisor_comprobantes_d1024.png`, `ewo047_supervisor_comprobantes_t800.png`, `ewo047_supervisor_comprobantes_m390.png`.
- `ewo047_supervisor_plegada_foco_d1440.png`, `ewo047_supervisor_plegada_foco_d1024.png`.
- `ewo047_supervisor_comprobante_sheet_d1440.png`, `ewo047_supervisor_comprobante_sheet_d1024.png`, `ewo047_supervisor_comprobante_sheet_t800.png`, `ewo047_supervisor_comprobante_sheet_m390.png`.
- `ewo047_supervisor_menu_t800.png`, `ewo047_supervisor_menu_m390.png`.
- `ewo047_admin_comprobantes_d1440.png`, `ewo047_admin_comprobantes_d1024.png`, `ewo047_admin_comprobantes_t800.png`, `ewo047_admin_comprobantes_m390.png`.
- `ewo047_admin_plegada_foco_d1440.png`, `ewo047_admin_plegada_foco_d1024.png`.
- `ewo047_admin_comprobante_sheet_d1440.png`, `ewo047_admin_comprobante_sheet_d1024.png`, `ewo047_admin_comprobante_sheet_t800.png`, `ewo047_admin_comprobante_sheet_m390.png`.
- `ewo047_admin_menu_t800.png`, `ewo047_admin_menu_m390.png`.
- `ewo047_supervisor_cargando_d1440.png`, `ewo047_supervisor_vacio_d1440.png`, `ewo047_supervisor_error_d1440.png`, `ewo047_supervisor_reduced_motion_d1440.png`.
- `ewo047_supervisor_piezas_insuficiente_d1440.png`, `ewo047_supervisor_piezas_externa_d1440.png`, `ewo047_supervisor_piezas_insuficiente_m390.png`, `ewo047_supervisor_piezas_externa_m390.png`.

## Límites y cierre

Este pase independiente valida el render inspeccionado. Un PNG, incluido el de reduced motion, no prueba duración, reversibilidad, hover persistente, foco real por teclado, lector de pantalla, contraste medido, comportamiento con teclado físico móvil, zoom ni altura corta. Los resultados dinámicos y las regresiones de roles/checks deben quedar en [el registro browser](EWO-047-browser.json) y [la evidencia canónica](EWO-047.md); este dictamen no convierte checks pendientes en PASS. Las capturas provienen del click-through con fixture local descartable documentado por el implementer, no de una API productiva.

El **Hold SD / visual OK humano** permanece explícito según VISUAL_QA y el EWO. Este dictamen independiente no constituye despliegue, aprobación humana ni autorización de rollout adicional.

## Suplemento de cierre

Se reabrieron las capturas reemplazadas `ewo047_supervisor_plegada_foco_d1440.png` y `ewo047_admin_plegada_foco_d1440.png`: ambas muestran ahora ring navy visible en el destino Inventario, junto con tooltip íntegro, obtenido mediante Tab real según el registro browser. También se inspeccionó `ewo047_admin_usuarios_d1440.png`: Usuarios es el único destino marcado en el riel y la cabecera refleja Usuarios; Configuración no aparece seleccionada simultáneamente. Se mantiene **OK visual**. Cobertura total: 33 paths únicos inspeccionados, incluidos estos reemplazos.

Se leyó la versión final de `EWO-047-browser.json`: **107 comprobaciones PASS**, incluidas foco real, scroll de navegación con altura corta, destino único Usuarios, contraste, reflow de 720 px y reversión durante transición. Las mediciones registradas son 5.765:1 para texto secundario, 12.436:1 para texto activo, 4.684:1 para icono activo, 13.228:1 para tooltip y 4.748:1 para CTA. Estos son resultados del implementer contrastados con su registro, no ejecución dinámica independiente del auditor. El reflow a 720 px no se presenta como prueba de zoom físico del navegador al 200%; lectores de pantalla y teclado físico móvil continúan fuera de este pase.

El fallo previo del fixture de Usuarios se corrigió en el transporte descartable de pruebas, sin cambio de runtime; no se registra como defecto del producto. Ningún hallazgo visual pendiente se deriva del suplemento. El Hold humano permanece.
