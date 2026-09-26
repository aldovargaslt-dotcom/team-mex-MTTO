# SPEC-LOGISTICA-DASHBOARD-001 — Dashboard operacional de Logística

## Status

Approved — product owner direction in Codex, 2026-09-26. Execution is tracked by [EWO-008](../engineering-work-orders/EWO-008.md).

Addendum de arquitectura de información solicitado el 2026-09-26: acciones mobile-first, lista de unidades activas, registro de movimiento y sección de alertas abiertas. “Registrar entrada” se refiere al regreso del viaje de Logística. El Registro de movimiento incluye únicamente `SALIDA` y `ENTRADA` de la bitácora de patio con fecha `occurredAt` de hoy en `America/Mexico_City`.

## Problem

En `/logistica`, las listas de pendientes de regreso, unidades disponibles y viajes activos solo muestran cuatro registros. Para consultar los siguientes, la persona debe abandonar este resumen y abrir `/flota`. Logística necesita revisar todos los registros de cada grupo desde el mismo flujo.

## Context

La vista ya recibe el conjunto de unidades de `GET /logistica/unidades` y divide sus filas en tres grupos. El límite de cuatro registros vive en la presentación (`slice(0, 4)`); los enlaces “Ver todos” y “Ver todas” llevan al tablero completo. El endpoint actual no pagina esta respuesta.

La dirección de producto aprobada para Logística Flota está en EWO-008. Esta SPEC captura los cambios solicitados el 2026-09-26, no cambia la semántica de `opsEstado`, `salidaAt` ni alertas, y agrega una lectura diaria de movimientos de patio ya persistidos.

## Goals

- Mostrar todos los registros cargados para pendientes de regreso, unidades disponibles y viajes activos en `/logistica`.
- Mantener cada grupo dentro de una región de desplazamiento vertical independiente cuando exceda su altura disponible.
- Quitar la navegación “Ver todos” / “Ver todas” que solo servía para encontrar registros recortados.
- Organizar `/logistica` mobile-first alrededor de Registrar salida, Registrar entrada del viaje, unidades activas, registro de movimiento y alertas abiertas.

## Non-goals

- Cambiar reglas de negocio, permisos, acciones por unidad, captura de la bitácora de patio o los flujos de `SALIDA` / `ENTRADA`.
- Sustituir la navegación “Ver movimientos”, que abre el tablero `/flota` para consultar filtros y operaciones completas.
- Mostrar todos los registros simultáneamente sin desplazamiento; el usuario puede recorrer la lista completa dentro de su región.
- Cambiar los KPI enlazados, que siguen funcionando como accesos a vistas filtradas de `/flota`.

## Actors

`LOGISTICA` y `ADMIN_DIRECTIVO`, conforme a EWO-008.

## Functional Behavior

Las tres secciones conservan su contenido y acciones actuales, pero renderizan cada fila entregada por el conjunto ya cargado: pendientes, disponibles y viajes activos. No se aplica un límite de cuatro filas en el cliente.

Cada lista vive en una región independiente con desplazamiento vertical nativo. Su altura máxima es `min(24rem, 45dvh)`; si hay menos contenido, la región ocupa solo la altura necesaria. La región admite rueda, gesto táctil y teclado; no se implementa un control `slider` (`role="slider"`).

“Ver todos” y “Ver todas” se eliminan. “Ver movimientos” permanece como acceso distinto al tablero `/flota`; los KPI enlazados también permanecen.

## Addendum de arquitectura de información — 2026-09-26

La vista debe incluir estas áreas operativas:

1. **Registrar salida** — abrir la hoja existente de salida de Logística y conservar la selección de unidad disponible y chofer.
2. **Registrar entrada del viaje** — completar el regreso de un viaje de Logística (`opsEstado: EN_RUTA → DISPONIBLE`, limpiando `salida_at`) con el flujo existente `POST /logistica/regresos/:unidadId`. No es una `ENTRADA` de patio de Flota ni debe escribir en `flota.*`.
3. **Unidades activas** — listar las unidades `opsEstado=EN_RUTA` con chofer, destino y hora de salida actuales.
4. **Registro de movimiento** — mostrar exclusivamente los movimientos `SALIDA` y `ENTRADA` de la bitácora de patio cuya `occurredAt` cae en el día actual de `America/Mexico_City`, ordenados del más reciente al más antiguo.
5. **Alertas abiertas** — listar las unidades con `alerta=SIN_REGRESO` como regresos pendientes accionables. Son alertas de Logística, no avisos de mantenimiento Andon.

La jerarquía debe dejar las dos acciones disponibles, priorizar los regresos pendientes, mostrar las unidades activas y después el registro de movimientos. Agrupar la lista de unidades disponibles con los KPI como apoyo. Conservar los KPI como navegación de apoyo salvo que una decisión aprobada indique retirarlos. En móvil, usar una sola columna y no depender de desplazamiento horizontal.

## Business Rules

- Las secciones de unidades se derivan del mismo `items` recibido de `GET /logistica/unidades`; filtros de `opsEstado` y alerta permanecen iguales. El registro de movimientos se lee desde Flota con un endpoint de solo lectura que limita la consulta al día actual en `America/Mexico_City` usando `occurredAt`.
- Cada unidad aparece como máximo una vez en cada grupo al que corresponde la regla existente.
- No se crean estados, entidades ni persistencia. Se agrega únicamente `GET /flota/movimientos/hoy`; no cambia la escritura de movimientos ni sus reglas.

## Domain Implications

