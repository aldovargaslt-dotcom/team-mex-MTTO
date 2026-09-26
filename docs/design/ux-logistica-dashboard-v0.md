# UX spec — Dashboard Logística Flota v0

Estado: aprobado el corte de listas completas y addendum mobile-first. El Registro de movimiento quedó definido como solo `SALIDA` / `ENTRADA` de patio ocurridas hoy en `America/Mexico_City`. Complementa [SPEC-LOGISTICA-DASHBOARD-001](../specs/logistica-dashboard-v0.md) y se ejecuta bajo [EWO-008](../engineering-work-orders/EWO-008.md). Aplica a `/logistica`; el tablero detallado `/flota` conserva su propio spec.

## Screen purpose

Revisar pendientes, unidades disponibles, viajes activos y movimientos de patio de hoy; recorrer todas las opciones en la misma vista y registrar la siguiente salida o regreso.

## Primary user

`LOGISTICA`; espejo `ADMIN_DIRECTIVO`. Mobile first por dirección explícita del usuario.

## Questions the screen must answer

1. ¿Qué estoy viendo? — Movimientos operativos de la flota.
2. ¿Hay algo mal? — Pendientes de regreso destacados primero.
3. ¿Debo actuar? — Registrar salida o ir a registrar regreso.
4. ¿Cuál es el estado ahora? — Disponibles y viajes activos con chofer, destino y hora.
5. ¿Qué movimientos de patio ocurrieron hoy? — Entradas y salidas ordenadas por hora local, con unidad, chofer y sitio.
6. ¿Qué apoyo hay? — Acceso a `/flota` para filtros y operaciones completas.

## Primary action

`Registrar salida` — botón `default` naranja. `Registrar entrada` abre la sheet para cerrar un viaje Logística y conserva estilo secundario.

La opción de entrada en este dashboard cierra el regreso del viaje Logística. Debe explicar que cambia `EN_RUTA` a `DISPONIBLE` y no registra una `ENTRADA` en la bitácora de patio.

## Secondary actions

- KPI En ruta / Disponibles / Pendientes de regreso — links a los filtros existentes en `/flota`.
- `Registrar entrada de {unidad}` en cada alerta abierta — variante `outline`, abre la sheet con esa unidad seleccionada.
- `Registrar salida de {unidad}` en cada unidad disponible — variante `outline`; la cabecera mantiene el único CTA naranja sólido.
- `Ver movimientos` — conservar acceso al tablero `/flota`.
- Quitar solo `Ver todos` y `Ver todas`; las opciones se recorren en las listas de esta vista.

## Information hierarchy

Orden mobile-first:

1. Movimientos de flota y acciones Registrar salida / Registrar entrada del viaje.
2. Alertas abiertas (`SIN_REGRESO`) y acción por unidad.
3. Lista completa de unidades activas (`opsEstado=EN_RUTA`), incluidas las que tienen alerta.
4. Registro de movimiento de patio de hoy (`SALIDA` / `ENTRADA`), más reciente primero.
5. Unidades disponibles para registrar salida, resumen KPI y acceso de apoyo a `/flota`.

Qué se calla: navegación redundante para consultar más de cuatro registros; datos o reglas nuevas.

## Visual tokens

- H1 de página: 20 px (`text-[20px]`) conforme a `docs/design/DESIGN_SYSTEM.md`.
- H2 de sección: 13 px, peso 600, según `docs/design/DESIGN_SYSTEM.md`.
- Gap entre áreas de la página: 12 px conforme al sistema; la lista de disponibles y los KPI se agrupan en el mismo bloque de apoyo.
- KPI links: superficie neutral; reservar color semántico para alertas y estados operativos.
- Mantener una sola acción primaria naranja sólida.

## Usability rationale

- **Visibilidad del estado:** confirmar los cambios de viaje y distinguir la actividad de patio por tipo y hora.
- **Correspondencia con el trabajo real:** la entrada cierra el viaje de Logística; el texto debe diferenciarla de `ENTRADA` en la bitácora de patio.
- **Reconocimiento sobre memoria:** mostrar la lista activa completa y las alertas abiertas como una cola identificable, no obligar a inferir pendientes desde un KPI.
- **Control y prevención de errores:** seleccionar una unidad `EN_RUTA` explícitamente antes de confirmar su regreso.
- **Minimalismo operacional:** una acción naranja dominante; alertas visibles antes de datos de apoyo; nada importante depende de hover.
- **Mobile first:** una columna a 390 px, orden de lectura consistente con prioridad y targets ≥44 px.

## Pattern

Resumen operacional por secciones de cola/lista; no se añade un patrón de página nuevo. Reusar primitivas del design system, sin convertir cada lista en una nueva card externa.

## States

- loading: conservar los estados existentes de Logística y mostrar `Cargando movimientos de hoy…` solo dentro de su sección.
- empty: conservar mensajes actuales por sección.
- error: el error de movimientos queda contenido en esa sección, sin ocultar las unidades del dashboard; los errores principales conservan `FormAlert` y `Reintentar`.
- empty de movimientos: cuando no haya movimientos hoy, mostrar un estado distinto al error.
- normal: todas las filas del grupo en lista de altura natural hasta `min(24rem, 45dvh)`; después, scroll vertical nativo.
- warning: conservar destaque de pendientes de regreso.
- critical: ninguno nuevo.

## Interaction notes

- La acción `Registrar entrada` abre selector de unidades `EN_RUTA`; las alertas abren la misma sheet con la unidad correspondiente preseleccionada.
- Los movimientos visibles corresponden a `occurredAt` del día actual en `America/Mexico_City`, incluyen solo `SALIDA` y `ENTRADA`, y se ordenan del más reciente al más antiguo.
- Cada fila muestra tipo, hora local, número/placas de unidad, chofer y sitio; no muestra firmas ni datos de creación.
- Cada lista se desplaza de forma independiente con rueda, touch o teclado (`Tab` para enfocar la región, flechas/PgUp/PgDn para recorrer).
- Máximo de bloque: `min(24rem, 45dvh)`; si el contenido no lo alcanza, el contenedor no se expande para llenar el máximo.
- Cada región de scroll tiene nombre accesible y foco visible. La lista y los botones por fila mantienen semántica existente.
- No usar `role="slider"`: no es un control de valor ni carrusel.
- KPIs y `Ver movimientos` mantienen navegación existente a `/flota`.
- No cambiar el flujo de los sheets ni mutaciones de salida/regreso.

## Mobile / responsive

- Mobile 390×844 es el viewport primario: acciones y alertas prioritarias en la primera columna, listas recorren verticalmente; targets táctiles ≥44 px y sin overflow horizontal.
- Desktop 1440×900: conservar las regiones de scroll internas cuando excedan su altura; no cambiar la jerarquía funcional.
- 1024×768: conservar ancho y scroll interno; sin desbordamiento horizontal.
- El registro de movimientos no se dibuja como tabla horizontal en mobile; usa filas compactas apilables dentro de una región con scroll vertical.

## Fuera / Don’t

- No truncar la lista a cuatro filas.
- No mostrar `Ver todos` / `Ver todas`.
- No quitar `Ver movimientos` ni enlaces KPI en este corte.
- No añadir paginación, carga incremental, búsqueda, filtro, formulario de movimientos, carrusel o slider de rango.
- No modificar la captura de la bitácora de patio, Mantenimiento `/unidades` ni Andon.

## Proof

- `docs/screenshots/logistica_dashboard_listas_completas_d1440.png`
- `docs/screenshots/logistica_dashboard_scroll_m390.png`
