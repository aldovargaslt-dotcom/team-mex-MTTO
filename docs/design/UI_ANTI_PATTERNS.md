# UI anti-patterns

Lo que un agente **no** debe generar. Si el screenshot se parece a esto, simplificar.

Norma de producto ya aceptada: [ui-polish-anti-generic-v0](../design-system/ui-polish-anti-generic-v0.md), [pasteles](../design-system/ui-semantic-button-pastels-v0.md), [nav vs filtro](../design-system/ui-nav-filter-action-inicio-v0.md). Aquí va la lista de ingeniería (jerarquía, cards, ruido). No dupliques esos Must/Don’t: cítalos.

---

## Contenedores

- Envolver **cada** sección en `Card`.
- Card alrededor de un solo filtro o un párrafo.
- Card dentro de card (tabla `DataTable` ya trae `.card`).
- `py-12` / `min-h-[60vh]` / hero vacío bajo el header.
- Radio 12–16, `shadow-md`, `shadow-lg`, rings decorativos.

**Card solo** si es superficie de sección (tabla, panel de ficha, dialog, un paso de wizard, picker de rol).

---

## Jerarquía y ruido

- Dos o más botones `variant="default"` (naranja) en la misma vista.
- Badge naranja o `Badge default` como estado.
- Color en filtros (`.list-filter` nunca fill `#EA7515` ni subrayado).
- Tres o más colores semánticos a la vez (verde+ámbar+rojo+sky).
- Icono Lucide en cada fila “para escanear”.
- Pills de consumo: un badge por columna.
- Titular 28–32px, tracking-tight, gradient text.
- P3 (VIN, timestamps, hints) en 14px bold navy igual que el H1.

---

## Acciones

- Verbo de fila con fill pastel (mint Entrada, sky Detalle).
- “Detalle” cuando la fila ya es clickeable.
- Inactivar como primary.
- Configurar alertas como naranja.
- Ghost (texto blanco) fuera del shell navy.

---

## Información

- KPI tiles, sparklines, “dashboard widgets” en Inicio o Flota.
- `Próximamente`, activity feed, gráficas.
- IDs técnicos, JSON, nombres de columna SQL (`t_km`, `min_qty`, UUID) en UI.
- Empty con ilustración + “Get started”.
- Skeleton shimmer de marketing; con una línea “Cargando …” basta.
- Mezclar Andon (mantenimiento vencido) con stock en el mismo empty.

---

## Tipografía y densidad

- Cuerpo &lt;12px para caber más columnas.
- Mixing de `font-serif` o una segunda familia.
- Todo `font-bold`.
- Texto justificado, titles case en inglés, chrome del file picker en inglés.

---

## Layout

- Kanban / cards por unidad en Flota.
- Tabs Resumen / Mantenimiento / Andon / Historial en el hub.
- Sidebar de settings genérico.
- Max-width 1280+ “app shell SaaS” (el producto es 1040).
- Dark mode.
- Responsive “mobile card list” en Admin desktop (salvo WO piezas).

---

## Proceso

- Implementar layout sin spec UX cuando cambia jerarquía o acciones.
- Aprobar el propio UI (el mismo pase no es Visual QA).
- Screenshot de URL profunda sin pasar por el role picker si el corte depende del rol.
- Shot con DevTools / device-toolbar visibles.
- Añadir Playwright/Cypress “para visual regression” en este overlay.

---

## Test de cinco segundos

Si un revisor no puede decir objeto, excepción y próxima acción en 5 s, el problema es ruido o jerarquía plana — no falta de color.
