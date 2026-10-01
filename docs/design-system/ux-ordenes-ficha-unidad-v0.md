# UX — Órdenes + expediente de unidad v0

## Estado

**Aprobada por producto el 2026-09-29 en Codex.** Complementa [SPEC-ORDENES-FICHA-UNIDAD-001](../specs/ordenes-ficha-unidad-v0.md); los AC de la SPEC son canónicos. Modo operacional: **Operate**. Preserva ADR-003, los patrones 3/5/6/7 y el lenguaje visual actual.

### Adenda propuesta — incompletitud y skeletons

**Pendiente de aprobación. No autoriza implementación.**

#### Feedback de campos faltantes

- La validación aparece al primer intento de avanzar/guardar, no castiga campos intactos desde que abre la vista.
- Resumen crítico: `Faltan {n} datos para continuar: {lista breve}.` Usa `FormAlert`, `role="alert"` y se ubica antes del grupo afectado.
- Mensaje inline: `Selecciona una unidad.`, `Selecciona un chofer.`, `Captura el kilometraje.` o `Selecciona el tipo de mantenimiento.` según el control. Borde `--danger`, texto de 12 px y un indicador textual; nunca solo rojo.
- Al enviar, el foco va al primer control inválido. Al corregirlo, se elimina su mensaje sin reiniciar el formulario.
- En Confirmar del wizard, `Falta para cerrar` conserva el inventario de pendientes pero adopta semántica crítica cuando efectivamente bloquea el cierre. `BORRADOR` sigue siendo badge warning/neutral, no danger.

#### Skeletons

- Primitiva compartida y austera: bloques gris neutro con bordes/radios existentes, `aria-hidden="true"`; sin gradiente ni shimmer.
- El contenedor expone `role="status"`, `aria-live="polite"` y copy contextual para lector de pantalla. El copy puede permanecer visible como meta discreta cuando ayuda a orientar.
- `/ordenes`: encabezado estable, 5 filas de lista y panel de detalle aproximado. Al cambiar `orden`, solo el detalle entra en skeleton; la lista no desaparece.
- `Nueva orden`: 4 filas de unidad durante el catálogo; después de selección, placeholders de los tres campos dependientes cuando corresponda.
- `/unidades/:id`: identidad 4:3, título, navegación de cuatro secciones y dos bloques de contenido; sin inventar datos o estados.
- Wizard: encabezado/stepper estables y skeleton del paso actual durante la carga inicial. Operaciones de guardado usan el estado existente del botón, no reemplazan toda la vista por skeleton.
- Error sustituye al skeleton y ofrece `Reintentar` cuando la lectura es idempotente. Empty se muestra solo después de una respuesta exitosa vacía.

#### Responsive y movimiento

- 1440/1024: el skeleton replica columnas y densidad final.
- 390: una sola columna, hits reservados de 44 px y sin overflow horizontal.
- Respeta `prefers-reduced-motion`; el corte no necesita animación para comunicar progreso.

#### Proof adicional

- `ordenes_loading_d1440.png`
- `ordenes_faltantes_m390.png`
- `unidad_loading_m390.png`
- `wizard_faltantes_d1440.png`

## Job and audience

El Supervisor llega a `/ordenes` con intención de abrir o continuar trabajo; debe iniciar una orden sin perder el contexto de la cola. Supervisor y Admin llegan a `/unidades/:id` para entender el estado de Mantenimiento de una unidad; solo el rol autorizado debe ver una acción principal.

## Outcome and proof

- Orden: unidad seleccionada, datos iniciales válidos, borrador único creado/recuperado y wizard abierto con retorno seguro.
- Expediente: en menos de cinco segundos se identifica unidad, excepción actual, siguiente acción y después historial/cadencia.
- Prueba visual y funcional en 390×844, 1024×768 y 1440×900; teclado y foco incluidos.

## Surface 1 — `/ordenes`

### Screen purpose

Encontrar, crear, continuar y revisar órdenes sin convertir la página en catálogo o kanban.

### Primary action

