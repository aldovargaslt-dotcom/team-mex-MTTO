# UX spec template

Complementa el spec funcional (ADR, corte en `docs/design-system/`, Must del PR). **No** lo reemplaza.

Obligatoria si el cambio altera layout, jerarquía, acciones o estados. Opcional si es copy puntual o un string.

Copiar a `docs/design-system/` junto al corte **o** al cuerpo del PR (sección Must) si el corte es chico. No crear `work-orders/`.

---

## Screen purpose

Una frase. Qué trabajo termina el usuario en esta superficie.

## Primary user

`SUPERVISOR` | `ADMIN_DIRECTIVO` | `LOGISTICA` — y si es mobile WO o desktop.

## Questions the screen must answer

Mapear a las cinco preguntas. Borrar las que no apliquen; no añadir un sexto dashboard.

1. ¿Qué estoy viendo?
2. ¿Hay algo mal?
3. ¿Debo actuar?
4. ¿Cuál es el estado ahora?
5. ¿Qué apoyo hay?

## Primary action

Una. Label exacto en español. `Button` `default` o “las filas son la acción” (Inicio).

## Secondary actions

Labels + variant (`secondary` / `outline` / `quiet` / `dangerSoft`). Máximo las que el trabajo exige.

## Information hierarchy

P0:  
P1:  
P2:  
P3:  

Qué se calla (no se pinta). Ver [VISUAL_HIERARCHY.md](VISUAL_HIERARCHY.md).

## Pattern

Cuál de [PAGE_PATTERNS.md](PAGE_PATTERNS.md). Si es nuevo: por qué no sirve 3 o 5.

## States

- loading:
- empty:
- error:
- normal:
- warning:
- critical:

Copy exacto. Empty explica *por qué* está vacío.

## Interaction notes

Fila clickeable, URL de filtros, sticky CTA, dialog vs sheet, qué no se edita en la lista.

Overlay: portal (no recorte). Motion: 150–250 ms, solo estado. Control nuevo: hover / `:focus-visible` / disabled. Ver [OPERATE_CRAFT.md](OPERATE_CRAFT.md).

## Mobile / responsive

- Desktop 1440:  
- 1024 (tabla apretada):  
- 390 (si Supervisor / WO / shell): hits 44px, Continuar visible.

## Fuera / Don’t

Pegar del corte. Visual only → no `api/src`. Flota vs UX operacional A–E: no mezclar programas.

## Proof

Nombres de PNG en `docs/screenshots/` + viewports ([SCREENSHOT_WORKFLOW.md](SCREENSHOT_WORKFLOW.md)).
