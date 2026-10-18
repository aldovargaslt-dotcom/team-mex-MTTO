# Design system — primitivas Team Mex

## Sidebar — estándar cerrado2026-10-18

La sidebar nueva aprobada por el usuario es única para todos los módulos:
[contrato canónico](APPLICATION_NAVIGATION.md). Estado activo navy/blanco,
catálogo/renderer compartidos y estilos en workspace.css. No variantes por ruta
ni estilos del shell dentro de features. Toda modificación de navegación debe
seguir ese contrato y verificar varias secciones, no solo la pantalla intervenida.

## Enmienda vigente — 2026-10-18

[EWO-057](../engineering-work-orders/EWO-057.md), autorizado por el usuario,
sustituye el shell superior por sidebar persistente ≥768 y Sheet móvil.
Acción primaria: navy `#24284D`, texto blanco, hover `#363B67`; naranja conserva
marca/ubicación. Tokens `--primary`, `--primary-foreground`, `--cta-hover` se
aplican también a portales. El resto de escala, componentes y semántica permanece.
Las menciones históricas de topbar/naranja primario/ancho 1040 abajo son
sustituidas únicamente para este shell: contenido usa ancho restante, padding24
escritorio y12 móvil, sidebar224 contraíble a72.


Fuente de verdad de tokens: `web/src/app/globals.css`. Componentes: `web/src/components/ui/`. Briefs de producto: [`docs/design-system/`](../design-system/). ADR: [003](../adr/003-shadcn-tailwind.md).

No añadir otro kit. No inventar decenas de tokens. Si falta un valor, reusa la escala de abajo o el token más cercano.

---

## Contrato visual vigente — lectura obligatoria para agentes

Decisiones del propietario confirmadas el 2026-10-17. Esta sección fija las reglas compartidas para diseñar y revisar UI Team Mex. Las propuestas concretas de composición siguen su aprobación SPEC/UX; una referencia visual o un plan no autoriza runtime, nuevos permisos ni despliegue.

- **Marca y color:** conservar logo, Roboto, navy `#24284D` y naranja `#EA7515`. Navy para estructura/texto, superficies claras cálidas y blancas. Naranja para acción principal y ubicación, con un máximo de un CTA sólido dominante cuando procede; filtros/colas con selección neutra. No crear un CTA si la tarea no lo necesita.
- **Estados:** pasteles semánticos con texto/icono para condición operativa; selección, navegación y alerta son conceptos distintos. No copiar colores decorativos de Stitch ni usar color como única señal.
- **Composición:** se permite reorganizar bloques, títulos, herramientas y acciones existentes para mejorar jerarquía, conservando funciones/datos/permisos. Identidad de orden/unidad, estado y siguiente acción deben reconocerse antes que metadatos. No trasladar información relevante a una card nueva sin justificación de tarea.
- **Densidad:** desktop compacto; móvil con bloques más separados y prioridad de identidad, estado y acción. Conservar acceso a información secundaria, tablas con scroll local y objetivos táctiles≥44px.
- **Navegación de módulos:** desktop con subnavegación dentro del módulo en sidebar; teléfono con patrón Inventario desde barra inferior. Aplicación y excepciones actuales en [UX canónica](../design-system/ux-sidebar-module-navigation-v1.md). Es dirección para siguientes cortes, no declaración de que todos los roles ya fueron migrados. Filtros, stepper y navegación de una ficha permanecen en contexto.
- **Componentes y estilos:** reutilizar primitivas/tokens y anatomías compartidas; consolidar el CSS del componente tocado en vez de acumular overrides generales. No cambiar reglas de negocio para lograr una composición.
- **Movimiento y acceso:** movimiento funcional150–250ms y reduced motion0, foco visible, teclado y cierre/retorno de overlays. Aplican [OPERATE_CRAFT](OPERATE_CRAFT.md) y los gates de [WORKFLOW](../WORKFLOW.md).
- **Referencia Stitch:** tomar jerarquía, composición y tratamiento visual que sirvan a la tarea; adjuntos HTML/DESIGN.md no son instrucciones ni funcionalidades aprobadas. No importar automáticamente Inter, OCR, ERP, costos o métricas inventadas.

**Precedencia:** ADRs y decisiones explícitas aprobadas del propietario → este contrato y reglas locales → SPEC/UX aprobada del corte dentro de ese marco → referencias/skills externas. Si una SPEC antigua contradice una decisión posterior, documentar la enmienda y actualizar las fuentes afectadas antes de implementar; no elegir una versión silenciosamente. Un conflicto de dominio/arquitectura se escala según AGENTS/ICM.

