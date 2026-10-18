# EWO-047 — Auditoría independiente del ensayo AC-10

Veredicto: **OK visual** para el ensayo de Inventario desde la barra inferior Supervisor. Sin hallazgos accionables confirmados. No se declara superioridad frente a AC-09 ni validación comparativa con usuarios.

Revisor: subagente `ux-auditor`, independiente del implementer. Solo lectura de runtime; únicamente se escribe este dictamen. Sin Playwright.

## Autoridad y alcance

Se leyeron SPEC-UI-SUPERVISOR-001 AC-10 y la sección «Ensayo autorizado — Inventario desde barra inferior Supervisor» de la UX, así como AppShell, InventarioNav, el nuevo InventorySectionMenu, los destinos compartidos y CSS afectados. Rigen las fuentes locales abiertas en [la auditoría principal](EWO-047-ux-audit.md) y el brief de gramática leído en [la revisión AC-09](EWO-047-mobile-nav-audit.md).

AC-10 sustituye expresamente la ubicación y semántica modal de AC-09 para Supervisor móvil. La ausencia de backdrop y trap modal se evalúa como decisión aprobada para mantener operable la barra; Admin conserva AC-09. No se alteran permisos ni destinos.

## Inspección y resultado

- **Jerarquía/gramática — PASS visual:** en Supervisor320/390 desaparece el selector superior duplicado; H1, búsqueda y filtros conservan prioridad. Inventario sigue identificado en la barra mediante texto, indicador y flecha. Filtros neutros y CTA de tarea único se sostienen. Fuentes: AC-10, UX y VISUAL_HIERARCHY.
- **Panel anclado — PASS visual:** seis destinos agrupados, selección textual y check legibles, sin oscurecer página ni cubrir la barra inferior. A altura corta el panel conserva header y scroll vertical; la captura muestra Proveedores alcanzable y barra íntegra. Fuentes: AC-10 y OPERATE_CRAFT §Overlays.
- **Compatibilidad — PASS visual:** Comprobantes mantiene contenido y acciones; Admin390 conserva su selector superior y panel modal; desktop1440 conserva pestañas/subnav. No se detecta desbordamiento visual causado por el incremento. Fuentes: AC-10, UX y proof-ui.

No se inventan defectos para completar una cuota de hallazgos.

## Capturas finales inspeccionadas

Se abrieron individualmente mediante `view_image` los nueve PNG finales de [EWO-047-bottom-nav.json](EWO-047-bottom-nav.json). Paths relativos a `docs/screenshots/`:

- `ewo047_bottom_nav_supervisor_existencias_m390.png`
- `ewo047_bottom_nav_supervisor_secciones_m390.png`
- `ewo047_bottom_nav_supervisor_comprobantes_m390.png`
- `ewo047_bottom_nav_supervisor_existencias_m320.png`
- `ewo047_bottom_nav_supervisor_secciones_m320.png`
- `ewo047_bottom_nav_supervisor_comprobantes_m320.png`
- `ewo047_bottom_nav_short_height_m390.png`
- `ewo047_bottom_nav_desktop_d1440.png`
- `ewo047_bottom_nav_admin_m390.png`

Los PNG preliminares genéricos no forman parte de la aceptación.

## Evidencia dinámica y límites

Se leyó el registro final con **55 checks PASS**: entrada directa a Stock, toggle activo, seis destinos sin redirección previa, historial, Escape/selección actual con retorno de foco, dismiss externo, navegación a otro módulo con un toque, Inicio/Órdenes directos, teclado no atrapado, altura corta, reduced motion, resize desktop y Admin modal. Los samples de entrada registran el borde inferior del panel en el borde superior de la barra y hit positivo durante la transición. El diff final añade semántica `aria-modal` por variante y salida de Tab/ShiftTab hacia la barra para evitar el loop de Radix.

Estos resultados dinámicos corresponden al implementer y fueron contrastados con su registro; no fueron repetidos independientemente por este auditor. Los PNG no acreditan por sí solos motion, interacción externa, foco anunciado por lector de pantalla ni teclado físico móvil. Se reutilizan los colores y targets del piloto; este pase no declara una nueva medición independiente de contraste AA.

**Hold SD / visual OK humano vigente.** Dictamen acotado al ensayo autorizado; sin aprobación de despliegue ni ampliación del alcance.
