---
name: proof-ui
description: Prove Team Mex UI cortes with click-through screenshots (no Playwright). Use when web/src or docs/design-system changes, before claiming visual OK or Aldo/SD greenlight.
---

# proof-ui

Heurísticas recuperadas de agentes internos de verificación. **No** es un framework de tests. Web no tiene Jest/Playwright; la prueba es el flujo clickeado + `docs/screenshots/`.

Briefs: [anti-generic](docs/design-system/ui-polish-anti-generic-v0.md), [44px](docs/design-system/ui-touch-targets-mobile-v0.md), [pasteles](docs/design-system/ui-semantic-button-pastels-v0.md), [ADR-003](docs/adr/003-shadcn-tailwind.md).

## Cómo entrar y qué clickear

- Entrar por el **role picker** (`/` → Supervisor o Administrador). No screenshot de una URL profunda sin ese paso si el corte depende del rol.
- **Clickea el flujo.** Una captura de página estática no prueba el corte.
- Copy **exacto en español**. Rechazar “Choose File” / chrome en inglés del file picker. Dropzones: **Tomar o subir** (`ImageDropzone`).
- Mobile ~**390×844**. Wizard: stepper `Paso N de 7` (Datos → Trabajos → Obs → Fotos → Piezas → Firmas → Confirmar). No tabs de desktop.
- **Rechazar** shots con chrome de DevTools o device-toolbar (marco de dispositivo, `100%`, barra de inspect).
- Un CTA primario **naranja** por vista. En Piezas: **Continuar** disabled → enabled alrededor de stock insuficiente / compra externa (`DESDE_STOCK` qty > stock vs `COMPRA_EXTERNA`).
- Cazar regresiones del **shell/nav** compartido (topbar, campanita, menú móvil `<768`).
- Corte **visual only**: no tocar `api/src`.
- Un video de walkthrough **no** es proof si es sobre todo setup o pelea con DevTools.

## Evidence

Guardar PNG nombrados en `docs/screenshots/` (o artefactos del agente) y listarlos en el PR (sección Proof). Viewport móvil sin recorte del sticky Continuar.

## Relación

`ux-auditor` revisa contra estos Must/Don’t. `verify-api` cubre el backend.
