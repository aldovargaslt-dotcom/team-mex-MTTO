# Design system — primitivas Team Mex

Fuente de verdad de tokens: `web/src/app/globals.css`. Componentes: `web/src/components/ui/`. Briefs de producto: [`docs/design-system/`](../design-system/). ADR: [003](../adr/003-shadcn-tailwind.md).

No añadir otro kit. No inventar decenas de tokens. Si falta un valor, reusa la escala de abajo o el token más cercano.

---

## Marca (no negociable)

| Rol | Token | Valor |
|-----|--------|--------|
| CTA / subrayado de ubicación | `--cta` `--primary` `--ring` | `#EA7515` |
| CTA hover | `--cta-hover` | `#D4670F` |
| Shell / navy | `--shell` `--navy` | `#24284D` |
| Texto sobre shell | `--shell-ink` | `#F7F7FB` |
| Página | `--background` `--surface` | `#F3F3F3` |
| Sección / card | `--card` `--white` | `#FFFFFF` |
| Texto | `--foreground` `--text` | `#1C1D26` |
| Meta | `--muted` `--muted-foreground` | `#5C5F73` |
| Línea | `--border` `--line` `--input` | `#E4E5EC` |
| Peligro | `--danger` `--destructive` | `#B42318` |
| Elevación | `--shadow` | `none` (bordes, no sombras) |
| Tipo | `--font-sans` | Roboto |

Naranja **solo** para: un CTA sólido por vista, subrayado de nav/subnav, badge numérico de campanita, dots del stepper WO. No para filtros, no para “acento decorativo”.

---

## Superficies

| Semántico | Uso | Cómo |
|-----------|-----|------|
| **page** | Fondo de trabajo | `body` / `.main` → `--background` |
| **section** | Tabla, inbox, panel de ficha, formulario agrupado | `.card` / `Card` / `DataTable` wrap: blanco + `border` + radius 6 |
| **emphasized** | Atención sin ser error: fila warn, inbox unread, `Note warn`, badge warning | `--warning-bg` `#FFF4E8` / `--warning-fg` `#8A4B12`; `.row-warn`; `.inbox-row.unread` `#FFF7F0` |
| **critical** | Bloqueo o stock agotado / error de form | `FormAlert`; badge `danger`; borde `aria-invalid` |

No hay superficie “elevada con sombra”. No hay gradiente.

**Card con justificación:** tabla, panel de ficha (hub), diálogo, sheet, picker de rol, un paso de wizard (el paso actual, no cinco cards a la vez en detalle cerrado). **Sin card:** título de página, filtros chip, empty state, lede, una fila de acciones.

---

## Espaciado

Base 4px. Usar 4 / 8 / 12 / 16 / 24.

| Contexto | Valor |
|----------|--------|
| Padding página `.main` | 12–16 |
| Gap entre secciones | 12 |
| Gap header ↔ acciones | 12 |
| Padding panel / card densa | 12 (`p-3`) |
| Gap de campos | 8–12 |
| Fila tabla / lista / cola | ~40px alto (`--tap` desktop) |
| No | regiones vacías grandes bajo tablas; `py-16` de marketing |

`--tap`: 40px desktop; 44px `<768`.

---

## Tipografía

| Rol | Tamaño | Peso | Color |
|-----|--------|------|--------|
| H1 página | 20px (`text-[20px]`) | 600 | navy |
| H2 sección | 13px | 600 | navy / foreground |
| Cuerpo | 14px (`text-sm`) | 400 | `--foreground` |
| Tabla | 13px | 400 | foreground |
| Lede / meta | 12px | 400 | muted |
| Label de campo | 12px | 500 | muted |
| Thead / kicker | 11px uppercase tracking | 500 | muted |
| Badge | 11px | 500 | semántico |

Menos bold decorativo. Números de stock/km: `.mono` (tabular + 600).

Piso: no bajar de 12px en cuerpo/meta; 11px solo thead/kicker/badge.

---

## Radius y borde

| Token | px | Uso |
|-------|-----|-----|
| `--radius-sm` | 4 | badge, hint |
| `--radius-md` / `--radius` | 6 | card, input, botón, chip filtro, dialog |
| `--radius-lg` / `xl` | 8 | tope (home-card). **Nunca 16** en cards |

