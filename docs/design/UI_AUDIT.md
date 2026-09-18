# UI audit — Team Mex v0

Auditoría de lo que **ya existe** en `web/`. No convierte el código actual en design system por inercia. No se modificó UI de producción en este corte.

Inspección: App Router Next.js 15, shadcn (New York) + Tailwind 4, tokens en CSS, primitivas en `web/src/components/ui/`, pantallas en `web/src/app/`, briefs en `docs/design-system/`, ADR-003. Sin Playwright/Cypress de proyecto. CI web = lint + build.

---

## Arquitectura (resumen)

| Capa | Dónde | Rol |
|------|--------|-----|
| Tokens | `web/src/app/globals.css` `:root` + `@theme inline` | Navy, naranja, superficies, botones pastel, `--tap` |
| Layout chrome | `.shell-header`, `.main` (max 1040px), `AppShell` | Barra 56px, marca 36px, nav subrayado |
| Primitivas shadcn | `web/src/components/ui/*` | Button, Badge, Card, Table, Dialog, Sheet, Field, Input |
| Dominio UI | `web/src/components/*.tsx` (no `ui/`) | StatusBadge, ListFilter, InventarioNav, VisitStepper, DataTable consumers |
| Estilos de composición | `@layer components` en `globals.css` | `.page-head`, `.inbox-list`, `.list-filter`, `.wizard-actions`, `.empty-state` |
| Tipografía | `layout.tsx` → Roboto 400/500/700 | `body` 14px (`text-sm`) |

North star (ADR-003): Supervisor = field-service / wizard mobile; Admin = listado → ficha denso; Logística = tablero Flota (no `/inicio`).

---

## GOOD EXISTING PATTERNS

Conservar. Los agentes nuevos deben **reusar**, no reinventar.

1. **Tokens de marca, no paleta SaaS default.** Navy `#24284D` en shell y texto de énfasis; naranja `#EA7515` reservado al CTA y al subrayado de ubicación; página `#F3F3F3`; cards blanco + borde `#E4E5EC`; `--shadow: none`. Radio 6px (cards) / 4px (badges). Ver `:root` en `globals.css`.

2. **Un CTA naranja por vista.** `Button` `default` = primary. Secundarios = `secondary` / `outline` / `quiet` / `dangerSoft`. Brief: [ui-semantic-button-pastels-v0](../design-system/ui-semantic-button-pastels-v0.md).

3. **Pasteles = estado, no verbo.** `Badge` `success` / `warning` / `danger` / `muted`. `StatusBadge`, `StockAlertaBadge`. Nunca mint/ámbar/sky en botones.

4. **Gramática nav ≠ filtro ≠ acción.** Subrayado naranja = ubicación (`AppShell` nav, `.subnav`). Chip `.list-filter` = filtro de lista. Botón = acción. Inicio = cola de excepciones, no dashboard. Brief: [ui-nav-filter-action-inicio-v0](../design-system/ui-nav-filter-action-inicio-v0.md).

5. **Listados densos.** `DataTable` (TanStack + shadcn Table): thead 11px uppercase, filas ~40px (`h-10`), hover `#fafafb`, fila clickeable en vez de botón Detalle. Flota, Andon, Existencias, Refacciones, Sitios.

6. **Page chrome estable.** `PageHeader`: H1 20px semibold navy, lede 12px muted, acciones a la derecha. Padding de `.main` 12–16. Ancho 1040px.

7. **Empty / error quietos.** `.empty-state` / `.error-state`: una línea + contexto, sin ilustración. Ejemplos: Inicio “Nada requiere atención”; Andon pendientes; Existencias filtradas (explica el badge).

8. **Wizard WO mobile.** `VisitStepper` “Paso N de 7”; sticky `.wizard-actions`; hits `--tap-mobile` 44px `<768`. Copy dropzone **Tomar o subir**. Brief: [ui-touch-targets-mobile-v0](../design-system/ui-touch-targets-mobile-v0.md).

9. **Cola e inbox como lista, no widgets.** `.inbox-list` / `.inbox-row` en `/inicio` y `/notificaciones`. Sin KPIs ni gráficas.

10. **Copy operacional en español.** `web/src/lib/format.ts` + mapa en [ux-operacional-cortes-v0](../design-system/ux-operacional-cortes-v0.md). Taller, no `t_km` / `min_qty`.

11. **Dialog vs sheet.** Dialog = alta/edición corta (tipo, chofer, alertas). Sheet = ficha / movimiento / menú mobile. Overlay `bg-black/40`, radio 6px, sin sombra suave.

12. **Proof por click-through.** Skill `proof-ui`; shots en `docs/screenshots/`; **sin** Playwright en CI ni en el overlay de agentes.

---

## PATTERNS TO STANDARDIZE

Ya existen, pero los agentes los mezclan. Estandarizar **en PRs futuros** cuando se toque el archivo; no un “big bang”.

