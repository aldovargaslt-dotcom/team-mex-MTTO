# UX — Órdenes de trabajo (cola + ficha)

Pantalla para ver órdenes abiertas o cerradas sin salir de la cola. Desde la orden abierta se agregan piezas y se adjuntan fotos de esa orden. La foto de la unidad se edita en la ficha de la unidad. El wizard sigue siendo el cierre de la visita.

## Screen purpose

Elegir una orden y leer apertura, cierre, tipo, imágenes, comentarios y el desglose de piezas (SKU).

## Primary user

`SUPERVISOR` (abiertas y cerradas, desktop y 390). `ADMIN_DIRECTIVO` solo cerradas (la API no entrega borradores).

## Questions the screen must answer

1. ¿Qué estoy viendo? — La cola de órdenes de la flota, no el wizard.
2. ¿Debo actuar? — En un borrador, el menú de captura (pieza, foto de la orden) y Editar abre el wizard. Si no hay borrador seleccionado, Nueva orden va a Unidades.
3. ¿Cuál es el estado ahora? — Borrador o Cerrada. Predictivo o Correctivo.
4. ¿Qué apoyo hay? — Fechas, tiempo de cerrado, fotos, comentarios y piezas.

## Primary action

- Supervisor con borrador seleccionado: **Continuar** (`default`). **Nueva orden** pasa a `outline`.
- Supervisor sin borrador seleccionado: **Nueva orden** (`default`) → `/unidades`.
- Admin: cero naranja. **Abrir orden** (`outline`) abre la ficha ya cerrada.

## Secondary actions

- **Abrir orden** (`outline`) cuando la orden está cerrada.
- Menú de la orden seleccionada: **Agregar pieza** y **Subir foto** (solo borrador de supervisor). Un panel a la vez. La foto de la unidad no se edita aquí.
- En la fila y en la ficha, la marca de la unidad es su foto. Sin foto, el icono del tipo (van en STOCK y RUTAS).
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

La fila selecciona; no hay botón “Detalle”. En escritorio la primera fila visible queda seleccionada. En celular la lista espera el toque. Cambiar cola o tipo limpia la selección.

## Mobile / responsive

- Desktop: dos columnas. La primera fila queda seleccionada.
- 767 y menos: una pantalla a la vez. La lista no abre sola el detalle. Al tocar una orden, el detalle ocupa la pantalla. Arriba a la izquierda, «Órdenes» con chevron regresa a la lista. Hits ≥44px.

## Fuera / Don’t

- No costeo (fuera de v0). No estados nuevos. No reemplazar el wizard. No unificar notify.
- La orden no escribe `unidades.foto_data_url`. Eso queda en la ficha de unidad (ADR-014). Piezas y fotos de la orden usan el `PATCH /visitas/:id` que ya existía.
- Sin fotos redondas por fila, sin columna de costo.
- La barra Abierta / Pausada / En progreso / Hecha es solo lectura. Pausada y En progreso no se guardan.
- Un solo botón azul a la vez: Editar, o el guardar del panel abierto, o Nueva orden si no hay borrador.

## Proof

`docs/screenshots/ordenes_captura_menu_d1280.png`.
