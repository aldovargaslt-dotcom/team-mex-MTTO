# UX — Órdenes de trabajo (cola + ficha)

Pantalla para ver órdenes abiertas o cerradas sin salir de la cola. Desde la orden abierta se sube la foto de la unidad, se agregan piezas y se adjuntan fotos. El wizard sigue siendo el cierre de la visita.

## Screen purpose

Elegir una orden y leer apertura, cierre, tipo, imágenes, comentarios y el desglose de piezas (SKU).

## Primary user

`SUPERVISOR` (abiertas y cerradas, desktop y 390). `ADMIN_DIRECTIVO` solo cerradas (la API no entrega borradores).

## Questions the screen must answer

1. ¿Qué estoy viendo? — La cola de órdenes de la flota, no el wizard.
2. ¿Debo actuar? — En un borrador, el menú de captura (foto de la unidad, pieza, foto de la orden) y Editar abre el wizard. Si no hay borrador seleccionado, Nueva orden va a Unidades.
3. ¿Cuál es el estado ahora? — Borrador o Cerrada. Predictivo o Correctivo.
4. ¿Qué apoyo hay? — Fechas, tiempo de cerrado, fotos, comentarios y piezas.

## Primary action

- Supervisor con borrador seleccionado: **Continuar** (`default`). **Nueva orden** pasa a `outline`.
- Supervisor sin borrador seleccionado: **Nueva orden** (`default`) → `/unidades`.
- Admin: cero naranja. **Abrir orden** (`outline`) abre la ficha ya cerrada.

## Secondary actions

- **Abrir orden** (`outline`) cuando la orden está cerrada.
- Menú de la orden seleccionada: **Foto de la unidad** (siempre), **Agregar pieza** y **Subir foto** (solo borrador de supervisor). Un panel a la vez.
- Filtros `ListFilter`: Abiertas / Cerradas (solo supervisor) y Todos / Predictivo / Correctivo.
- Búsqueda: unidad, placas o chofer. La URL guarda `cola`, `tipo`, `q`, `orden`.

## Information hierarchy

P0: número interno de la orden seleccionada + un badge de estado.  
P1: Continuar, o la fila seleccionada de la cola.  
P2: fecha de apertura, fecha de cierre, tiempo de cerrado, tipo de mantenimiento, piezas (SKU, nombre, cantidad, origen).  
P3: chofer, km, trabajos, imágenes, comentarios.

Qué se calla: UUID, costeo, estados que no existen (pausada, en progreso), asignación de técnico.

## Pattern

Patrón 3 (listado + filtro) con la ficha del patrón 5 en la misma vista, para no perder la cola al leer el desglose. No es kanban ni un patrón nuevo de tarjetas con foto.

## States

- loading: “Cargando órdenes…” / “Cargando la orden…”
- empty abiertas: “No hay órdenes abiertas.” + “Un borrador nace en la unidad…”
- empty cerradas: “No hay órdenes cerradas.”
- empty búsqueda: “Pruebe otro texto o quite el filtro de tipo.”
- error: alerta de carga parcial o total.
- normal: lista a la izquierda, ficha a la derecha.
- sin imágenes / sin comentarios / sin piezas: una línea muted.

## Interaction notes

La fila selecciona; no hay botón “Detalle”. La primera fila visible queda seleccionada. Cambiar cola o tipo limpia la selección y elige la primera de la nueva lista.

## Mobile / responsive

- Desktop 1440: dos columnas dentro del ancho 1040.
- 800 y menos: lista arriba (altura acotada) y ficha abajo. Hits ≥44px.

## Fuera / Don’t

- No costeo (fuera de v0). No estados nuevos. No reemplazar el wizard. No unificar notify.
- La foto de la unidad es el único write nuevo: `PATCH /unidades/:id/foto` (ADR-014). Piezas y fotos de la orden usan el `PATCH /visitas/:id` que ya existía.
- Sin fotos redondas por fila, sin cuatro botones de estado, sin columna de costo.

## Proof

`docs/screenshots/ordenes_cola_abierta_d1440.png`, `docs/screenshots/ordenes_cola_abierta_m390.png`.
