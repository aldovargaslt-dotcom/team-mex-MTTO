# EWO-047 — Auditoría independiente de Inventario móvil (AC-09)

Veredicto: **OK visual**. Sin hallazgos accionables confirmados en las superficies inspeccionadas. El control muestra la sección completa; los seis destinos quedan explícitos, con navegación y filtros diferenciados, sin desbordamiento visual de página. Se conserva un único CTA sólido de tarea.

Revisor: subagente `ux-auditor`, independiente del implementer. Solo lectura de runtime; únicamente se escribe este dictamen documental. Sin Playwright.

## Fuentes y revisión

Se leyeron SPEC-UI-SUPERVISOR-001 AC-09, la sección «Revisión del piloto — Inventario móvil» de `docs/design-system/ux-supervisor-identidad-sidebar-v1.md`, el diff de InventarioNav/CSS y el brief `ui-nav-filter-action-inicio-v0.md`. Aplican las fuentes de Visual QA, sistema UI, targets y proof-ui abiertas en [el dictamen del piloto](EWO-047-ux-audit.md).

La UX autorizada sustituye expresamente las pestañas móviles por un disparador de navegación y Sheet inferior. El control no se evalúa como un filtro ni como CTA de tarea. La revisión se limita a este incremento; no reabre reglas de Inventario ni el alcance del piloto.

## Observaciones verificadas

- **Ubicación y gramática — PASS visual:** Existencias/Comprobantes muestran nombre completo y affordance de apertura a 320/390. El nombre contextual Inventario y el icono distinguen navegación frente a los chips neutros de estado documental/existencias. SPEC AC-09, UX y brief de gramática.
- **Panel y responsive — PASS visual:** Operación y Catálogo contienen los seis destinos, sin scroll horizontal ni recorte de texto. Selección activa usa fondo neutro, texto navy y check, sin otro CTA naranja. A 390×360 el header permanece visible y Proveedores queda accesible al desplazar la lista internamente. SPEC AC-09 y OPERATE_CRAFT §Overlays.
- **Regresión desktop — PASS visual:** a 1440 se conservan pestañas, subnav de catálogo y contenido; no aparece el control móvil. No se detectan nuevas superposiciones ni pérdida de jerarquía. SPEC AC-09 y UX §Revisión del piloto.

No se fabrican hallazgos para alcanzar una cuota; estas observaciones describen verificación, no defectos.

## Capturas inspeccionadas

Se abrieron individualmente mediante `view_image` las 12 capturas finales enlazadas en [EWO-047-mobile-nav.json](EWO-047-mobile-nav.json). Paths relativos a `docs/screenshots/`:

- `ewo047_mobile_nav_supervisor_m390_existencias.png`
- `ewo047_mobile_nav_supervisor_m390_secciones.png`
- `ewo047_mobile_nav_supervisor_m390_comprobantes.png`
- `ewo047_mobile_nav_admin_m390_existencias.png`
- `ewo047_mobile_nav_admin_m390_secciones.png`
- `ewo047_mobile_nav_admin_m390_comprobantes.png`
- `ewo047_mobile_nav_supervisor_m320_existencias.png`
- `ewo047_mobile_nav_supervisor_m320_secciones.png`
- `ewo047_mobile_nav_supervisor_m320_comprobantes.png`
- `ewo047_mobile_nav_short_height_m390.png`
- `ewo047_mobile_nav_desktop_catalogo_d1440.png`
- `ewo047_mobile_nav_desktop_existencias_d1440.png`

Se excluyen las dos capturas exploratorias genéricas sin rol del índice de aceptación.

## Evidencia dinámica y límites

Se leyó el registro final: **57 checks PASS**. Documenta el click-through desde role picker en Supervisor390/Admin390/Supervisor320, navegación por seis enlaces, Atrás/Adelante, foco inicial en sección actual, Escape y selección actual con retorno al disparador, trap, targets, scroll de altura corta, reduced motion y cierre/foco al pasar a desktop. Esos resultados pertenecen al implementer; el auditor no repitió las interacciones en browser.

El diff conserva enlaces reales, `aria-current`, primitives de Sheet y foco explícito; los colores reutilizan tokens inspeccionados en el piloto. No se declara aquí una medición AA nueva ni prueba con lector de pantalla: los ratios del piloto constan en el dictamen principal y los PNG no prueban contraste medido, motion o teclado físico móvil. La captura de altura corta acredita visualmente el resultado del scroll, no todos sus gestos.

**Hold SD / visual OK humano vigente.** Este OK independiente no autoriza despliegue ni amplía el alcance.
