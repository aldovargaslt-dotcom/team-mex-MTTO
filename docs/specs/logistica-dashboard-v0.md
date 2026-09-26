# SPEC-LOGISTICA-DASHBOARD-001 — Dashboard operacional de Logística

## Status

Approved — product owner direction in Codex, 2026-09-26. Execution is tracked by [EWO-008](../engineering-work-orders/EWO-008.md).

Arquitectura de información solicitada el 2026-09-26: acciones mobile-first, una colección unificada de unidades disponibles, registro de movimiento y sección de alertas abiertas. “Registrar entrada” se refiere al regreso del viaje de Logística. El Registro de movimiento incluye únicamente `SALIDA` y `ENTRADA` de la bitácora de patio con fecha `occurredAt` de hoy en `America/Mexico_City`.

## Problem

En `/logistica`, el estado actual repite las unidades entre “activas” y “disponibles”, recorta las listas a cuatro registros y obliga a interpretar el estado operativo desde varios bloques. Logística necesita identificar todas las unidades activas del catálogo una sola vez, actuar sobre sus viajes y entender las entradas y salidas del día desde el mismo flujo.

## Context

La vista recibe el conjunto de unidades de `GET /logistica/unidades`. La respuesta compartida expone el estado de catálogo y los metadatos visuales; `/logistica` filtra `estado=ACTIVA` y muestra el estado de viaje dentro de cada tarjeta. El límite de cuatro registros vivía en la presentación (`slice(0, 4)`); el endpoint no pagina esta respuesta.

La dirección de producto aprobada para Logística Flota está en EWO-008. Esta SPEC captura los cambios solicitados el 2026-09-26, no cambia la semántica de `opsEstado`, `salidaAt` ni alertas, y agrega una lectura diaria de movimientos de patio ya persistidos.

## Goals

- Mostrar una sola colección “Unidades disponibles” con todas las unidades de catálogo `ACTIVA`, incluidas las que están `DISPONIBLE` o `EN_RUTA` en Logística.
- Mantener alertas, unidades y movimientos dentro de regiones de desplazamiento vertical cuando excedan su altura disponible.
- Quitar la navegación “Ver todos” / “Ver todas” que solo servía para encontrar registros recortados.
- Organizar `/logistica` mobile-first alrededor de Registrar salida, Registrar entrada del viaje, alertas abiertas, unidades disponibles y últimos movimientos.
- Mostrar foto de catálogo o icono del tipo para reconocer cada unidad.

## Non-goals

- Cambiar reglas de negocio, permisos, acciones por unidad, captura de la bitácora de patio o los flujos de `SALIDA` / `ENTRADA`.
- Sustituir la navegación “Ver movimientos”, que abre el tablero `/flota` para consultar filtros y operaciones completas.
- Mostrar todos los registros simultáneamente sin desplazamiento; el usuario puede recorrer la lista completa dentro de su región.
- Cambiar el tablero detallado `/flota`, sus filtros o su colección completa de unidades.

## Actors

`LOGISTICA` y `ADMIN_DIRECTIVO`, conforme a EWO-008.

## Functional Behavior

Alertas abiertas conserva la cola de unidades `SIN_REGRESO`. “Unidades disponibles” renderiza una sola vez cada unidad con `estado=ACTIVA`, sin separar `DISPONIBLE` y `EN_RUTA`. “Últimos movimientos” conserva las entradas y salidas de patio del día. No se aplica un límite de cuatro filas en el cliente.

Cada lista vive en una región independiente con desplazamiento vertical nativo. La colección de unidades usa una altura máxima de `min(32rem, 55dvh)`; alertas y movimientos usan `min(24rem, 45dvh)`. Si hay menos contenido, la región ocupa solo la altura necesaria. La región admite rueda, gesto táctil y teclado; no se implementa un control `slider` (`role="slider"`).

“Ver todos” y “Ver todas” se eliminan. “Ver movimientos” permanece como acceso distinto al tablero `/flota`. El resumen KPI se elimina para evitar duplicar el estado que ya aparece en las tarjetas.

## Addendum de arquitectura de información — 2026-09-26

La vista debe incluir estas áreas operativas:

1. **Registrar salida** — abrir la hoja existente de salida de Logística y conservar la selección de unidad disponible y chofer.
2. **Registrar entrada del viaje** — completar el regreso de un viaje de Logística (`opsEstado: EN_RUTA → DISPONIBLE`, limpiando `salida_at`) con el flujo existente `POST /logistica/regresos/:unidadId`. No es una `ENTRADA` de patio de Flota ni debe escribir en `flota.*`.
3. **Alertas abiertas** — listar las unidades con `alerta=SIN_REGRESO` como regresos pendientes accionables. Son alertas de Logística, no avisos de mantenimiento Andon.
4. **Unidades disponibles** — listar en una sola colección las unidades de catálogo `ACTIVA`; mostrar dentro de cada tarjeta su estado operativo `DISPONIBLE` o `EN_RUTA` y la información de viaje vigente.
5. **Registro de movimiento** — mostrar exclusivamente los movimientos `SALIDA` y `ENTRADA` de la bitácora de patio cuya `occurredAt` cae en el día actual de `America/Mexico_City`, ordenados del más reciente al más antiguo.

