# UX spec — Inventario estándar y costo por refacción

Estado **Proposed**. Canónico funcional y criterios: [SPEC-INV-001](../specs/SPEC-INV-001.md). A: UI/flujo actual. B: costo/IVA, condicionado a contrato y decisiones pendientes. Sin implementación por este documento.

**Composición visual aceptada por el usuario**, 2026-10-15: «Me gusta la distribución; Spec it». Referencias en [Inventario v1](../design/references/inventario-v1/README.md). Se aprueba la dirección de layout de estas superficies; no se declara ejecutable el incremento de costos ni aprobadas las preguntas abiertas de la SPEC.

## Distribución aceptada por superficie

### Refacciones y ficha lateral

- Shell y navegación actuales arriba; título, ayuda y Nueva refacción en encabezado.
- Debajo, búsqueda y filtros de estado/categoría. Lista es la superficie principal; no se añade un segundo listado móvil en escritorio.
- Con ficha abierta en escritorio amplio: lista a la izquierda, detalle al borde derecho, proporción orientativa 65/35. Mantener ancho legible; si no cabe, reutilizar Sheet superpuesto en vez de comprimir columnas. No convertir esto en un split-pane global nuevo para todos los módulos.
- Fila seleccionada con fondo/borde discreto y nombre accesible. Columnas Refacción, Categoría, Existencias y Estado. **Bajo** junto a cantidad; **Activa/Inactiva** en Estado, nunca como sustitutos entre sí.
- Ficha: título/cierre → nombre/SKU/OEM y estado → existencias/mínimo → Registrar entrada y Ajustar existencias → costos → compatibilidad/proveedores/movimientos → edición/acciones secundarias.
- En la referencia, Nueva refacción es primario y Registrar entrada outline. Si el Sheet captura foco o se abre sobre el listado, el fondo queda inerte y la acción primaria corresponde solo a la superficie activa; no dejar una lista aparentemente interactiva detrás de un modal. Fijar una sola modalidad coherente usando las primitivas existentes.

### Registrar entrada: escritorio y celular

- Tres bloques en orden: **Refacción y recepción**, **Costo de la recepción · MXN**, **Revisar antes de confirmar**.
- Refacción seleccionada; cantidad y proveedor obligatorio en compra nueva; apertura/ajuste conservan motivo propio. En escritorio, cantidad/proveedor pueden compartir fila; en móvil una columna.
- Captura base del mockup: **Importe total de las piezas recibidas**, con ayuda que evita confundirlo con unitario. Decisión posterior del usuario: solo costo total. No modo de captura unitario, ni campos de descuento/flete; unitario neto derivado para consulta/promedio.
- Selector con/sin IVA junto al importe; tasa editable y opción Sin IVA debajo; referencia de documento según política pendiente. El label opcional del mockup no decide obligatoriedad.
- Revisión: subtotal sin IVA, IVA, total, cantidad actual/resultante y nuevo promedio únicamente si la base es conocida. Costos anteriores/de entrada son apoyo secundario, sin competir con total.
- Cancelar a la izquierda y Confirmar entrada a la derecha en escritorio; móvil conserva acceso cómodo y contenido previo revisable sin overlay que lo tape. La ilustración de dos tamaños no son dos formularios simultáneos.
- Reutilizar InventarioMovimientoSheet con espacio suficiente y superficie de altura completa cuando el viewport lo requiera. La captura no autoriza nueva ruta ni un diálogo dentro de otro. Formulario y revisión pertenecen al mismo flujo.

### Comprobantes y detalle lateral

- Título/ayuda, aviso Esta acción no modifica existencias, búsqueda y filtros Pendientes/Recibidos/Todos.
- Lista a la izquierda y detalle a la derecha cuando cabe; el modo de apertura/cierre sigue la misma regla de Refacciones.
- Columnas **Refacción · Orden · Documento · Costo**. Documento Pendiente/Recibido y Costo Registrado/Sin registrar independientes. La imagen usa Todos para explicar ambos; apertura normal sigue Pendientes, como define la SPEC.
- Detalle: refacción/cantidad → orden y proveedor disponibles → subtotal/IVA/total registrados → comprobante → explicación de compra externa sin entrada → Marcar comprobante recibido y Cerrar.
- Adjunto, recepción documental y validación financiera no se presentan como una sola casilla de cumplimiento. No mostrar total completo cuando falta importe.

