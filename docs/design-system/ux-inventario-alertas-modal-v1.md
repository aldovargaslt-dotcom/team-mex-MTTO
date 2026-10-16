# UX — Modal compacto de alertas de inventario

Estado: Proposed, 2026-10-16. Alcance visual aprobado en conversación; detalle listo para revisión/ejecución mediante EWO. Requisitos canónicos: [SPEC-INV-ALERT-001](../specs/SPEC-INV-ALERT-001.md). No implementado.

## Screen purpose

Encontrar productos y configurar mínimos de alerta con una referencia de salidas, sin perder cambios entre filtros o errores.

## Primary user

Supervisor y Admin Directivo; escritorio y móvil.

## Questions the screen must answer

1. Qué veo: mínimos de alerta de productos de Inventario, con periodo de referencia explícito.
2. Hay algo mal: entrada inválida, fallo de guardado o referencia no disponible diferenciados.
3. Debo actuar: pendientes por guardar/reintentar y ajustes críticos anunciados.
4. Estado actual: existencias, mínimo confirmado/borrador y resultado de cada guardado.
5. Apoyo: salidas del mes anterior y ayuda única para desactivar alertas.

## Primary action

«Guardar cambios» (`default`); «Guardando cambios…» durante envío y «Reintentar pendientes» tras parcial. Un CTA naranja por modal; footer con contador de modificaciones. Sin cambios = disabled.

## Secondary actions

«Cancelar» outline; X accesible «Cerrar configuración de alertas». «Establecer mínimo…» outline, «Quitar alertas» quiet, «Limpiar selección» quiet. Reintentar referencia y ver pendientes son acciones contextuales. Descartar requiere confirmación; no usa el estilo de éxito.

## Information hierarchy

- P0: errores que bloquean guardar y resumen de resultado parcial; próximos a la acción, no al final oculto de la lista.
- P1: tabla editable y Guardar cambios.
- P2: búsqueda, filtros, selección/lotes y contador pendiente.
- P3: SKU, referencia histórica y aclaraciones. Periodo visible; detalle de UTC/devoluciones en ayuda accesible.

Se omiten tarjetas por producto, instrucciones repetidas, fotos decorativas, gráficas, recomendaciones automáticas y métricas ajenas al trabajo.

## Pattern / Clone

Composición de patrón 3 (listado denso + filtro) dentro del patrón 7 (Dialog de edición), ambos existentes en [PAGE_PATTERNS](../design/PAGE_PATTERNS.md). Clonar tabla/controles de Existencias `/inventario/stock` y la gramática ListFilter de Andon; conservar Dialog, Input, Button y feedback compartidos. El mockup es orientación de composición, no fuente de tokens ni autorización para cambiar shell.

## Layout

Título «Configurar alertas de inventario». Lede «Define el mínimo de existencias para recibir una alerta». Buscador «Buscar por producto o SKU…». Chips ListFilter «Todos (N)», «Con alerta (N)», «Sin alerta (N)»; no usar subrayado de navegación para estos filtros.

Barra de lote visible al seleccionar: «3 seleccionados · 2 fuera de esta vista» y acciones F2. Tabla: checkbox, Producto (nombre + SKU), Existencias, Salidas mes anterior (mes/año), Avisar al llegar a (input + unidad). Inactivo se identifica junto al nombre. Marcador textual «Modificado»/«Guardado»/«Pendiente»/«No confirmado» cuando proceda; no depender solo del color.

No cambiar orden al teclear. Filas de aproximadamente 56–64 px donde el contenido lo permita; permitir crecimiento por errores/aviso crítico. Encabezado y pie visibles, lista con scroll interno. Ayuda única debajo de tabla: «Deja el mínimo vacío para desactivar la alerta». Placeholder de mínimo «Sin mínimo», siguiendo copy operacional existente.

## States

- loading stock: «Cargando productos…»; sin campos editables ni Guardar activo.
- empty catálogo: «No hay productos para configurar» / «Agrega refacciones al inventario para configurar sus alertas».
- empty búsqueda: «No hay productos que coincidan» / «Ajusta la búsqueda o los filtros», con limpiar filtros; conservar selección y borradores.
- error stock: «No se pudieron cargar los productos» + Reintentar.
- error validación: «Indica un número entero igual o mayor que 0, o deja el campo vacío» asociado al input; resumen permite enfocar filas ocultas.
- referencia: cargando / número con unidad / «No disponible»; reintento compartido.
- normal: fondo neutro; selección sutil y estado checkbox; cambio pendiente con texto.
- warning: «El límite crítico también bajará de X a Y», sin pintar toda la tabla.
- critical: no se introduce una clasificación nueva; respetar la proveniente del dueño si se muestra.
- guardado parcial: resumen persistente «Se guardaron X productos; quedan Y pendientes», detalle por fila y acceso a pendientes.
- no confirmado: «No se pudo confirmar el guardado» + «Comprobar estado» antes de reintentar escritura.
- éxito: actualizar datos/inbox y cerrar cuando todo esté confirmado. Fallo de recarga conserva éxitos y permite reintentar lectura.

## Interaction notes

Filas no abren ficha al tocar controles; este modal es edición. Labels accesibles incluyen nombre del producto y unidad. Header checkbox opera sobre visibles; estado indeterminado y selección oculta explícitos. Acciones en lote describen afectados antes de modificar borradores. Grupos de unidad se ofrecen cuando la selección es mixta.

Dialog por portal, focus trap, restaurar foco al disparador, focus-visible y navegación por teclado. Abrir pone foco en buscador; errores llevan foco al resumen/entrada afectada sin perder valores. Feedback de guardado anunciado mediante región accesible; errores asociados con aria-describedby/aria-invalid. No abrir overlays recortados por scroll. Motion 150–250 ms, respetar reduced motion. Bloquear edición y cierre durante guardado; confirmación de descarte aplica también a Escape/overlay. Tras parcial el texto de descarte aclara que lo ya guardado se conserva.

## Mobile / responsive

- Desktop 1440: modal de aproximadamente 1120 px máximo, márgenes al viewport, alto máximo ~90dvh; tabla de cinco columnas, referencias visibles.
- 1024: reducir anchos/espaciado manteniendo nombre y campos legibles; sin scroll horizontal de página.
- 390: Dialog de pantalla completa; encabezado y footer fijos. Filas compactas apiladas: selección/nombre/SKU, existencias y salidas en línea, mínimo con unidad. Ayuda no repetida; hits >=44 px, teclado numérico apropiado y scroll permite enfocar último input. Barra de lote puede envolver sin ocultar CTA.

## Fuera / Don’t

No nuevos colores/frameworks: ADR003, Roboto, tokens navy/naranja y pasteles semánticos existentes. Sin sidebar adicional ni shell generado del mockup. No convertir la tabla de consulta de Existencias en edición inline fuera del modal. No cambios a Flota, Andon, catálogo de alertas o modelos de dominio.

## Proof

Pendiente: no hay capturas de implementación. El PNG generado en conversación es una propuesta, no evidencia de runtime. Plan de proof-ui sin Playwright: `docs/screenshots/inventario-alertas-desktop.png`, `inventario-alertas-mobile.png`, `inventario-alertas-lote.png`, `inventario-alertas-parcial.png`, `inventario-alertas-referencia-error.png`; viewports 1440/1024/390, Supervisor y Admin. Revisión independiente ux-auditor tras implementación; mapear a AC-01–15 de la SPEC.