`Nueva orden` (`default`) para Supervisor. Admin no recibe esta acción.

### Information hierarchy

- **P0:** título `Órdenes` y estado de la cola.
- **P1:** orden seleccionada o flujo `Nueva orden`; en ficha borrador, `Continuar orden`.
- **P2:** búsqueda, filtro abiertas/cerradas e identidad de unidad.
- **P3:** fechas, metadatos y contenido cerrado.

### Pattern and topology

Patrón 3, listado denso + ficha. El alta corta usa patrón 7: dialog a 1024/1440 y sheet de borde inferior a 390. No introduce una página intermedia.

### Nueva orden — sequence

1. `Nueva orden` abre selector con título `Nueva orden` y descripción `Selecciona una unidad activa y captura los datos iniciales.`
2. Búsqueda por número interno, placas o tipo. Resultados de fila ≥44 px con foto/glifo, número, placas y tipo.
3. Al seleccionar, la identidad permanece visible y se muestran chofer, kilometraje y tipo (`Preventivo`, `Correctivo`).
4. Acción `Crear y continuar`; secundaria `Cancelar`.
5. Con borrador: reemplazar campos por `Esta unidad ya tiene una orden en borrador.` y CTA `Continuar orden`.

No usar wizard interno, stepper ni cards por campo. La selección y los datos caben en un solo flujo corto con validación inline.

### States and exact copy

- loading units: `Cargando unidades activas…`
- no matches: `No hay unidades activas que coincidan.`
- no active drivers: `No hay choferes activos disponibles. Activa un chofer antes de crear la orden.`
- invalid km: mensaje de validación del servidor junto al campo.
- existing draft: `Esta unidad ya tiene una orden en borrador.`
- concurrent draft: `Otra sesión creó la orden primero. Puedes continuarla aquí.`
- network error: `No pudimos crear la orden. Revisa tu conexión e inténtalo de nuevo.`
- submitting: botón `Creando…`, sin doble envío.
- inactive race: `La unidad ya no está activa y no puede recibir una orden nueva.`

### Queue continuity

`cola`, `q`, filtros y `orden` viven en URL. El wizard recibe un `returnTo` interno codificado; cerrar/cancelar/volver regresa a la misma URL. Nunca se representa ni sigue un host externo.

### Capture in order detail

Encabezado `Capturar en esta orden`. Dos botones secundarios: `Agregar pieza` y `Subir foto`; cada uno expone `aria-expanded` y `aria-controls`, muestra conteo (`2 piezas`, `3 de 8 fotos`) y mueve foco al panel. Al cerrar, foco vuelve al disparador. Guardado y error aparecen junto al control. En cerradas, encabezado `Piezas y fotos` y contenido sin affordance editable.

## Surface 2 — `/unidades/:id`

### Screen purpose

Comprender y configurar una unidad, revisar su mantenimiento y abrir una orden concreta sin duplicar el wizard.

### Primary action

Exactamente una según SPEC AC-U01: `Continuar orden`, `Nueva orden`, `Editar datos` o ninguna. `Cambiar foto` es secundaria para Admin.

### Information hierarchy

- **P0:** identidad de unidad, estado administrativo y excepción real de Mantenimiento/Andon.
- **P1:** única acción principal y explicación de qué sigue.
- **P2:** hechos actuales de Resumen/Datos/Mantenimiento.
- **P3:** comparación, cadencia, timeline, piezas y metadatos.

### Pattern and topology

Patrón 5, hub/ficha. El rail se llama `Secciones`: `Resumen`, `Datos de unidad`, `Mantenimiento`, `Historial`. En escritorio funciona como navegación local sticky dentro del hub; en 390 es una fila de tabs con auto-scroll que siempre revela el activo. No son cinco tabs ni un segundo wizard.

### Content by section

- **Resumen:** salud y explicación, próximo mantenimiento/atraso, Andon actual, estado administrativo, último km, último cierre y siguiente acción.
- **Datos de unidad:** identidad y datos técnicos; edición solo Admin.
- **Mantenimiento:** intervalo, situación frente a umbral y borrador actual; no repite historial cerrado.
- **Historial:** comparación, cadencia, timeline y piezas usadas, en ese orden.

