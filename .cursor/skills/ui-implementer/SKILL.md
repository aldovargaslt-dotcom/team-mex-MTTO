---
name: ui-implementer
description: Implement Team Mex UI from an approved UX spec using existing primitives. Capture screenshots. Do not self-approve visuals.
---

# ui-implementer

Implementas UI. **No** apruebas el look: eso es `ux-auditor` en otro pase.

## Primer pase (antes de JSX)

Si saltas uno, rehacer el paint **antes** de QA.

1. Abrir spec UX + [PAGE_PATTERNS.md](docs/design/PAGE_PATTERNS.md). Sin spec cuando cambia layout o acciones → parar.
2. Clonar el **hermano** nombrado en la spec (ruta + patrón). El primer paint debe reconocerse como esa receta.
3. Primitivas: `Button` / `PageHeader` / `ListFilter` / `Field` / `FormAlert` / `Note`. **No** `.btn` / `.page-head` nuevos.
4. Un fill naranja por vista (cero en Inicio).
5. Una excepción: no dos cards con el mismo hecho (causa Andon, km, alerta).
6. Card solo con justificación de sección. Visita cerrada = un documento (`.doc-section`), no un Card por H2. Wizard borrador = un Card por paso.
7. Skill `proof-ui` + [SCREENSHOT_WORKFLOW.md](docs/design/SCREENSHOT_WORKFLOW.md) (`d1440`; `m390` si WO/mobile).
8. No auto-aprobar. Pedir `ux-auditor` con los PNG.

## Leer (abrir; no recitar)

[docs/design/README.md](docs/design/README.md), spec UX o Must del corte, [DESIGN_SYSTEM.md](docs/design/DESIGN_SYSTEM.md), [VISUAL_HIERARCHY.md](docs/design/VISUAL_HIERARCHY.md), [UI_ANTI_PATTERNS.md](docs/design/UI_ANTI_PATTERNS.md), [OPERATE_CRAFT.md](docs/design/OPERATE_CRAFT.md), briefs en `docs/design-system/`, Flota: `docs/specs/fleet-tablero-viaje-v0.md`, [ADR-003](docs/adr/003-shadcn-tailwind.md).

## Debes

- Copy español de taller; dropzone **Tomar o subir**.
- Visual only: no `api/src`.
- Hub: `HubFichaNav` intacto; Salud en header; no repetir Andon/salud/actividad.

## No debes

- Nuevo patrón “porque el spec funcional tiene muchos campos”.
- Playwright, dark mode, KPIs, sombras, radio 16, pasteles en verbos.
- GSAP / skills de landing. Overlay recortado por `overflow` del padre.
- Variantes CVA nuevas si `default` / `secondary` / `outline` / `quiet` / `dangerSoft` cubren el caso.

## Salida

Diff mínimo + lista de screenshots en el PR (Proof). Funcionalidad intacta.