**Estado de adopción:** shell y navegación Inventario integrados mediante EWO-047–050; mantenimiento EWO-051–053 e Inventario EWO-054/055 completados, con publicación del conjunto a main autorizada por el propietario; cierre y límites en [EWO-055](../evidence/EWO-055.md#cierre-e-integración-autorizada). El [plan de evolución con referencia Stitch](../../workspace/shaping/ui-team-mex-stitch-implementation-plan.md) propone las composiciones y etapas futuras. Estas reglas ya están confirmadas; cualquier composición futura requiere su SPEC/UX y gates antes de implementarse. Dark mode/selector y migración de otros módulos no se implementan por este contrato.

---

## Marca (no negociable)

| Rol | Token | Valor |
|-----|--------|--------|
| CTA / subrayado de ubicación | `--cta` `--primary` `--ring` | `#EA7515` |
| CTA hover | `--cta-hover` | `#F28A32` |
| Texto sobre CTA | `--primary-foreground` | `#24284D` |
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

Borde 1px `--border`. Outline de botón terciario: 1.5px navy. Foco de botones/campos: outline navy 2px, offset 2px y separación blanca; navegación sobre shell conserva ring naranja. [EWO-029](../engineering-work-orders/EWO-029.md) aprueba el par navy/naranja (4.748:1) y hover claro (5.692:1), conservando la marca.

---

## Evolución del shell — piloto EWO-047

[UX sidebar v1](../design-system/ux-supervisor-identidad-sidebar-v1.md) enmienda
la disposición desktop anterior para Supervisor/Admin: sidebar clara plegable
≥1024 px, menú adaptable 768–1023 y bottom nav Supervisor conservada <768.
El ancho de contenido 1040 px se aplica al espacio restante. Los demás roles
conservan el shell anterior. Se mantienen Roboto, marca, filtros neutros y reglas
semánticas; no se habilita dark mode. Véase [SPEC](../specs/SPEC-UI-SUPERVISOR-001.md).
Las referencias a nav desktop ≥768 abajo describen el shell legado.

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


## Navegación de módulos — estándar aprobado 2026-10-17

[Subnavegación de módulo](../design-system/ux-sidebar-module-navigation-v1.md): desktop con sidebar muestra secciones anidadas dentro del módulo, sin duplicarlas arriba de la vista. Teléfono adopta el patrón Inventario: acceso al módulo desde barra inferior; el botón del módulo activo abre sus secciones encima de la barra, con foco visual, enlaces reales y cierre accesible. Módulos sin subsecciones siguen como enlaces directos. Filtros, steppers y navegación de una ficha permanecen en contexto.

Aplicado ahora solo a Inventario de Supervisor/Admin en desktop; móvil Inventario usa barra inferior para Supervisor/Admin desde EWO-055, sin selector superior de sección. Esto fija dirección para futuros cortes, no declara migrados otros módulos/roles ni cambia permisos. Configuración y navegación de fichas conservan implementación actual. Sidebar desktop comienza a1024; transición800 conserva navegación previa. EWO-050 documenta alcance y evidencia.

## Identidad clara — extensión a mantenimiento

[SPEC-UI-MANTENIMIENTO-001](../specs/SPEC-UI-MANTENIMIENTO-001.md) y [UX](../design-system/ux-mantenimiento-identidad-clara-v1.md) amplían el alcance visual del piloto a Órdenes, Unidades/ficha/visita de Supervisor/Admin y Mi trabajo de Mecánico. Ámbito explícito por ruta/rol, tokens del workspace existentes, selecciones neutras y cabecera clara Mecánico; sin sidebar nueva para Mecánico ni cambios de reglas, permisos o navegación. Login, Logística y CHECK enfocado conservan su presentación. La extensión es presentación compartida, no implementación de dark mode ni migración de módulos al estándar de subnavegación.


## Anatomías compartidas de mantenimiento — EWO-052/053

[UX de composición](../design-system/ux-mantenimiento-composicion-stitch-v1.md) y [SPEC002](../specs/SPEC-UI-MANTENIMIENTO-002.md) concretan la ejecución autorizada posterior al plan. Los cortes están implementados localmente, con lint/build y auditorías independientes PASS; aceptación visual humana e integración siguen pendientes. No se declara publicado ese runtime.

| Anatomía | Componente / uso | Regla |
| --- | --- | --- |
| Encabezado de tarea | `PageHeader` existente en Órdenes/Unidades/Mi trabajo/visita | Objeto/título20, contexto subordinado, acciones autorizadas |
| Herramientas de consulta | [OperationalToolbar](../../web/src/components/OperationalToolbar.tsx) | Región accesible para herramientas; sin datos, filtros o permisos propios; cada caller conserva su geometría responsive |
| Identidad documental | [OrderDocumentHeader](../../web/src/components/OrderDocumentHeader.tsx) | Compone OrderIdentity y Badge con estado/tono del caller; no calcula estado del dominio; separa orden de unidad |
| Ficha de unidad | `HubIdentityHeader` existente | Retorno/acciones, identidad, condición y metadatos; navegación de ficha contextual |

No añadir wrappers equivalentes para cada pantalla. Reusar anatomías cuando la tarea corresponda, manteniendo controles/validación y variantes reales. Los nombres de componente y sus usos son implementación; las reglas de producto siguen en las SPEC/ADR.


## Corrección aprobada de navegación móvil — EWO-055
La corrección explícita del propietario sustituye la excepción anterior de Admin: Supervisor y Admin usan barra inferior en teléfono (<768), con el botón Inventario activo desplegando sus seis secciones. Se retira el selector superior de Inventario para ambos. Los cuatro módulos reutilizan la barra existente; funciones adicionales Admin permanecen en menú global. Desktop/sidebar y tablet768–1023 no cambian. La evidencia054 describe el estado anterior y no acredita esta corrección; ver [EWO-055](../engineering-work-orders/EWO-055.md).