La jerarquía deja disponibles las dos acciones, prioriza los regresos pendientes, presenta la colección unificada de unidades y termina con los últimos movimientos. El resumen KPI se retira. En móvil, se usa una sola columna y no se depende de desplazamiento horizontal.

## Business Rules

- La colección de unidades se deriva de `items` recibido de `GET /logistica/unidades` y filtra `estado=ACTIVA`; `opsEstado` determina la acción y el detalle dentro de la tarjeta. El registro de movimientos se lee desde Flota con un endpoint de solo lectura que limita la consulta al día actual en `America/Mexico_City` usando `occurredAt`.
- Cada unidad activa aparece como máximo una vez en la colección unificada; una unidad con `SIN_REGRESO` también puede aparecer en alertas por tratarse de una excepción accionable.
- No se crean estados, entidades ni persistencia. Se agrega únicamente `GET /flota/movimientos/hoy`; no cambia la escritura de movimientos ni sus reglas.

## Domain Implications

La vista combina el dashboard provisional de `domain/logistica` con una lectura del historial cuyo ownership permanece en `domain/flota`. El endpoint consulta únicamente `flota.movimientos` mediante el store de Flota y resuelve nombres con los servicios de catálogo existentes; no crea tablas ni cruza schemas con joins.

## State Transitions

El nuevo endpoint no provoca transiciones. Los botones existentes de salida y regreso conservan sus flujos.

## Constraints

### Architecture

El nuevo contrato es solo de lectura y vive en el controller/servicio/store de Flota. El endpoint omite firmas y datos de auditoría; solo retorna tipo, unidad, chofer, sitio, hora y kilometraje.

### Compatibility

“Ver movimientos” sigue abriendo `/flota` con el destino actual.

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

### AC-01 — Las listas muestran todos los registros relevantes

Given que la respuesta contiene más de cuatro unidades activas, alertas o movimientos
When `/logistica` se renderiza
Then Alertas abiertas, Unidades disponibles y Últimos movimientos incluyen todas las filas que corresponden según sus reglas, sin `slice(0, 4)`.

### AC-02 — Desplazamiento vertical independiente

Given que una lista excede su altura máxima configurada
When la persona desplaza esa lista con rueda, gesto táctil o teclado
Then recorre sus filas sin desplazar accidentalmente el contenido de las otras listas y la región conserva un nombre accesible.

### AC-03 — Enlaces redundantes eliminados

Given que la vista muestra sus listas  
When Pendientes de regreso y Unidades disponibles aparecen  
Then no se muestran los enlaces “Ver todos” ni “Ver todas”; “Ver movimientos” conserva su destino actual y no se muestra el resumen KPI.

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
When se muestran las áreas con listas largas
Then las regiones permanecen utilizables, sin overflow horizontal, y sus acciones por fila siguen disponibles.

### AC-07 — Jerarquía tipográfica y semántica

Given las secciones del dashboard visibles
When la vista se renderiza
Then el énfasis semántico queda reservado a alertas, movimientos y estados operativos; los H2 de sección usan 13 px conforme al sistema de diseño.

### AC-08 — Entrada directa para registrar salida y regreso

Given unidades disponibles y unidades con `opsEstado=EN_RUTA`
When la persona elige Registrar salida o Registrar entrada del viaje
Then la acción abre su selección/confirmación en esta vista y el regreso usa el contrato de Logística sin registrar una entrada en la bitácora de patio.

### AC-09 — Unidades en ruta dentro de la colección unificada

Given unidades de catálogo `ACTIVA` con `opsEstado=EN_RUTA`
When se muestra la colección “Unidades disponibles”
Then aparecen dentro de la misma colección con chofer, destino y hora de salida disponibles, incluyendo las que también tienen alerta abierta.

### AC-10 — Alertas abiertas

Given unidades que superaron el umbral actual de regreso
When se muestra la sección de alertas abiertas
Then aparecen como pendientes de regreso (`SIN_REGRESO`) con la acción correspondiente y sin confundirse con avisos Andon.

### AC-11 — Mobile first

