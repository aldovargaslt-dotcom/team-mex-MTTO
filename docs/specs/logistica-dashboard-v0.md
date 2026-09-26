# SPEC-LOGISTICA-DASHBOARD-001 — Listas completas en Movimientos de flota

## Status

Approved — product owner direction in Codex, 2026-09-26. Execution is tracked by [EWO-008](../engineering-work-orders/EWO-008.md).

## Problem

En `/logistica`, las listas de pendientes de regreso, unidades disponibles y viajes activos solo muestran cuatro registros. Para consultar los siguientes, la persona debe abandonar este resumen y abrir `/flota`. Logística necesita revisar todos los registros de cada grupo desde el mismo flujo.

## Context

La vista ya recibe el conjunto de unidades de `GET /logistica/unidades` y divide sus filas en tres grupos. El límite de cuatro registros vive en la presentación (`slice(0, 4)`); los enlaces “Ver todos” y “Ver todas” llevan al tablero completo. El endpoint actual no pagina esta respuesta.

La dirección de producto aprobada para Logística Flota está en EWO-008. Esta SPEC captura el cambio de alcance solicitado el 2026-09-26 y no modifica la semántica de `opsEstado`, `salidaAt`, alertas ni bitácora de patio.

## Goals

- Mostrar todos los registros cargados para pendientes de regreso, unidades disponibles y viajes activos en `/logistica`.
- Mantener cada grupo dentro de una región de desplazamiento vertical independiente cuando exceda su altura disponible.
- Quitar la navegación “Ver todos” / “Ver todas” que solo servía para encontrar registros recortados.

## Non-goals

- Cambiar datos, filtros, orden, reglas de negocio, API, permisos, acciones por unidad o la bitácora de patio.
- Sustituir la navegación “Ver movimientos”, que abre el tablero `/flota` para consultar filtros y operaciones completas.
- Mostrar todos los registros simultáneamente sin desplazamiento; el usuario puede recorrer la lista completa dentro de su región.
- Cambiar los KPI enlazados, que siguen funcionando como accesos a vistas filtradas de `/flota`.

## Actors

`LOGISTICA` y `ADMIN_DIRECTIVO`, conforme a EWO-008.

## Functional Behavior

Las tres secciones conservan su contenido y acciones actuales, pero renderizan cada fila entregada por el conjunto ya cargado: pendientes, disponibles y viajes activos. No se aplica un límite de cuatro filas en el cliente.

Cada lista vive en una región independiente con desplazamiento vertical nativo. Su altura máxima es `min(24rem, 45dvh)`; si hay menos contenido, la región ocupa solo la altura necesaria. La región admite rueda, gesto táctil y teclado; no se implementa un control `slider` (`role="slider"`).

“Ver todos” y “Ver todas” se eliminan. “Ver movimientos” permanece como acceso distinto al tablero `/flota`; los KPI enlazados también permanecen.

## Business Rules

- Las secciones se derivan del mismo `items` recibido de la API; filtros de `opsEstado` y alerta permanecen iguales.
- Cada unidad aparece como máximo una vez en cada grupo al que corresponde la regla existente.
- No se crean estado, ruta, entidad, endpoint, paginación ni persistencia nuevos.

## Domain Implications

Solo presentación de datos existentes en el área provisional `domain/logistica`. Se conservan ADR-011 y ADR-012.

## State Transitions

Ninguna. Los botones existentes de salida y enlaces de regreso conservan su flujo.

## Constraints

### Architecture

Visual-only; `api/src` y contratos HTTP no cambian.

### Compatibility

La navegación de KPI y “Ver movimientos” sigue abriendo `/flota` con los destinos actuales.

### Security

Sin cambio de rol ni autorización.

### Performance

Se renderiza el conjunto ya descargado. El navegador desplaza contenido dentro de cada lista; no se solicita información adicional.

### UX / Operational

Usar desplazamiento nativo independiente por lista, nombres accesibles por sección y foco de teclado visible. Mantener targets táctiles existentes y densidad del sistema Team Mex.

## Failure Behavior

No cambia el estado de error/reintento de la carga existente. El desplazamiento solo aparece cuando el contenido rebasa la altura máxima; las vistas vacías mantienen sus mensajes existentes.

## Edge Cases

- Cero, una o cuatro filas: conservar el alto natural y no mostrar desplazamiento innecesario.
- Más de cuatro filas: todas permanecen en el DOM/lista accesible y se recorren mediante scroll interno.
- Lista larga en móvil: no produce overflow horizontal ni captura el scroll vertical de las otras listas.

## Acceptance Criteria

### AC-01 — Las listas muestran todos los registros

