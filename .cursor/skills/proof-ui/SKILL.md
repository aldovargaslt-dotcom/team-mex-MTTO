---
name: proof-ui
description: Prove Team Mex UI cortes with click-through screenshots (no Playwright). Use when web/src or docs/design-system changes, before claiming visual OK or Aldo/SD greenlight.
---

# proof-ui

Heurísticas recuperadas de agentes internos de verificación. **No** es un framework de tests. Web no tiene Jest/Playwright; la prueba es el flujo clickeado + `docs/screenshots/`. Viewports y catálogo: [SCREENSHOT_WORKFLOW.md](docs/design/SCREENSHOT_WORKFLOW.md).

Briefs: [anti-generic](docs/design-system/ui-polish-anti-generic-v0.md), [44px](docs/design-system/ui-touch-targets-mobile-v0.md), [pasteles](docs/design-system/ui-semantic-button-pastels-v0.md), [nav vs filtro vs Inicio](docs/design-system/ui-nav-filter-action-inicio-v0.md), [UX operacional](docs/design-system/ux-operacional-cortes-v0.md), [ADR-003](docs/adr/003-shadcn-tailwind.md). Sistema: [docs/design/README.md](docs/design/README.md), [OPERATE_CRAFT.md](docs/design/OPERATE_CRAFT.md).

## Cómo entrar y qué clickear

- Entrar por el **role picker** (`/` → Supervisor, Administrador o Logística). No screenshot de una URL profunda sin ese paso si el corte depende del rol.
- **Clickea el flujo.** Una captura de página estática no prueba el corte.
- Copy **exacto en español**. Rechazar “Choose File” / chrome en inglés del file picker. Dropzones: **Tomar o subir** (`ImageDropzone`).
- Desktop **1440×900** siempre que el corte toque listado/ficha/Flota. **1280×800** / **1024×768** si tabla o grid se aprietan. Mobile **390×844** para WO y shell `<768`.
- Wizard: stepper `Paso N de 7` (Datos → Trabajos → Obs → Fotos → Piezas → Firmas → Confirmar). No tabs de desktop. Sticky Continuar visible, sin recorte.
- **Rechazar** shots con chrome de DevTools o device-toolbar (marco de dispositivo, `100%`, barra de inspect).
- Un CTA primario **naranja** por vista. En Piezas: **Continuar** disabled → enabled alrededor de stock insuficiente / compra externa (`DESDE_STOCK` qty > stock vs `COMPRA_EXTERNA`).
- Cazar regresiones del **shell/nav** compartido (topbar, campanita, menú móvil `<768`).
- Si el corte añade **sheet / select / menú**: ábrelo; no debe recortarse (`overflow` del padre). Si añade control: hover/focus/disabled visibles (Continuar disabled→enabled en Piezas si aplica).
- Corte **visual only**: no tocar `api/src`.
- Un video de walkthrough **no** es proof si es sobre todo setup o pelea con DevTools.

## Evidence

Guardar PNG en `docs/screenshots/` (o artefactos del agente): `{corte}_{pantalla}_{estado}_{viewport}.png` (`d1440`, `d1280`, `d1024`, `m390`). Listarlos en el PR (Proof).

## Relación

Implementa con `ui-implementer`. `ux-auditor` hace Visual QA (otro pase; no edita). `verify-api` cubre el backend. No añadir Playwright a `web/`.