Given un viewport de 390×844 o menor
When se usa el dashboard de Logística
Then el flujo se presenta en una sola columna, las acciones táctiles conservan targets de al menos 44 px y no aparece overflow horizontal.

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
| AC-01 | Más de cuatro filas en una colección | `proof-ui` seeded flow, revisar primera y última fila de cada región | Evidencia de revisión visual |
| AC-02 | Wheel/keyboard and touch scrolling remain independent | `proof-ui` click-through at d1440 and m390 | `docs/screenshots/logistica_dashboard_scroll_m390.png` |
| AC-03 | Enlaces redundantes y KPI retirados; tablero accesible | Inspección DOM/accesibilidad mediante click-through | Evidencia de revisión visual |
| AC-04 | Repeated unit actions are outline; one solid orange CTA | Screenshot and click-through | Same screenshots |
| AC-05 | Empty and short lists | Existing seeded state plus empty state when available | Evidence report |
| AC-06 | Desktop/mobile layout | `proof-ui` at 1440×900 and 390×844 | Screenshot paths above |
| AC-07 | Jerarquía semántica y escala de encabezados | Revisión contra `DESIGN_SYSTEM.md` a d1440 y m390 | Informe de evidencia |
| AC-08 | Acciones directas para registrar salida y entrada del viaje | Recorrido de ambas hojas; revisar el contrato de Logística existente | Falta proof visual |
| AC-09 | Unidades EN_RUTA dentro de la colección unificada | Recorrido con unidades ACTIVA en ruta, con y sin SIN_REGRESO | Informe de evidencia |
| AC-10 | Alertas abiertas como regresos pendientes, separadas de Andon | Revisar semántica de datos y etiquetas | Informe de evidencia |
| AC-11 | Flujo mobile-first en una sola columna | `proof-ui` a 390×844 y viewport angosto | Capturas pendientes |
| AC-12 | Solo SALIDA/ENTRADA ocurridas hoy en hora local CDMX | Click-through con movimientos de ambos límites de día y estado vacío | Pendiente de prueba |

## Risks and assumptions

- Confirmed from the current implementation: the web layer truncates groups at four rows; the API response is an unpaged `items` array.
- Assumption made explicit: “slider vertical” means native vertical scrolling, not a range slider/carousel.
- Scrollbar visibility follows the platform; keyboard focus and a named region provide a non-pointer path.
- This is scoped to the `/logistica` dashboard. The full `/flota` board remains available through “Ver movimientos”.
- “Registrar entrada” means completion of a Logistics trip return per the user clarification on 2026-09-26; it does not mean a patio `ENTRADA`.
- El Registro de movimiento significa únicamente eventos de patio `SALIDA` / `ENTRADA` cuyo `occurredAt` cae hoy en `America/Mexico_City`.

## Addendum — catálogo activo unificado y últimos movimientos (2026-09-26)

El product owner sustituyó la separación visual entre “Unidades activas” y “Unidades disponibles”. En esta vista, **Unidades disponibles** significa el conjunto de unidades con estado de catálogo `ACTIVA`: excluye unidades `INACTIVA` asociadas a mantenimiento o desactivación. El estado de viaje `EN_RUTA | DISPONIBLE` sigue siendo independiente y se muestra dentro de cada tarjeta; no se deriva de la bitácora de patio.

La respuesta compartida de `GET /logistica/unidades` agrega el estado de catálogo y metadatos de presentación ya propiedad del Kernel: foto de unidad, tipo/icono, marca/modelo y año. El dashboard `/logistica` filtra `estado=ACTIVA`; el tablero completo `/flota` conserva su colección actual. No se agrega persistencia ni se permite editar la foto desde Logística. Si no existe foto se usa el icono del tipo, conforme a ADR-009 y ADR-014.

La sección duplicada “Unidades activas” y el resumen KPI se eliminan. Alertas abiertas conserva prioridad y referencia las mismas unidades en ruta cuando superan el umbral. “Últimos movimientos” conserva únicamente `SALIDA` / `ENTRADA` de patio del día actual, con dirección visual, unidad, chofer, sitio y tiempo relativo; la lista completa permanece disponible mediante “Ver movimientos”.

### AC-13 — Una sola colección de unidades

Given unidades de catálogo `ACTIVA` con viaje `DISPONIBLE` o `EN_RUTA`, y unidades de catálogo `INACTIVA`
When se carga `/logistica`
Then se muestra una sola sección “Unidades disponibles” con las unidades `ACTIVA`, cada una con su estado de viaje, y no aparecen unidades `INACTIVA`, una sección separada “Unidades activas” ni el resumen KPI.

### AC-14 — Identidad visual de la unidad

Given una unidad activa con o sin `fotoDataUrl`
When se muestra su tarjeta o una alerta de regreso
Then se usa su foto de catálogo y, si falta, el icono de su tipo; se muestran marca/modelo o tipo, número interno y placas sin habilitar edición.

### AC-15 — Últimos movimientos escaneables

Given movimientos de patio de hoy
When se muestra “Últimos movimientos”
Then cada fila distingue entrada y salida por dirección, prioriza la identidad de la unidad, resume chofer y sitio, muestra tiempo relativo y conserva el orden más reciente primero dentro de una lista vertical.