| Tema | Hoy | Convención |
|------|-----|------------|
| Header de página | `PageHeader` en listados y hub | `PageHeader`; no añadir `.page-head` |
| Botones | `Button` (CVA); `.btn` solo en role picker (`home-card`) | Preferir `Button`; no añadir `.btn` nuevos |
| Filtros de lista | `ListFilter` (Andon, Stock, Inbox, Flota, Choferes) vs form `.filters` (Unidades búsqueda) | Chips `.list-filter` para estados enumerados; campos de búsqueda **sin** card extra |
| Superficie de tabla | `DataTable` envuelve en `.card` | OK; no envolver otra vez en `Card` |
| Loading | `<p className="muted">Cargando …</p>` | Mantener una línea; no skeletons de marketing |
| Notas | `Note` vs `.note` / `.note-warn` | Preferir `Note` |
| Alertas de form | `FormAlert` vs `<p className="alert">` | Preferir `FormAlert` |
| H2 de sección | `.panel h2` 13px vs `text-sm` en grupos de Unidades | 13px semibold navy; no H1 de sección |

Mapeo semántico de botones (código ya existe; nombres de spec en [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)):

| Spec | `Button` variant |
|------|------------------|
| primary | `default` |
| secondary | `secondary` |
| tertiary | `outline` (página) |
| quiet | `quiet` (inbox / “marcar todas”) |
| destructive | `dangerSoft` (Inactivar) o `destructive` (quitar / outline rosa) |
| chrome | `ghost` **solo** en `AppShell` (texto claro sobre navy) |

No crear variantes CVA nuevas si una de estas cubre el caso.

---

## PATTERNS TO REFACTOR LATER

Deuda real. **No** arreglar en un PR de docs o de feature no relacionada. Chrome unificado en [ui-unify-chrome-v0](../design-system/ui-unify-chrome-v0.md): hub `PageHeader`+`Button`, un panel Andon, visita cerrada documento, Choferes `ListFilter`.

1. **`.btn` del role picker.** `home-card` sigue con `.btn` (patrón 1). No es deuda del hub.

2. **Hardcodes de color** en `badge.tsx` / `Note` (`bg-[#e8f6ee]`, `bg-[#fff4e8]`) duplican tokens `--activa-*` / `--warning-*`.

3. **`@custom-variant dark` sin tema.** Residuo shadcn. No implementar dark mode.

4. **Copy residual.** Columna “Familia” en tablas de ítems vs “Categoría” en Existencias; algunos `className` de 44px repetidos encima de `size="compact"` (Andon Enterado).

5. **`docs/screenshots/` vacío en git.** Los briefs piden PNG; el flujo existe pero las evidencias no viven en el repo. Convención en [SCREENSHOT_WORKFLOW.md](SCREENSHOT_WORKFLOW.md).

6. **Flota ficha:** formulario de movimiento + situación + historial en una columna. Funciona; no es el patrón hub MTTO. No unificar layouts entre BCs.

---

## ANTI-PATTERNS

Vistos en código, en briefs, o típicos de UI generada. Catálogo normativo: [UI_ANTI_PATTERNS.md](UI_ANTI_PATTERNS.md) + [ui-polish-anti-generic-v0](../design-system/ui-polish-anti-generic-v0.md).

| Anti-patrón | Evidencia / riesgo |
|-------------|-------------------|
| Dashboard de KPIs / gráficas | Vetado en Inicio y Flota |
| Una card por ítem de lista (desktop) | Anti-generic Must 7; excepción: líneas de pieza en WO mobile |
| Muchos naranjas | Riesgo en headers con varios `Button` default; hub ya un naranja por vista |
| Sombras suaves, radio 16px, gradientes | Tokens los evitan; no reintroducir |
| Pastel en verbos | Sustituido por el brief de pasteles; no volver |
| Filtro con subrayado de `.subnav` | Gramática rota |
| Empty ilustrado | `.empty-state` ya es una línea |
| Iconos Lucide decorativos | Hoy pocos (campanita, menú, Inicio, inbox). No llenar filas de iconos |
| Tipografía &lt;11px para “densidad” | Meta mínima 12; thead 11 uppercase es el piso |
| Playwright en `web/` | AGENTS.md / `proof-ui`: no. `@playwright/test` aparece solo como transitiva del lockfile |

**No** tomar como sistema: un stack de cards en detalle de visita, un Card+select de filtro, ni `.btn` fuera del role picker.

---

## Tooling de screenshots (fase 7)

| Pregunta | Hecho |
|----------|--------|
| ¿Playwright de proyecto? | No. No hay tests E2E web. CI no abre browser. |
| ¿Cypress? | No. |
| ¿Qué hay? | Skill `proof-ui`: click-through + PNG en `docs/screenshots/`. Agentes cloud: browser / computer use. |
| ¿Añadir Playwright? | No. Duplicaría CI, choca con la regla explícita del overlay, y el objetivo es revisión humana/agente, no pixel-diff. |

Flujo elegido: [SCREENSHOT_WORKFLOW.md](SCREENSHOT_WORKFLOW.md) — viewports 1440×900 (siempre), 1280 / 1024 si el layout aprieta, 390×844 para WO/shell mobile.

---

## Reuso vs docs nuevas

| Ya existía | Este sistema aporta |
|------------|---------------------|
| ADR-003, anti-generic, pasteles, nav, 44px, UX cortes A–E, tablero Flota | No reescribir Must/Don’t de producto |
| `globals.css` tokens, Button/Badge/Table | Nombres semánticos P0–P3 y presupuesto visual |
| `proof-ui` + `ux-auditor` | Rol Implementer, Visual QA de 3–5 hallazgos, spec UX, viewports desktop |
| Plantilla de PR Must/Don’t/Proof | Enlace a spec UX + Visual QA sin duplicar el brief |