### Datos de referencia y diferencias admisibles

La composición es canónica junto a las reglas de este documento. Miniaturas de productos son ilustrativas y se omiten si no existe dato real; no se agrega soporte de fotos. Usar Roboto/escala y tokens vigentes, no gradientes, sombras o tamaños exactos del raster. Permisos y estados reales prevalecen sobre acciones mostradas para explicar un recorrido.

Ejemplo reconciliado: 10 piezas previas a $100 netos; entrada 10 por $1,392 con IVA 16%; neto $1,200, impuesto $192, stock final 20, promedio $110 netos. Compra externa ilustrativa: 3×$120 netos = $360; IVA $57.60; total $417.60. No se escriben estos datos como registros de producción.

## Dirección financiera aceptada

Supervisor captura/consulta, Admin valida y autoriza correcciones posteriores con trazabilidad; contrato de permisos B pendiente. Mostrar costo pendiente para existencias sin valor inicial y permitir cierre con pendientes de costo/comprobante, conservando reglas vigentes de mantenimiento. Fecha de gasto por unidad: consumo confirmado. Mantener SKU manual. Captura de solo total, sin descuento/flete separados. Merma al promedio conocido, sobrante pendiente Admin y retorno vinculado al consumo/costo histórico aceptados. Precisión/redondeo y contrato de correcciones siguen como diseño técnico de B y no bloquean UI A.

## GrillMe — decisiones aceptadas

Apertura de costos Admin con fecha de corte, cantidad física y valor; no retrovaloración automática de consumos anteriores. Supervisor completa costo pendiente; corrección de registrado requiere Admin, con trazabilidad y regularización en periodo original. Se permite adjuntar documento después de recibido; requiere backend separado y no está habilitado por el corte UI A.

Reintento de entrada tras timeout: A no puede garantizar idempotencia con API actual. Conservar captura y explicar resultado incierto; nunca reenviar automáticamente. Sheet superpuesto cuando no cabe lista/ficha es adaptación válida, sin exigir split-pane a todo escritorio.

## GrillMe — segunda ronda

Solo total por refacción/operación y selección de IVA; sin campos ni reparto automático de descuento/flete. Proveedor obligatorio en compras nuevas; documento puede quedar pendiente y completarse después. Aperturas/ajustes no llevan proveedor ficticio. Merma al promedio conocido, sobrante pendiente Admin y retorno al costo histórico con vínculo/límite de cantidad. Ver AC-31–33. La obligatoriedad financiera pertenece a B, no se aplica en el formulario vigente A sin backend.

## GrillMe — tercera ronda

Recepción sin precio permitida: ofrecer estado explícito **Costo pendiente** y no exigir el importe para registrar cantidades, manteniendo proveedor obligatorio en compra nueva. Al faltar costo, neto/IVA/total y nuevo promedio no muestran ceros ficticios. Mostrar **Costo de almacén incompleto** hasta regularización; conservar snapshots históricos conocidos.

No habilitar formularios de devolución al proveedor/cambio/garantía en la primera entrega. Excepciones por ajuste con motivo/revisión Admin y valoración pendiente si corresponde; no simular crédito o reintegro. Retorno desde orden al almacén sigue siendo caso distinto con vínculo a consumo original.

## Contrato financiero consolidado

[INV-001 técnico](../contracts/INV-001-costos.md) especifica importes en centavos, IVA y redondeo, operación idempotente, permisos y cobertura. Diseño Proposed: UI muestra preview, servidor autoritativo confirma. Mantener operación/clave tras timeout; nunca repetir con clave nueva automáticamente. Base incompleta muestra pendientes sin inventar promedio. Campos de fecha de consumo, captura/revisión y motivo son distintos en trazabilidad. Las cifras del preview no afirman que el guardado terminó. Adjuntos tras RECIBIDA y comandos financieros solo se habilitan con backend y permisos entregados.

## Screen purpose

Dar de alta sin duplicar, recibir piezas, consumirlas y resolver documentos con trazabilidad de cantidad y costo.

## Primary user

Supervisor y Admin en escritorio y celular, según autorización actual. Acceso financiero pendiente D-02, sin otorgarlo por reutilizar un formulario.

