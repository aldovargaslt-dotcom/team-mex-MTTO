# UI/UX engineering system

Cómo se diseña e implementa UI en este repo. **No** es un rediseño del producto.

Los briefs visuales ya aceptados (Must / Don’t de un corte) siguen en [`docs/design-system/`](../design-system/). Este directorio es el **sistema de ingeniería**: jerarquía, primitivas, anti-patrones, spec UX, screenshots y Visual QA.

## Antes de tocar `web/src`

1. [ADR-003](../adr/003-shadcn-tailwind.md) — shadcn + Tailwind + tokens Team Mex.
2. Briefs del corte: [`docs/design-system/`](../design-system/) y, si es Flota, [tablero viaje](../specs/fleet-tablero-viaje-v0.md).
3. Este índice + la spec UX de la pantalla.

No copies ADRs ni briefs aquí. Ábrelos.

## Flujo (pantalla nueva o cambio visual no trivial)

```text
Spec funcional (ADR / corte / Must del PR)
        ↓
Spec UX   UX_SPEC_TEMPLATE.md  (+ patrón y hermano a clonar)
        ↓
Primer pase   ui-implementer: 8 puntos antes de JSX
        ↓
Screenshot    skill proof-ui
        ↓
Visual QA     ux-auditor (otro pase; fail inmediato si no clona el patrón)
        ↓
Correcciones  ui-implementer
        ↓
Aceptación    Hold SD / visual OK en el PR
```

Copy menor o un string: spec UX completa no es obligatoria. Sí lo es un corte que cambia layout, jerarquía, acciones o estados. Si el primer paint no se parece al hermano, se rehace **antes** de QA.

## Documentos

| Archivo | Uso |
|---------|-----|
| [UI_AUDIT.md](UI_AUDIT.md) | Qué hay hoy: conservar / estandarizar / refactorizar después / anti-patrones |
| [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) | Tokens y primitivas (fuente: `web/src/app/globals.css`) |
| [UX_PRINCIPLES.md](UX_PRINCIPLES.md) | Principios operacionales |
| [OPERATE_CRAFT.md](OPERATE_CRAFT.md) | Task UI: estados de control, overlays, motion; **no** instalar skills de landing |
| [VISUAL_HIERARCHY.md](VISUAL_HIERARCHY.md) | P0–P3 y presupuesto de complejidad |
| [UI_ANTI_PATTERNS.md](UI_ANTI_PATTERNS.md) | Lo que no hay que generar |
| [PAGE_PATTERNS.md](PAGE_PATTERNS.md) | Recetas de pantalla existentes |
| [UX_SPEC_TEMPLATE.md](UX_SPEC_TEMPLATE.md) | Plantilla antes de implementar |
| [VISUAL_QA.md](VISUAL_QA.md) | Cómo criticar lo renderizado |
| [SCREENSHOT_WORKFLOW.md](SCREENSHOT_WORKFLOW.md) | Captura (sin Playwright en el overlay) |

## Roles de agente

| Rol | Dónde | Hace | No hace |
|-----|--------|------|---------|
| UI Implementer | skill [`ui-implementer`](../../.cursor/skills/ui-implementer/SKILL.md) | Implementa la spec UX con primitivas existentes; captura screenshots | Auto-aprobar el look |
| Visual QA Reviewer | subagente [`ux-auditor`](../../.cursor/agents/ux-auditor.md) | Lee shots + briefs; 3–5 hallazgos de mayor impacto | Editar `web/src` / `api/src` en el primer pase |

Un mismo razonamiento no implementa y aprueba.

## Qué no es este sistema

- No sustituye ADR-003 ni los Must/Don’t de un corte.
- No introduce otro framework de UI ni skills always-on de landing ([OPERATE_CRAFT.md](OPERATE_CRAFT.md) §4).
- No pide rediseñar pantallas existentes en el mismo PR que las toca por lógica.
- “WO” = wizard de visita. El artefacto de ingeniería es el brief / spec UX / PR, no una carpeta `work-orders/`.