### Comparison

Título `Preventivo y correctivo`. Barra segmentada al 100 % con dos etiquetas siempre visibles: `Preventivo · N · P%` y `Correctivo · N · P%`. El patrón/etiqueta textual permite lectura sin color. No usar semáforo, juicio de valor, donut, KPI cards ni animación ornamental.

- zero: `Aún no hay órdenes cerradas para comparar.`
- one: `Hay una orden cerrada. Todavía no hay suficiente historial para mostrar una tendencia.` + dato real.
- two plus: comparación + `Cadencia entre servicios`.

### Cadence and timeline

Cada evento es una fila/enlace completo de ≥44 px, focus visible, chevron y etiqueta accesible `Ver orden`. Contenido: fecha, `Preventivo`/`Correctivo`, km, chofer, hasta dos trabajos, `N más` y `N piezas`. Entre eventos consecutivos se presenta `+N km · N días`; cero se muestra como `+0 km`/`0 días`, no se omite. Orden descendente.

### Photography

Foto 4:3, centrada con `object-fit: cover`; referencia 112×84 desktop y 96×72 mobile. Se alinea con nombre/placas, no con las acciones. Admin usa `Cambiar foto` y el editor existente; cancelar conserva la foto y confirmar la reemplaza. Supervisor no ve control de edición.

### States and exact copy

- loading: `Cargando ficha de la unidad…`
- no history: `Aún no hay órdenes de mantenimiento cerradas.`
- one history: copy de comparación anterior.
- hub error: `No pudimos cargar la ficha de la unidad.` + `Reintentar` si la lectura lo permite.
- inactive Supervisor: `La unidad está inactiva. No se puede crear una orden nueva.`
- no permission: omitir CTA; no mostrar botón deshabilitado.
- photo absent: glifo del tipo; Admin conserva `Cambiar foto`.

## Responsive behavior

- **1440:** `/ordenes` conserva lista + ficha; dialog centrado. Hub con rail de secciones y contenido; historial con ancho suficiente para comparación y texto.
- **1024:** lista/ficha puede comprimirse según patrón existente; dialog no corta acciones. Hub reduce columnas sin ocultar hechos.
- **390:** una columna; sheet casi a ancho completo con acciones visibles sobre safe area; secciones auto-scroll; filas de historial apilan meta sin overflow; todos los hits ≥44 px.

No hay acción o información disponible solo por hover o solo en desktop.

## Accessibility and interaction

- Dialog/sheet atrapa foco, cierra con Escape y restaura foco a `Nueva orden`.
- Errores se asocian a campos; estado async usa anuncio no intrusivo.
- Barra comparativa lleva texto equivalente y nombre accesible con totales.
- La fila histórica usa un único destino, no enlace anidado.
- Disclosures de pieza/foto implementan `aria-expanded`, `aria-controls` y restauración de foco.

## Fuera / Don’t

- No Flota, patio, Logística, chofer de patio ni timeline global.
- No dashboard, kanban, KPI cards, gráfica en `/inicio`, prioridad, SLA o estados nuevos.
- No segundo wizard en ficha, cards por dato, dos CTAs primarios o naranja en filtros.
- No migrar `PREDICTIVO`, focal point ni crop inteligente.
- No Playwright; no sustituir Visual QA.

## Proof

- `ordenes_nueva_sheet_m390.png`
- `ordenes_nueva_dialog_d1440.png`
- `ordenes_borrador_existente.png`
- `ordenes_captura_pieza_foto.png`
- `unidad_resumen_accion_contextual.png`
- `unidad_historial_comparativa_d1440.png`
- `unidad_historial_timeline_m390.png`
- `unidad_foto_recorte.png`

El click-through cubre Supervisor y Admin, teclado completo, 390/1024/1440 y un pase independiente de `ux-auditor`.