La vista combina el dashboard provisional de `domain/logistica` con una lectura del historial cuyo ownership permanece en `domain/flota`. El endpoint consulta únicamente `flota.movimientos` mediante el store de Flota y resuelve nombres con los servicios de catálogo existentes; no crea tablas ni cruza schemas con joins.

## State Transitions

El nuevo endpoint no provoca transiciones. Los botones existentes de salida y regreso conservan sus flujos.

## Constraints

### Architecture

El nuevo contrato es solo de lectura y vive en el controller/servicio/store de Flota. El endpoint omite firmas y datos de auditoría; solo retorna tipo, unidad, chofer, sitio, hora y kilometraje.

### Compatibility

La navegación de KPI y “Ver movimientos” sigue abriendo `/flota` con los destinos actuales.

### Security

Sin cambio de rol ni autorización.

### Performance

Se usa un rango diario acotado por `occurredAt`; la consulta selecciona metadatos sin cargar firmas. El navegador desplaza contenido dentro de cada lista.

### UX / Operational

Usar desplazamiento nativo independiente por lista, nombres accesibles por sección y foco de teclado visible. Mantener targets táctiles existentes y densidad del sistema Team Mex.

## Failure Behavior

El error del historial diario se muestra en esa sección y no oculta las unidades del dashboard. El desplazamiento solo aparece cuando el contenido rebasa la altura máxima; una fecha sin movimientos muestra su estado vacío.

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

### AC-08 — Entrada directa para registrar salida y regreso

Given unidades disponibles y unidades con `opsEstado=EN_RUTA`
When la persona elige Registrar salida o Registrar entrada del viaje
Then la acción abre su selección/confirmación en esta vista y el regreso usa el contrato de Logística sin registrar una entrada en la bitácora de patio.

### AC-09 — Lista de unidades activas

Given unidades con `opsEstado=EN_RUTA`
When se muestra la lista de unidades activas
Then aparecen todas las unidades activas con chofer, destino y hora de salida disponibles, incluyendo las que también tienen alerta abierta.

### AC-10 — Alertas abiertas

Given unidades que superaron el umbral actual de regreso
When se muestra la sección de alertas abiertas
Then aparecen como pendientes de regreso (`SIN_REGRESO`) con la acción correspondiente y sin confundirse con avisos Andon.

### AC-11 — Mobile first

Given un viewport de 390×844 o menor
When se usa el dashboard de Logística
Then las cinco áreas se presentan en una sola columna, las acciones táctiles conservan targets de al menos 44 px y no aparece overflow horizontal.

### AC-12 — Entradas y salidas de hoy

Given movimientos de patio con tipo `SALIDA` o `ENTRADA` dentro de la fecha actual de `America/Mexico_City`
When se carga `/logistica`
Then se muestran solo esos movimientos, usando `occurredAt`, del más reciente al más antiguo, sin firmas y con estado vacío cuando no existan.

## Dependencies

- `GET /logistica/unidades` con respuesta completa actual.
- `GET /flota/movimientos/hoy` de lectura diaria, protegido por los roles Flota actuales.
- EWO-008 y sus estados de carga, vacío y error.

## Related ADRs

- [ADR-008 — Módulo Flota](../adr/008-flota-schema.md)
- [ADR-011 — Logística Flota ops estado](../adr/011-logistica-flota-ops-estado.md)
- [ADR-012 — Flota sin regreso alertas](../adr/012-flota-sin-regreso-alertas.md)
- [ADR-003 — shadcn/ui + Tailwind](../adr/003-shadcn-tailwind.md)

## Open Questions

Ninguna. El alcance del registro quedó definido: movimientos de patio `SALIDA` / `ENTRADA` del día actual.

## Traceability and impact

- PRD: not applicable; focused UI behavior within approved EWO-008.
- Affected domain card: `domain/logistica/CONTEXT.md`.
- Current behavior: `web/src/components/LogisticaDashboard.tsx` limits each list to four rows.
- Data model/schema impact: none. Se agrega un endpoint de lectura acotado al día local.
- UI impact: listas completas, acciones de viaje, alertas y movimientos de patio de hoy. See [UX spec](../design/ux-logistica-dashboard-v0.md).

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
| AC-08 | Acciones directas para registrar salida y entrada del viaje | Recorrido de ambas hojas; revisar el contrato de Logística existente | Falta proof visual |
| AC-09 | Lista completa de unidades activas, incluidas las alertadas | Recorrido con unidades EN_RUTA con y sin SIN_REGRESO | Informe de evidencia |
| AC-10 | Alertas abiertas como regresos pendientes, separadas de Andon | Revisar semántica de datos y etiquetas | Informe de evidencia |
| AC-11 | Flujo mobile-first en una sola columna | `proof-ui` a 390×844 y viewport angosto | Capturas pendientes |
| AC-12 | Solo SALIDA/ENTRADA ocurridas hoy en hora local CDMX | Click-through con movimientos de ambos límites de día y estado vacío | Pendiente de prueba |

## Risks and assumptions

- Confirmed from the current implementation: the web layer truncates groups at four rows; the API response is an unpaged `items` array.
- Assumption made explicit: “slider vertical” means native vertical scrolling, not a range slider/carousel.
- Scrollbar visibility follows the platform; keyboard focus and a named region provide a non-pointer path.
- This is scoped to the `/logistica` dashboard. The full `/flota` board remains available through “Ver movimientos” and KPI links.
- “Registrar entrada” means completion of a Logistics trip return per the user clarification on 2026-09-26; it does not mean a patio `ENTRADA`.
- El Registro de movimiento significa únicamente eventos de patio `SALIDA` / `ENTRADA` cuyo `occurredAt` cae hoy en `America/Mexico_City`.