Given que la respuesta contiene más de cuatro filas para uno o más grupos  
When `/logistica` se renderiza  
Then Pendientes de regreso, Unidades disponibles y En ruta incluyen todas las filas que corresponden según sus reglas actuales, sin `slice(0, 4)`.

### AC-02 — Desplazamiento vertical independiente

Given que una lista excede `min(24rem, 45dvh)`  
When la persona desplaza esa lista con rueda, gesto táctil o teclado  
Then recorre sus filas sin desplazar accidentalmente el contenido de las otras listas y la región conserva un nombre accesible.

### AC-03 — Enlaces redundantes eliminados

Given que la vista muestra sus listas  
When Pendientes de regreso y Unidades disponibles aparecen  
Then no se muestran los enlaces “Ver todos” ni “Ver todas”; KPI y “Ver movimientos” conservan sus destinos actuales.

### AC-04 — Acciones por unidad sin competir con la acción principal

Given que se muestran acciones para registrar salida o regreso por unidad  
When aparecen varias unidades en el dashboard  
Then esas acciones usan `outline`; `Registrar salida` en la cabecera permanece como el único botón sólido naranja de la vista.

### AC-05 — Contenido corto y vacío

Given una lista vacía o con cuatro filas o menos  
When la sección se muestra  
Then conserva el mensaje de carga/vacío existente y no presenta un viewport de scroll con espacio vacío forzado.

### AC-06 — Responsive

Given viewport de escritorio de 1440×900 o móvil de 390×844  
When se muestran las tres secciones con listas largas  
Then las regiones permanecen utilizables, sin overflow horizontal, y sus acciones por fila siguen disponibles.

### AC-07 — Jerarquía tipográfica y semántica

Given el resumen KPI y las secciones del dashboard visibles  
When la vista se renderiza  
Then los KPI conservan superficies neutrales, el énfasis semántico queda reservado a los estados operativos y los H2 de sección usan 13 px conforme al sistema de diseño.

## Dependencies

- `GET /logistica/unidades` con respuesta completa actual.
- EWO-008 y sus estados de carga, vacío y error.

## Related ADRs

- [ADR-011 — Logística Flota ops estado](../adr/011-logistica-flota-ops-estado.md)
- [ADR-012 — Flota sin regreso alertas](../adr/012-flota-sin-regreso-alertas.md)
- [ADR-003 — shadcn/ui + Tailwind](../adr/003-shadcn-tailwind.md)

## Open Questions

None for this change.

## Traceability and impact

- PRD: not applicable; focused UI behavior within approved EWO-008.
- Affected domain card: `domain/logistica/CONTEXT.md`.
- Current behavior: `web/src/components/LogisticaDashboard.tsx` limits each list to four rows.
- Data model/API impact: none.
- UI impact: three lists become internally scrollable; two “view all” actions are removed. See [UX spec](../design/ux-logistica-dashboard-v0.md).

## Negative cases and UI states

Loading, empty, API error, disabled controls and successful mutations are unchanged from EWO-008. A list that fits its viewport has no unnecessary forced height or scroll area.

## AC-to-test plan

| AC ID | Positive / negative scenario | Planned test / manual check | Evidence |
|---|---|---|---|
| AC-01 | More than four rows in each group | `proof-ui` seeded flow, inspect first and last rows in each scroll region | `docs/screenshots/logistica_dashboard_listas_completas_d1440.png` |
| AC-02 | Wheel/keyboard and touch scrolling remain independent | `proof-ui` click-through at d1440 and m390 | `docs/screenshots/logistica_dashboard_scroll_m390.png` |
| AC-03 | Removed links, retained board/KPI links | DOM/accessibility inspection through click-through | Same screenshots |
| AC-04 | Repeated unit actions are outline; one solid orange CTA | Screenshot and click-through | Same screenshots |
| AC-05 | Empty and short lists | Existing seeded state plus empty state when available | Evidence report |
| AC-06 | Desktop/mobile layout | `proof-ui` at 1440×900 and 390×844 | Screenshot paths above |
| AC-07 | Neutral KPI surfaces and section heading scale | Visual review against `DESIGN_SYSTEM.md` at d1440 and m390 | Evidence report |

## Risks and assumptions

- Confirmed from the current implementation: the web layer truncates groups at four rows; the API response is an unpaged `items` array.
- Assumption made explicit: “slider vertical” means native vertical scrolling, not a range slider/carousel.
- Scrollbar visibility follows the platform; keyboard focus and a named region provide a non-pointer path.
- This is scoped to the `/logistica` dashboard. The full `/flota` board remains available through “Ver movimientos” and KPI links.