## Questions the screen must answer

1. ¿Qué estoy viendo? Refacción/SKU, operación, unidad de medida y origen.
2. ¿Hay algo mal? Falta de stock, documento, dato o costo; error distinto de ausencia.
3. ¿Debo actuar? Alta, entrada, revisión de documento o ajuste pertinente.
4. ¿Cuál es el estado ahora? Existencia confirmada y costo correctamente nombrado/fechado.
5. ¿Qué apoyo hay? Compatibilidad, proveedor, movimientos y referencia de orden autorizada.

## Primary action

| Contexto | Label |
|---|---|
| Refacciones | Nueva refacción |
| Alta | Guardar refacción |
| Existencias / ficha pertinente | Registrar entrada |
| Entrada en revisión | Confirmar entrada |
| Ajuste en revisión | Confirmar ajuste |
| Comprobante pendiente | Marcar comprobante recibido |
| Movimientos / Consumo | Sin CTA naranja obligatorio; filtros y filas abren detalle |

Un primario por contexto; no encabezado y footer duplicados en el mismo viewport. En alta completada se ofrece Registrar entrada como siguiente acción, sin simular entrada automática.

## Secondary actions

Cancelar/Volver, Editar, Ajustar existencias, Adjuntar comprobante, Ver orden, Quitar filtros. Inactivar en ficha/acciones secundarias, no botón rojo repetido dominante por fila. Labels y variantes existentes; confirmar impacto cuando corresponda sin crear un paso de permiso ajeno al flujo.

## Information hierarchy

P0: objeto y tarea; problema que impide continuar. P1: acción y datos necesarios. P2: cantidad/costo con semántica, filtros y resumen de revisión. P3: identificadores, fechas, notas y trazabilidad.

Refacciones identifica; Existencias responde cuánto hay; Movimientos reconstruye cambios; Consumo muestra uso; Comprobantes atiende documentos; Catálogo organiza categorías/proveedores. Sin dashboard o indicadores decorativos nuevos. No total financiero cuando fuente incompleta.

## Pattern

Listado denso + filtro (3), ficha/sheet de refacción existente, formulario corto (7). Si entrada con costos necesita más espacio, usar el sheet existente con secciones y revisión dentro de la misma superficie, no modal dentro de modal. Datos de alta opcionales pueden agruparse; no un wizard largo para tres campos obligatorios.

## Clone

Rutas `/inventario`, `/inventario/stock`, `/inventario/movimientos`, `/inventario/pendientes`; componentes `RefaccionFicha`, `InventarioMovimientoSheet`, `DataTable`, `PageHeader`, `Field`, `FormAlert`, `Button`. Clonar primitivas y shell, corrigiendo responsive defectuoso. Categorías/Proveedores detrás de Catálogo. Conservar rutas al renombrar Por recibir a Comprobantes.

## Formularios propuestos

**Alta:** Buscar coincidencias → SKU/nombre/categoría → OEM/compatibilidad/proveedor/mínimo según pertinencia → guardar. Mostrar unidad pieza y ayuda. No campo Stock inicial que salte la entrada. Al regresar de alta a entrada, conservar selección/captura.

**Entrada B:** Refacción → cantidad → origen/proveedor/referencia según contrato → costo total de las piezas de esa refacción (unitario derivado) → selector con/sin IVA → tasa visible 16% editable/Sin IVA → resumen → Confirmar entrada.

Resumen: Cantidad actual + Entrada = Cantidad resultante; Subtotal sin IVA + IVA = Total. Costo promedio resultante solo si base conocida; de otro modo Costo de almacén incompleto. No mostrar un cálculo aparentemente válido usando stock desconocido.

**Captura IVA:** opciones completas El importe incluye IVA / El importe no incluye IVA; evitar un switch ambiguo «IVA». Cantidad/importe/tasa recalculan vista previa. Distinguir Sin IVA de no saber la tasa. Documento con desglose: comparar; diferencias se señalan junto al campo con recuperación, no toast genérico.

**Ficha:** nombre/SKU/categoría → cantidad y mínimo → en B Último costo de compra y Costo promedio de almacén con fecha/fuente → compatibilidad/proveedores → movimientos. No un campo genérico Precio editable que revalorice consumos.

