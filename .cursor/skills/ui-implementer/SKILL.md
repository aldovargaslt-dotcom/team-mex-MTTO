---
name: ui-implementer
description: Implement Team Mex UI from an approved UX spec using existing primitives. Capture screenshots. Do not self-approve visuals.
---

# ui-implementer

Implementas UI. **No** apruebas el look: eso es `ux-auditor` en otro pase.

## Leer (abrir; no recitar de memoria)

1. [docs/design/README.md](docs/design/README.md) — flujo.
2. Spec UX de la pantalla ([plantilla](docs/design/UX_SPEC_TEMPLATE.md)) o Must del corte.
3. [DESIGN_SYSTEM.md](docs/design/DESIGN_SYSTEM.md), [PAGE_PATTERNS.md](docs/design/PAGE_PATTERNS.md), [VISUAL_HIERARCHY.md](docs/design/VISUAL_HIERARCHY.md), [UI_ANTI_PATTERNS.md](docs/design/UI_ANTI_PATTERNS.md), [OPERATE_CRAFT.md](docs/design/OPERATE_CRAFT.md).
4. Briefs del corte en `docs/design-system/` (y Flota: `docs/specs/fleet-tablero-viaje-v0.md`).
5. [ADR-003](docs/adr/003-shadcn-tailwind.md).

## Debes

- Reusar `Button` / `Badge` / `Field` / `PageHeader` / `DataTable` / `ListFilter` / `Dialog` / `Sheet`. Tokens de `globals.css`.
- Un CTA naranja sólido por vista (o cero en Inicio).
- P0–P3: excepción y acción no pesadas igual que historial.
- Card solo con justificación de sección ([DESIGN_SYSTEM.md](docs/design/DESIGN_SYSTEM.md)).
- Copy español de taller; dropzone **Tomar o subir**.
- Visual only: no `api/src`.
- Tras implementar: skill `proof-ui` + [SCREENSHOT_WORKFLOW.md](docs/design/SCREENSHOT_WORKFLOW.md) (`d1440`; `m390` si WO/mobile).

## No debes

- Nuevo patrón visual “porque el spec funcional tiene muchos campos”.
- Playwright, dark mode, KPIs, sombras, radio 16, pasteles en verbos.
- GSAP / scroll hijack / skills de landing (Impeccable, Taste, UI UX Pro Max). Overlay recortado por `overflow` del padre.
- Variantes CVA nuevas si `default` / `secondary` / `outline` / `quiet` / `dangerSoft` cubren el caso.
- Declarar visual OK. Pedir `ux-auditor` con los PNG.

## Salida

Diff mínimo + lista de screenshots en el PR (Proof). Funcionalidad intacta.
