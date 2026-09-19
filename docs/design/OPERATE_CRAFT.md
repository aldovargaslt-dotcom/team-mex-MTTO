# Operate craft — UI de tarea

Estado: **aceptado** (ingeniería UI). No es un corte de producto. No cambia tokens ni ADR-003.

Los briefs [anti-generic](../design-system/ui-polish-anti-generic-v0.md), [44px](../design-system/ui-touch-targets-mobile-v0.md), [pasteles](../design-system/ui-semantic-button-pastels-v0.md), [nav](../design-system/ui-nav-filter-action-inicio-v0.md) y el resto de `docs/design/` ya cubren densidad, un naranja, P0–P3 y cards. **Si hay conflicto, esos docs ganan.**

Este archivo cubre huecos de **craft de producto** (task UI): estados de control, overlays, motion, y skills de UI de terceros. Recorte de Impeccable *Operate mode*, adaptado a Team Mex. **No** instalar Impeccable ni copiar su `PRODUCT.md` / `DESIGN.md` / hooks.

---

## Familiaridad es una feature

El usuario de taller/patio debe confiar el control al primer vistazo. El fallo no es “planitud”: es extrañeza sin propósito (display fonts en labels, motion de marketing, affordances inventadas).

La herramienta desaparece en la tarea. Brand vive en tokens Team Mex (navy, un naranja, Roboto, radio 6–8), no en un rediseño.

---

## 1. Estados de control

Estados de **pantalla** (loading / empty / error): [PAGE_PATTERNS.md](PAGE_PATTERNS.md) §10.

Todo control interactivo nuevo (Button, NativeSelect, Input, chip `.list-filter`, sticky Continuar, menú) debe tener, en CSS o CVA existente:

| Estado | Cómo |
|--------|------|
| default | variante ya documentada en [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) |
| hover | ya en primitivas; no inventar glow |
| `:focus-visible` | ring 2px `--ring` (naranja); no quitarlo |
| active / pressed | más oscuro, sin bounce |
| disabled | gris `#D8D8DE`; texto legible. Continuar en Piezas: disabled → enabled es el patrón |
| invalid | borde `--destructive` (campos) |
| loading | deshabilitar el control **o** una línea `Cargando …` de pantalla; no spinner de marketing ni skeleton shimmer |

No hace falta un CVA nuevo si `default` / `secondary` / `outline` / `quiet` / `dangerSoft` cubren el caso.

---

## 2. Overlays

Sheet / Dialog / dropdown / DatePicker **salen del contenedor** (portal de Radix / shadcn). Un menú recortado por `overflow: hidden` o `overflow: auto` del ancestro es un bug, no un estilo.

Orden de overlay (el primero que sirva gana):

1. Inline / fila clickeable / ficha
2. **Sheet** (ficha, movimiento, menú mobile)
3. **Dialog** corto (alta/edición: tipo, chofer, alertas, sitio)
4. Modal a pantalla completa — casi nunca

No elijas Dialog porque “hay un formulario”. Ver patrón 7 en [PAGE_PATTERNS.md](PAGE_PATTERNS.md).

---

## 3. Motion

- **150–250 ms** en abrir/cerrar sheet, dialog, y transiciones de estado.
- Motion **solo comunica estado** (abrió, cambió, disabled→enabled). Nada más.
- `prefers-reduced-motion: reduce` → duración 0 o sin animación.
- **No:** GSAP, ScrollTrigger, scroll hijack, bounce/elastic, magnetic hover, coreografía de page-load, parallax, marquees.

El producto carga a una tarea; el usuario no espera a que “entre” la página.

---

## 4. Skills de UI de terceros — no instalar

Este repo ya tiene DS, briefs de corte, `ui-implementer`, `proof-ui` y `ux-auditor`. Un skill always-on de landing **compite** con ADR-003.

| Repo | Qué es | En Team Mex |
|------|--------|-------------|
| [ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | Catálogo landing/SaaS (estilos, paletas, patterns de hero) | No. Propondría paleta/tipo nuevos y dashboards/GPS que v0 rechaza |
| [impeccable](https://github.com/pbakaus/impeccable) | Director de craft + detector + `DESIGN.md` | No como always-on ni hooks. Este archivo ya recorta Operate. No `bolder` / `delight` / `overdrive` / `typeset` |
| [taste-skill](https://github.com/leonxlnx/taste-skill) | Landing/portafolio; **se autoexcluye** de dashboards, tablas y UI multi-paso | No. El wizard WO y `DataTable` son exactamente eso |

Referencias de pantallas reales: **Mobbin** (field service, Salesforce listados, ServiceTitan / Fleetio densos). No galerías de spa/SaaS.

No commitear `.impeccable/`, `PRODUCT.md` de Impeccable, ni `uipro init` en este árbol.

---

## Don’t

- Cambiar Roboto, navy `#24284D`, naranja `#EA7515`, o radio 16.
- H1 con `clamp()` fluido. Escala fija: 20 / 14 / 12 ([DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)).
- Custom scrollbar, input “de autor”, modal como primer pensamiento.
- Vacío ilustrado “Get started” (sigue: una línea + CTA opcional).
- Instalar los tres skills de arriba “para mejorar la UI”.

## Fuera

Rediseño de tokens; GPS/KPI en Inicio o Flota; unificar notify; Playwright; carpeta `work-orders/`.

## Proof

Si el corte **añade** control, overlay o motion: `proof-ui` abre el sheet/select (no recorte) y el CTA disabled si aplica. `ux-auditor` cita este doc. Copy-only: n/a.