**Comprobantes:** filtros Pendientes/Recibidos/Todos; distinguir adjunto y costo completo. Ayuda permanente: Esta acción no modifica existencias. Mantener flujo de ticket actual, sin inferir nueva obligatoriedad de adjunto.

## States

- loading: Cargando refacciones… / Cargando existencias… / Cargando comprobantes…; solo recurso pendiente.
- empty global confirmado: Aún no hay refacciones. Acción Nueva refacción.
- empty filtros: No hay resultados con estos filtros. Acción Quitar filtros.
- error: No se pudieron cargar [recurso]. Reintentar sin borrar fuentes sanas.
- partial: Datos incompletos; señalar qué falta; costos/totales no afirmados.
- normal: dato confirmado; Sin mínimo configurado cuando corresponda, sin insinuar Normal.
- warning: Bajo según contrato, Costo sin registrar o diferencia con documento.
- critical: Agotado cuando fuente/reglas vigentes lo indiquen; rechazo de consumo insuficiente explicado sin teñir toda la página.
- saving/disabled: Confirmando… y prevención de doble envío; conservar formulario; cancelar/navegar conforme al patrón existente.
- success: entrada o alta confirmada, resumen y acción siguiente. Si falla refresco posterior no ofrecer repetir escritura ya confirmada.

## Interaction notes

Fila abre ficha; acciones internas no disparan navegación por propagación. Tabla/lista no se renderizan visualmente a la vez ni duplican foco. Filtros coherentes; búsqueda se conserva al volver de ficha cuando sea posible mediante estado/ruta existente.

Sheet por portal, foco al abrir, restauración al cerrar, Escape y controles accesibles según patrón. Edición conserva datos ante error. Cambiar refacción/rol descarta respuestas tardías y evita aplicar costo anterior al nuevo contexto.

Un CTA naranja por vista; filtros con ListFilter, no naranja de acción. Roboto y tokens actuales: navy #24284D, CTA #EA7515 con texto navy, superficies actuales. Sin framework nuevo, gradientes, iconos por cada cifra o cards duplicadas.

## Mobile / responsive

- **1440:** listado denso, solo tabla; ficha/sheet con lectura cómoda.
- **1024:** reducir columnas accesorias y permitir detalle de nota/costo; no repetir lista móvil debajo.
- **767/768/800/801:** comprobar explícitamente exclusión mutua de representaciones y que las reglas base no queden dentro de un media query incorrecto.
- **390 y 360:** tarjetas con nombre, SKU, cantidad/estado y acceso a ficha; controles ≥44px. Formularios una columna y desglose neto/IVA/total completo antes de confirmar.
- Zoom 200% y teclado: reflow sin perder valores/botones. Solo la región de una tabla justificada puede desplazarse horizontalmente, no toda la página.

## Fuera / Don’t

No sumar compras externas a stock, recibir comprobante como mercancía, reservar en borrador, mostrar sin costo como $0, valuar historia con último precio ni atribuir entradas/mermas a unidad sin consumo. No renombrar schema/API por copy. No nuevos roles, lotes, fracciones, ERP, OCR, Flota/Andon/notify. B no se simula con datos reales aparentes mientras el contrato falta.

## Proof

Entrar por `/`, rol, Inventario → buscar → alta → primera entrada → ficha/movimiento. Otro recorrido: orden con stock y compra externa → cierre autorizado → Consumo/Comprobantes → Ver orden. Usar registros de prueba identificados y revisar cantidad/costo persistidos, no solo mensaje de éxito.

Capturas futuras en `docs/screenshots/`: `inv_v1_{refacciones|alta|entrada|ficha|existencias|movimientos|consumo|comprobantes}_{d1440|m390}.png`; añadir errores/costos incompletos y pares IVA incluido/no incluido. Proof-ui sin Playwright y sin DevTools visibles.

Auditoría independiente ux-auditor: jerarquía, legibilidad/contraste, fidelidad de datos, acciones, consistencia y responsive/accesibilidad; cada dimensión/vista afectada ≥8.5/10, sin P0/P1 ni gates fallidos de VISUAL_QA. Corregir→recapturar→reauditar. Capturas de diseño y cálculos documentales no prueban UI funcional ni autorizan autoaprobar un 10.