Borde 1px `--border`. Outline de botón terciario: 1.5px navy. Focus: ring 2px `--ring` (naranja).

---

## Ancho y grid

- Contenido: **1040px** centrado (`.main`, `.shell-header__bar`).
- Picker de rol: `min(400px, 100%)`.
- Hub mantenimiento: `.hub-grid` 1.1fr / 0.9fr; a 1fr bajo ~800px.
- Formularios: 2 columnas ≥768; 1 columna en mobile.
- Filtros Unidades: 3 columnas → 1 bajo 800px.

No max-width 1280 “dashboard”. No grid de widgets.

---

## Breakpoints

| Ancho | Comportamiento |
|-------|----------------|
| `<768` | Menú hamburger; `--tap` 44px; wizard sticky + stepper mobile; hits WO |
| `≥768` | Nav desktop; densidad anti-generic (~40px) |
| `≤800` | `.filters` / `.form-grid` / `.hub-grid` / `.list-row` a una columna |

Desktop-first para Admin y Flota. Mobile-first solo para wizard Supervisor y shell.

Viewports de QA: [SCREENSHOT_WORKFLOW.md](SCREENSHOT_WORKFLOW.md).

---

## Botón (semántico → código)

Una acción primaria **sólida naranja** por región funcional (casi siempre = la vista).

| Semántico | `variant` | Cuándo |
|-----------|-----------|--------|
| primary | `default` | La acción que avanza el trabajo: Registrar entrada, Nueva unidad, Continuar, Cerrar visita, Agregar chofer |
| secondary | `secondary` | Blanco + borde gris: Cancelar, Volver, Configurar alertas, Sitios, Nuevo tipo |
| tertiary | `outline` | Navy 1.5px: Enterado, Guardar mínimo, Vincular, acciones de fila no destructivas |
| quiet | `quiet` | Gris: Marcar todas leídas |
| destructive | `dangerSoft` o `destructive` | Inactivar / Desactivar / Quitar foto |
| entrada (excepción) | `entrada` | Tinte naranja suave — **no** segundo sólido |
| ghost | `ghost` | Solo chrome del shell (texto claro) |

Tamaños: `default` 44→40; `compact` 44→32 en desktop **solo** dentro de filas de tabla. No `compact` en el CTA de header.

Disabled: gris `#D8D8DE` (ya en CVA). No bajar opacidad hasta volver ilegible.

---

## Status (semántico → Badge)

| Semántico | `Badge` variant | Ejemplos |
|-----------|-----------------|----------|
| success | `success` | Activa, OK, Cerrado |
| warning | `warning` | BAJO, Borrador, ABIERTO, Registrar entrada (Flota) |
| critical | `danger` | AGOTADO |
| neutral | `muted` | Inactiva, Resuelto, “—” |
| informational | `info` / `navy` o `secondary` | En ruta (Logística; sky quiet, no `#EA7515`) |

No usar `Badge variant="default"` (fill naranja) como estado. El naranja no es un status.

---

## Form, tabla, overlay

- Campo: `Field` + `Input` / `NativeSelect` / `Textarea` (`controlClassName`). Label 12px muted. Invalid: borde destructive.
- Tabla: `DataTable`. Empty = texto en la primera celda o `.empty-state` si no hay tabla. `onRowClick` abre ficha; no botón Detalle.
- Dialog: `max-w-lg`, `p-4`, gap 3. Título + descripción + footer con secondary a la izquierda, primary a la derecha.
- Sheet: ficha / movimiento / menú; `sm:max-w-md`.

---

## Iconos

Lucide solo donde ya es chrome o identificador de **fuente** (campanita, menú, inbox Andon vs Inventario). No iconos en cada fila de tabla. No ilustraciones empty.

---

## Complejidad visual (presupuesto)

Por viewport visible:

- **1** señal dominante (alerta crítica, CTA, o la pregunta de la pantalla).
- **2–3** regiones de énfasis máximo (P0/P1).
- **1** naranja sólido por vista.
- **≤2** colores semánticos simultáneos además de navy/gris (p. ej. warning + critical).
- Cero gradientes, cero sombras suaves, cero cards vacías.

Detalle: [VISUAL_HIERARCHY.md](VISUAL_HIERARCHY.md).
