# UX spec — Dashboard Logística Flota v0

Estado: aprobado por dirección del producto en Codex, 2026-09-26. Complementa [SPEC-LOGISTICA-DASHBOARD-001](../specs/logistica-dashboard-v0.md) y se ejecuta bajo [EWO-008](../engineering-work-orders/EWO-008.md). Aplica a `/logistica`; el tablero detallado `/flota` conserva su propio spec.

## Screen purpose

Revisar pendientes, unidades disponibles y viajes activos, recorrer todas las opciones en la misma vista y registrar la siguiente salida o regreso.

## Primary user

`LOGISTICA`; espejo `ADMIN_DIRECTIVO`.

## Questions the screen must answer

1. ¿Qué estoy viendo? — Movimientos operativos de la flota.
2. ¿Hay algo mal? — Pendientes de regreso destacados primero.
3. ¿Debo actuar? — Registrar salida o ir a registrar regreso.
4. ¿Cuál es el estado ahora? — Disponibles y viajes activos con chofer, destino y hora.
5. ¿Qué apoyo hay? — Acceso a `/flota` para filtros y operaciones completas.

## Primary action

`Registrar salida` — botón `default` naranja. `Registrar regreso` conserva su estilo secundario y destino.

## Secondary actions

- KPI En ruta / Disponibles / Pendientes de regreso — links a los filtros existentes en `/flota`.
- `Registrar regreso de {unidad}` en cada pendiente — variante `outline`, conservar destino filtrado actual.
- `Registrar salida de {unidad}` en cada unidad disponible — variante `outline`; la cabecera mantiene el único CTA naranja sólido.
- `Ver movimientos` — conservar acceso al tablero `/flota`.
- Quitar solo `Ver todos` y `Ver todas`; las opciones se recorren en las listas de esta vista.

## Information hierarchy

P0: H1 Movimientos de flota + acciones de salida/regreso.  
P1: Pendientes de regreso y su CTA por unidad.  
P2: Unidades disponibles y viajes activos.  
P3: Resumen KPI y apoyo hacia el tablero completo.

Qué se calla: navegación redundante para consultar más de cuatro registros; datos o reglas nuevas.

## Visual tokens

- H2 de sección: 13 px, peso 600, según `docs/design/DESIGN_SYSTEM.md`.
- KPI links: superficie neutral; reservar color semántico para alertas y estados operativos.
- Mantener una sola acción primaria naranja sólida.

## Pattern

Resumen operacional por secciones de cola/lista; no se añade un patrón de página nuevo. Reusar primitivas del design system, sin convertir cada lista en una nueva card externa.

## States

- loading: conservar `Cargando estado de flota…`, `Cargando pendientes…`, `Cargando unidades disponibles…` y `Cargando unidades en ruta…`.
- empty: conservar mensajes actuales por sección.
- error: conservar `FormAlert` y acción `Reintentar` existentes.
- normal: todas las filas del grupo en lista de altura natural hasta `min(24rem, 45dvh)`; después, scroll vertical nativo.
- warning: conservar destaque de pendientes de regreso.
- critical: ninguno nuevo.

## Interaction notes

- Cada lista se desplaza de forma independiente con rueda, touch o teclado (`Tab` para enfocar la región, flechas/PgUp/PgDn para recorrer).
- Máximo de bloque: `min(24rem, 45dvh)`; si el contenido no lo alcanza, el contenedor no se expande para llenar el máximo.
- Cada región de scroll tiene nombre accesible y foco visible. La lista y los botones por fila mantienen semántica existente.
- No usar `role="slider"`: no es un control de valor ni carrusel.
- KPIs y `Ver movimientos` mantienen navegación existente a `/flota`.
- No cambiar el flujo de los sheets ni mutaciones de salida/regreso.

## Mobile / responsive

- Desktop 1440×900: listas independientes, cada una con límite de 384 px; mostrar varias filas y scrollar el resto.
- 1024×768: conservar ancho y scroll interno; sin desbordamiento horizontal.
- 390×844: límite de lista 45dvh, targets táctiles existentes ≥44 px, navegación vertical touch independiente.

## Fuera / Don’t

- No truncar la lista a cuatro filas.
- No mostrar `Ver todos` / `Ver todas`.
- No quitar `Ver movimientos` ni enlaces KPI en este corte.
- No añadir paginación, carga incremental, endpoint nuevo, búsqueda, filtro, orden, card de más, carrusel o slider de rango.
- No tocar `api/src`, Mantenimiento `/unidades`, Andon ni ciclo de bitácora de patio.

## Proof

- `docs/screenshots/logistica_dashboard_listas_completas_d1440.png`
- `docs/screenshots/logistica_dashboard_scroll_m390.png`
