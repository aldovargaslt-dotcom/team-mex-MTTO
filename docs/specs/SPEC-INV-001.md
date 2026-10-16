# SPEC-INV-001 — Flujo estándar de refacciones, inventario y costos

## Status

**Execution authorized:** user request «Now work on the respective changes and build them … push a PR to github as you finish». Covers the consolidated specs and technical contract; no deployment or external migration execution inferred.

**Proposed**, solicitado mediante «Spec it» en este chat el 2026-10-15. Documentación, sin ejecución de código, migraciones o nuevos permisos.

**Paquete consolidado después de GrillMe:** [PRD-INV-001](../prds/PRD-INV-001.md), [ADR-026 propuesto](../adr/026-inventario-costos-historicos.md) y [contrato técnico INV-001](../contracts/INV-001-costos.md). Las reglas de negocio de las tres rondas están aceptadas; estos documentos concretan el diseño técnico para revisión, no lo dan por implementado ni arquitectónicamente aprobado. Las referencias antiguas a una política técnica pendiente se desarrollan ahora en ese contrato.

**Distribución visual aceptada:** el usuario indicó «Me gusta la distribución; Spec it» después de revisar las tres propuestas de [Refacciones/ficha, Entrada y Comprobantes](../design/references/inventario-v1/README.md). La aceptación fija la composición descrita en la UX spec; no aprueba reglas financieras pendientes ni ejecución. La SPEC completa conserva Proposed por las decisiones materiales abiertas.

Decisiones explícitas del usuario: costo de almacén por **promedio ponderado móvil**; moneda **MXN**; captura a elección **con IVA incluido o sin IVA**; cálculo automático del desglose; **16% predeterminado editable**, con opción **Sin IVA**. La base neta sin IVA alimenta promedio ponderado y consulta comparable de costos.

Dos incrementos separables: **A · Flujo y UI**, con capacidades actuales; **B · Costos**, con persistencia/contrato nuevos y decisiones pendientes. Costeo está fuera del alcance v0 anterior; esta SPEC describe la ampliación solicitada, no declara capacidades desplegadas ni modifica ADRs aceptados. B no está Ready hasta resolver preguntas materiales. La aprobación futura de A no aprueba B automáticamente.

## Recomendaciones aceptadas posteriormente

El usuario indicó «Sigamos con tus recomendaciones» en este chat. Se registra la aceptación de estas direcciones, sin inventar políticas donde la recomendación solo señalaba definirlas:

- UI y flujo A: avanzar con las distribuciones aceptadas y capacidades existentes; preparar EWO-038.
- Costos: Supervisor captura/consulta; Admin consulta, valida y autoriza correcciones posteriores; registrar autor y cambios. Falta traducir esas capacidades al contrato de autorización antes de B.
- Existencias iniciales sin costo: costo pendiente; permitir apertura valorizada verificada en B, nunca cero automático ni precio de compra posterior aplicado retroactivamente.
- Permitir cierre de mantenimiento con costo/comprobante pendiente, sin introducir un bloqueo nuevo; conservar y hacer visibles los pendientes. No eliminar validaciones vigentes de cierre por esta regla financiera.
- Atribuir gasto de refacciones a la fecha del consumo confirmado en la orden; recepción para almacén no es gasto de una unidad. No equiparar fecha de pago con fecha de uso.
- Separar cantidad/costo de compras repartidas entre uso directo y recepción de almacén, evitando duplicar.
- Conservar SKU manual único; automatización de nomenclatura diferida.
- Redondeo, devoluciones, descuentos y fletes requieren regla exacta. La aceptación de «definir» no selecciona una política numérica ni de prorrateo inexistente. Se mantienen abiertos en B y no bloquean el corte UI A.

## GrillMe — primera ronda resuelta

El usuario respondió «1. Sí; 2. Sí; 3. Sí; 4. Sí» a la revisión de GrillMe en este chat (fecha de cliente 2026-10-15):

1. Varias órdenes continuables: selector explícito; una sola, acceso directo. Regla del hub detallada en SPEC-MTTO-UX-002.
2. Apertura de costos: fecha de corte, cantidad física y valor inicial validados por Admin. El promedio completo comienza desde esa apertura; consumos anteriores permanecen pendientes hasta regularización expresa, sin retropropagación automática. Movimientos posteriores se procesan desde una base consistente; corte/regularización deben coordinar concurrencia.
3. Supervisor puede completar costos inicialmente pendientes; cambiar un importe ya registrado requiere autorización de Admin. Registrar fecha de consumo, fecha de captura/corrección, actor, motivo e importe anterior/nuevo cuando corresponda. La regularización se refleja en el periodo original del consumo, identificada como actualización; no recalcula automáticamente cadenas de promedios ni sobrescribe snapshots conocidos. Correcciones que afectan valor de almacén siguen pendientes de política exacta.
4. Permitir adjuntar comprobantes después de marcarlos recibidos, con trazabilidad. Adjuntar no cambia cantidad, promedio, costo o estado documental por sí solo. Requiere cambio de contrato/backend: actualmente adjuntar se rechaza si el pendiente ya está RECIBIDA; queda fuera de EWO-038 UI-only.

Hallazgos técnicos que no son decisiones de usuario: la API de entrada actual no tiene identidad idempotente, por lo que A no promete reintento seguro ante resultado incierto. A conserva captura, bloquea envíos concurrentes y requiere comprobar una recepción cuyo resultado no se conoce antes de reenviar. La idempotencia de servidor corresponde a un corte backend explícito. AC-03 completo no se verifica solo con UI.

## GrillMe — segunda ronda resuelta

Respuestas del usuario: Q5 «Solo pondremos el total del costo»; Q6 «Sí»; Q7 «Sí».

- Captura única de **costo total de las piezas de la refacción en esa operación**, conforme al formulario revisado. El costo unitario neto se deriva de neto/cantidad, no se captura aparte. Mantener selector con/sin IVA y desglose calculado. No incorporar campos de descuento, flete ni distribución automática de gastos de documento. Si un comprobante cubre varias refacciones/destinos, registrar los totales correspondientes sin duplicar el total de factura; el sistema no adivina su reparto.
- Faltante/merma: descontar valor al promedio vigente conocido; no cargarlo automáticamente a una unidad. Si la base de costo es desconocida, no inventar importe: ajuste cuantitativo y valoración pendiente trazable.
- Sobrante físico: registrar cantidad y valoración pendiente de Admin; no tratarlo como compra gratis ni suponer un costo. El promedio completo queda condicionado a una base valorizada consistente.
- Retorno desde orden: vincular al consumo original, recuperar su costo histórico conocido y limitar cantidad a la utilizada menos devoluciones previas. Mantener movimiento de devolución/ajuste explícito sin borrar el consumo; costo desconocido conserva pendiente. Los detalles técnicos de autorización/contrato se diseñan antes de habilitarlo.
- Proveedor obligatorio para compras nuevas: entradas por compra y compras externas directas. No implica proveedor obligatorio en alta de catálogo, apertura valorizada o ajuste. Apertura/ajuste llevan motivo/evidencia propios; sin proveedor ficticio.
- Permitir recepción/consumo con comprobante pendiente, visible hasta completarlo; no nueva obligatoriedad de documento al cierre. La posibilidad de adjuntar tras RECIBIDA ya quedó aceptada en primera ronda.

## GrillMe — tercera ronda resuelta

Respuestas del usuario: Q8 «Sí» a permitir recepción sin precio conocido; Q9 «No» a necesitar devoluciones al proveedor/cambios/garantías en la primera entrega.

- Una compra puede recibirse físicamente con **costo pendiente**; proveedor sigue obligatorio. No convertir importe ausente en cero ni inventar desglose de IVA. Mientras importe/tasa/modo no estén completos, los campos calculados se muestran no disponibles o incompletos según el dato que falte.
- Si ingresa cantidad sin costo, mostrar **Costo de almacén incompleto** y no afirmar un promedio válido para todo el stock hasta regularización. Conservar costos conocidos y sus snapshots; no revalorar automáticamente órdenes anteriores. Consumos cuyo costo no se pueda determinar quedan pendientes y no bloquean mantenimiento por esa causa.
- Completado posterior: Supervisor registra costo pendiente; Admin autoriza correcciones a importes existentes. Distinguir regularización de operación sin costo de la apertura inicial; diseñar secuencia/concurrencia para obtener una base consistente sin sobrescribir snapshots históricos.
- **Fuera de la primera entrega:** flujos específicos de devolución al proveedor, cambio y garantía. Excepciones físicas mediante ajuste con motivo/revisión Admin y valoración pendiente cuando corresponda. No nota de crédito, devolución fiscal, reintegro ni compensación automática inventados.
- Se conserva dentro del alcance el retorno de piezas desde una orden al almacén acordado en Q6; no confundirlo con devolución al proveedor excluida en Q9.

## Problem

No existe un recorrido suficientemente claro entre alta de refacción, recepción física, consumo y recepción de comprobantes. Refacciones muestra simultáneamente tabla y lista móvil en la captura. La pantalla Por recibir confunde documentos con mercancía. Cantidades y trazabilidad existen, pero no costos de entrada/consumo que permitan reconstruir el gasto de refacciones por orden y unidad.

## Context

Fuentes: [discovery y decisiones del chat](../../workspace/discovery/inventario-flujo-estandar-y-costos-v1.md); capturas del usuario; inspección de código local. No se verificó la instancia desplegada.

| Fuente | Comportamiento observado |
|---|---|
| `api/src/inventario/dto/create-item.dto.ts`, `inventario.service.ts#createItem` | SKU/nombre/categoría; OEM, compatibilidad y mínimo opcionales; crear ítem inicia stock en cero |
| `entities/item.entity.ts`, `item-proveedor.entity.ts` | SKU único, unidad pieza y códigos por proveedor; sin precio |
| `dto/entrada.dto.ts`, `dto/ajuste.dto.ts` | Entrada positiva y ajuste con signo/motivo; sin importes |
| `inventario.service.ts#applyVisitaCerrada` | DESDE_STOCK descuenta; COMPRA_EXTERNA crea pendiente; no entrada de stock |
| `entities/pendiente-comprobante.entity.ts` | Ticket y estado documental; no recepción física ni importe |
| `api/src/visitas/visita-pieza.entity.ts` | Cantidad/origen e identificador de refacción; sin costo |
| `web/src/app/inventario/page.tsx`, `web/src/app/globals.css` | Dos representaciones; ocultamiento/estilos móviles anidados bajo max-width:800px |
| `InventarioNav`, páginas de Inventario, `RefaccionFicha`, `InventarioMovimientoSheet` | Superficies existentes a reutilizar |

## Goals

- Alta uniforme, búsqueda previa y reutilización de refacciones existentes.
- Distinguir registro de producto, recepción física, consumo, ajustes y documentos.
- Registrar costo de recepción y conservar costo histórico del consumo.
- Calcular IVA sin duplicarlo y con revisión antes de confirmar.
- Mejorar UI de escritorio/celular con el sistema visual vigente.
- Alimentar **Costo de refacciones** por orden/unidad con cobertura explícita, compatible con SPEC-MTTO-UX-002.

## Non-goals

Multi-almacén, lotes, FIFO, OC formal, reservas de stock en borrador, precios de venta, facturación, cálculo fiscal completo, OCR de comprobantes, conversión automática de monedas, nuevos roles, expansión de Logística/Andon/notify. Sin costo por kilómetro ni valor de adquisición. No llamar «Costo total de mantenimiento» a un importe que solo contiene refacciones. No implementación en esta entrega documental.

## Actors

`SUPERVISOR` y `ADMIN_DIRECTIVO`: conservar capacidades actuales de Inventario. Los permisos de **ver/capturar/corregir/verificar costos** requieren D-02; no derivarlos del acceso actual a cantidades. Otros roles no reciben acceso por este documento. La autorización se verifica en servidor, también para agregados y exportaciones futuras si se propusieran.

## Functional Behavior

### F-01 · Vocabulario y navegación

**Refacción**: producto/SKU. **Pieza**: unidad física actual. **Alta**: crear identidad, sin entrada. **Entrada**: recepción física que aumenta stock. **Consumo**: uso en una orden. **Comprobante recibido**: documento atendido, sin efecto de stock. **Ajuste**: corrección de cantidad con motivo.

Conservar las rutas existentes y la separación Refacciones / Existencias / Movimientos / Consumo / Catálogo. Propuesta de label **Por recibir → Comprobantes**, manteniendo `/inventario/pendientes` y enums. Categorías y Proveedores permanecen detrás de Catálogo. Los labels describen tareas, no schemas.

### F-02 · Buscar y crear refacción

Buscar antes de crear por SKU, nombre, categoría y OEM existentes; código de proveedor cuando la consulta lo soporte. Sugerir coincidencias sin fusionar automáticamente. Un proveedor adicional no implica otro SKU si corresponde al mismo producto; piezas de aplicación/presentación distintas no se fusionan por compartir nombre.

Obligatorios vigentes: SKU, nombre, categoría activa. Conservar máximos actuales 40/120 caracteres, unicidad de SKU y normalización vigente; no migrar SKUs históricos. Nombre recomendado: tipo de pieza + especificación/aplicación distintiva. Ejemplo ilustrativo: «Filtro de aceite — [aplicación]». Convención de prefijos/consecutivos, si se automatiza, requiere D-07.

Datos adicionales: OEM, compatibilidad por tipo, proveedor/código, preferido y mínimo opcional. Mantener unidad **pieza** y cantidades enteras. No ofrecer litros/metros/cajas/fracciones sin contrato de conversión. Sin compatibilidad definida, explicar que no se garantiza aparición en búsqueda compatible; no declarar que aplica a toda la flota.

Guardar alta inicia stock cero. Confirmación ofrece **Registrar entrada** como siguiente paso, conservando la refacción seleccionada. Si se creó desde una entrada, regresar a ella con selección válida y captura preservada. Fallo de entrada no vuelve a crear el producto.

### F-03 · Entrada a almacén

Seleccionar refacción → cantidad → datos de costo/compra de B → revisión → confirmar. En A se conserva el formulario actual sin inventar campos financieros funcionales.

En B, capturar cantidad y **costo total de esas piezas**, modo de IVA y tasa; proveedor obligatorio en compra nueva, referencia/documento pendientes permitidos. Derivar costo unitario neto a partir de neto/cantidad; no campo editable unitario ni selector unitario/total. No capturar/prorratear descuentos o fletes por separado. Mostrar cantidad actual, entrada y cantidad resultante; subtotal sin IVA, IVA y total de la recepción.

Cantidad y valor se confirman de forma coherente bajo concurrencia. Doble clic/reintento no duplican operación. Decisión Q8: recepción permitida sin costo; mostrarlo pendiente según D-03, no cero. No exigir importe para registrar cantidad física ni inferir impuesto sobre un importe desconocido. No modificar entrada confirmada en silencio para arreglar errores; corrección con trazabilidad según D-05.

### F-04 · Captura y cálculo de IVA

Moneda MXN. Selector obligatorio con opciones **El importe incluye IVA** / **El importe no incluye IVA**; valor inicial visual propuesto: sin selección hasta que el usuario elija, evitando interpretar erróneamente el importe. Recordar preferencia solo si se valida como decisión UX, nunca transformar capturas existentes.

Tasa predeterminada 16%, visible y editable; opción **Sin IVA**. Con tasa `r` expresada como fracción:

- Incluido: neto = importe / (1+r); IVA = importe − neto; total = importe.
- No incluido: neto = importe; IVA = neto × r; total = neto + IVA.
- Sin IVA: neto = total = importe; impuesto cero explícito. No usar Sin IVA para ocultar que se desconoce la tasa.

Cambiar modo, tasa, importe o cantidad recalcula la vista previa y conserva el importe que corresponde al modo de captura, sin doble suma. Si hay varios impuestos/tasas en el documento, no aplicar una sola tasa al total indiscriminadamente: separar líneas o requerir revisión según D-04.

Si falta desglose pero hay importe/tasa conocidos, calcular automáticamente. Si el comprobante ya contiene subtotal/IVA/total, compararlos con el cálculo y mostrar diferencias; no sobrescribirlo silenciosamente ni volver a añadir IVA. La imagen del ticket no se procesa por OCR en este alcance.

Validar formato numérico y tasa antes de guardar; importe ausente no equivale a cero, cero real requiere confirmación según política D-03. Rechazar valores negativos en compra ordinaria; devoluciones/correcciones usan la política específica. Precisión, tolerancias y límites de tasa se concretan como propuesta técnica en INV-001 sección1; aceptar ese contrato antes de implementar B.

### F-05 · Promedio ponderado móvil

Con stock previamente valorizado, cantidad `Q`, valor neto `V`, recepción `q` e importe neto de recepción `v`:

`Q nueva = Q + q`; `V nuevo = V + v`; `costo promedio = V nuevo / Q nueva`.

La base de costo excluye IVA. No mezclar monedas ni promediar tasas/precios unitarios sin ponderar cantidad. Con stock inicial cero y entrada valorizada, esa recepción establece la base inicial.

Consumo desde almacén: usar el costo promedio vigente al confirmar el consumo, conservar costo unitario/base y total histórico aplicado, y reducir cantidad/valor de forma coherente. Una recepción posterior modifica el promedio futuro, no órdenes previas. Stock cero no produce división por cero; D-04 define tratamiento de residuo de redondeo.

Stock previo sin valor conocido no se convierte en cero monetario ni entra a un promedio ficticio. Mantener cobertura desconocida hasta apertura/regularización definida en D-03.

### F-06 · Consumo desde stock en orden

Mantener selección DESDE_STOCK, compatibilidad y cantidad. El borrador no reserva ni descuenta. El cierre vuelve a verificar disponibilidad; stock insuficiente impide cierre/salida según regla vigente.

B conserva snapshot de costo en el resultado confirmado del consumo; ni la vista ni el reporte recalculan historia desde precio actual. Cantidad y costo deben corresponder a la misma operación exitosa. Si costo desconocido, aplicar D-03, sin introducir un bloqueo de mantenimiento por omisión de decisión.

### F-07 · Compra externa para una orden

Seleccionar COMPRA_EXTERNA, refacción y cantidad utilizada. B captura costo total/IVA y proveedor obligatorio; referencia/comprobante pueden quedar pendientes; vincular costo a esa orden. No cambiar existencias, promedio de almacén ni crear entrada/salida ficticias.

Compra compartida: si 3 piezas se usan directamente y 2 se reciben al almacén, cada destino registra únicamente su cantidad/costo asignado; no duplicar las 5 en ambos. Cada operación captura su total correspondiente sin duplicar el importe del documento. No hay prorrateo automático ni campos de descuento/flete. La asociación documental y validación de importes compartidos debe quedar explícita en el contrato.

### F-08 · Comprobantes

Filtros propuestos: **Pendientes / Recibidos / Todos**, Pendientes inicial. Mostrar refacción, cantidad, orden disponible, fecha, documento y en B costo/proveedor/estado de completitud. Acción **Marcar comprobante recibido**; ayuda **Esta acción no modifica existencias**.

El estado documental y el financiero son distintos: recibido sin importe no demuestra costo completo. Mantener el contrato vigente de ticket y transición PENDIENTE→RECIBIDA; no endurecer obligatoriedad de adjunto por un cambio de copy. Se acepta adjuntar posteriormente a RECIBIDA con trazabilidad; esa capacidad requiere contrato/backend y se entrega aparte del cambio de copy de A. Completar costo pendiente corresponde a Supervisor; corregir importe ya registrado exige autorización Admin según la primera ronda. Correcciones con impacto en valorización conservan D-05 pendiente.

### F-09 · Ajustes, devoluciones e inactivación

Conservar ajuste de delta no cero, motivo obligatorio y prohibición de stock negativo. UI puede ayudar con cantidad física observada y diferencia derivada, mostrando cuál se enviará antes de confirmar; no cambiar la semántica backend.

Ajustes de cantidad no son automáticamente compras ni consumos de una unidad. Se aplican las reglas aceptadas de la segunda ronda: merma al promedio conocido sin imputación automática a unidad, sobrante con valoración pendiente Admin y retorno de orden vinculado al costo histórico/cantidad original disponible. No inventar costo por nota libre ni reescribir consumo histórico. Devoluciones al proveedor, cambios y garantías quedan fuera de la primera entrega por Q9; no simularlas como flujo financiero. Mecánica de ajustes/retornos, correcciones de valor y versiones requiere contrato antes de implementación.

Inactivar desde ficha/acción secundaria conserva historia y permisos. No borrar registros con movimientos; no modificar las reglas reales de selección/disponibilidad de ítems inactivos sin una decisión aparte.

### F-10 · Consultas y UI

| Sección | Información principal |
|---|---|
| Refacciones | Nombre/SKU, categoría, estado; fila abre ficha, Nueva refacción |
| Existencias | Cantidad, mínimo, faltante/alerta confirmada, Registrar entrada |
| Movimientos | Fecha, tipo, refacción, cambio, orden, responsable/nota; detalle financiero en B |
| Consumo | Uso desde stock y compra externa por periodo; orden/unidad mediante composición autorizada; costo y cobertura en B |
| Comprobantes | Pendientes documentales, enlace a orden y revisión |
| Catálogo | Categorías y proveedores |

Ficha: identidad → cantidad/mínimo → último costo de compra y costo promedio, separados y fechados en B → compatibilidad/proveedores → movimientos. No un campo universal editable Precio que revalorice todo.

Corrección responsive: ocultar representación móvil por defecto fuera del media query; activarla y ocultar tabla en breakpoint correspondiente. Tabla y tarjetas nunca visibles/focusables a la vez. Mantener estilos móviles fuera del alcance incorrecto que deja lista sin formato en escritorio.

Distribución aceptada: Refacciones y Comprobantes presentan lista principal y ficha/detalle lateral derecho. Entrada agrupa identificación/cantidad, costo/IVA y revisión final; escritorio puede distribuir campos en filas y celular los apila conservando el mismo recorrido. La ubicación de controles y las referencias canónicas se detallan en la UX spec. No incorporar como requisitos fotografías ficticias, sombras, tipografía sobredimensionada o reglas de obligatoriedad deducidas de los mockups.

Estados por recurso: una falla de proveedores no borra lista de refacciones cargada, ni convierte fallo de stock en cero. La lista sirve para encontrar y abrir; mover Inactivar a ficha/acciones secundarias sin perder capacidad autorizada. Filtros coherentes, sin convertir navegación en botones de acción.

## Business Rules

1. Inventario sigue siendo único escritor de stock/movimientos; mantenimiento mantiene líneas de consumo.
2. Alta no aumenta cantidad. Compra externa directa y comprobante recibido no aumentan stock.
3. Borrador no reserva; cierre válido descuenta; rechazo no deja costo/salida parciales.
4. Método: promedio ponderado móvil neto en MXN; guardar costo histórico aplicado y trazabilidad de la operación.
5. Cantidades enteras en piezas; importes calculados con decimal/unidades menores y política explícita de precisión, sin acumulación binaria.
6. Neto, IVA y total son datos distintos; no sumar importe bruto y neto como dos gastos.
7. Último costo de compra no sustituye costo promedio; ninguna referencia actual revaloriza órdenes antiguas.
8. Desconocido no es cero. Informe parcial identifica costos faltantes y nunca afirma total completo.
9. Reportar **Costo de refacciones** si no incluye mano de obra/otros. Entrada a almacén no se atribuye a unidad hasta consumo correspondiente.
10. Un comprobante puede estar recibido y tener costo incompleto. Cumplimiento documental no implica validación financiera.
11. Conservar alertas opt-in y estados de stock actuales; sin mínimo no implica Normal. No mover alertas a Andon.
12. Recepciones, consumos y correcciones deben resistir concurrencia/reintento sin doble cantidad/costo; servidor calcula/valida valores, no confiar en totales del navegador.

## Domain Implications

Inventario permanece dueño de refacciones, stock, movimientos y comprobantes; no se declara nuevo bounded context. B necesita registrar importes/IVA/moneda, cobertura y costos aplicados, con API de lectura para mantenimiento. Ubicación propuesta de snapshots/ownership financiero en ADR-026: Inventario; detalle en INV-001. Requiere aceptación antes de ejecutar, respetando IDs opacos, sin JOIN/FK cruzada ni modificación silenciosa de VisitaCerrada.

## State Transitions

- Alta: no existe → registro creado con stock cero; entrada posterior es otra operación.
- Entrada: stock Q → Q+q; B valor/promedio cambian con el mismo resultado confirmado.
- Orden en borrador: captura editable sin reserva → cierre existente confirma salida/costo o falla sin efectos parciales.
- Compra externa al cierre: crea pendiente documental; stock permanece igual.
- Comprobante PENDIENTE→RECIBIDA: transición documental actual, sin efecto de cantidad.
- Estado financiero conceptual: costo desconocido/completo/por revisar; representación persistente pendiente de contrato, no nuevos enums aprobados por este texto.
- UI: loading→ready/empty/error/partial por recurso; cambiar rol/refacción invalida respuestas tardías incompatibles.

## Constraints

### Architecture

Preservar ADR-002, transacción de cierre y esquema por módulo. A no cambia API ni migraciones. B requiere ADR/contrato y migración explícita, no se diseña como parche visual. No inventar endpoints como existentes ni agregar campos financieros solo en frontend.

### Compatibility

Conservar rutas, IDs, SKUs, UOM, enums actuales y semántica de movimientos/recibida. Histórico sin costo permanece legible y con costo desconocido; no backfill a cero ni valor retroactivo por precio actual. Integración con workOrderType/legado usa adaptador vigente; CHECK no genera consumo/gasto de mantenimiento por sí solo.

### Security

Permisos actuales para cantidades; D-02 para costos. Autorizar lectura/edición y referencias a órdenes en servidor. Auditoría de correcciones con autor, momento y vínculo a operación original; sin eliminar documentos históricos silenciosamente. No copiar tickets/PII en evidencia.

### Performance

No obtener toda la flota para calcular consumo por unidad en navegador. Listados/detalles con paginación/alcance acordado; agregados de conjunto completo, no página visible. Medir con volumen representativo; no inventar SLA sin baseline.

### UX / Operational

Roboto, shadcn/Tailwind y tokens Team Mex; un CTA naranja por vista. Texto normal ≥4.5:1; controles/foco ≥3:1; móvil targets ≥44px. Neto/IVA/total visibles antes de guardar. Semántica de tipos de mantenimiento en consumidores: Preventivo #24284D y Correctivo #C45D23, sin usar naranja CTA como nueva serie.

## Failure Behavior

| Caso | Resultado requerido |
|---|---|
| SKU existente | Error de conflicto pertinente, conservar formulario y ofrecer revisar coincidencia autorizada |
| Alta correcta/entrada fallida | Mantener refacción y captura; reintentar entrada sin duplicar alta |
| Carga pendiente | Cargando… por recurso; no vacío, cero, costo sin fuente |
| Error catálogo accesorio | Conservar fuentes sanas; deshabilitar solo acción dependiente y ofrecer reintento |
| Error de guardado/cierre | Conservar captura, resultado explícito y reconciliar estado antes de repetir operación |
| Stock insuficiente/concurrencia | Rechazo sin consumo/costo parcial; mostrar cantidad confirmada disponible |
| IVA/documento discrepante | Mostrar diferencia y requerir revisión conforme a política; no corregir en silencio |
| Fuente de costo desconocida | Sin costo registrado / Costo incompleto; no $0 por defecto |
| Sin permiso | Sin importes protegidos; estado de acceso pertinente, no falso vacío |
| Orden no accesible | Conservar referencia permitida, estado específico, sin inventar enlace válido |

## Edge Cases

SKU duplicado, OEM similar con aplicación distinta, categoría inactiva, proveedor inactivo, sin compatibilidad, stock inicial sin costo, costo cero real, tasa cero/Sin IVA/desconocida, documento con varias tasas, redondeo, compra partida entre orden y almacén, cierre simultáneo, reintento tras timeout, agotamiento a cero, ajuste/devolución, corrección posterior, periodo con costos parciales e histórico legado.

## Acceptance Criteria

| ID | Dado / cuando / entonces |
|---|---|
| AC-01 | Dado producto existente, la búsqueda permite encontrarlo antes del alta; coincidencia no fusiona productos automáticamente ni crea SKU por cada proveedor. |
| AC-02 | Dada alta válida, se conserva contrato de campos/unicidad/UOM y stock cero; compatibilidad ausente no significa aplicación universal. |
| AC-03 | Dada alta seguida de entrada fallida, reintentar registra la entrada una vez y conserva el mismo producto/formulario. |
| AC-04 | Dada entrada física, cantidad aumenta una vez; B registra neto/IVA/total y valor/promedio coherentes con la misma operación. |
| AC-05 | Dado 16%, $116 incluido y $100 no incluido, ambos producen neto $100, IVA $16 y total $116; modo/tasa se conservan. |
| AC-06 | Dado cambio de modo/tasa/cantidad, vista previa recalcula; Sin IVA explícito produce impuesto cero y no representa tasa desconocida; default 16% sigue editable. |
| AC-07 | Dado documento ya desglosado, se valida y evita doble IVA; discrepancia se informa y no sobrescribe silenciosamente. |
| AC-08 | Dadas 10 piezas netas a $100 y entrada de 10 a $120, stock 20, valor $2,200 y costo promedio $110. |
| AC-09 | Dado stock del caso anterior, consumo de 3 registra costo histórico $330; stock 17, valor $1,870; compra posterior no altera esos $330. |
| AC-10 | Dado stock sin costo inicial, nueva recepción no crea promedio completo ficticio; ausencia de costo no se transforma en cero. |
| AC-11 | Dados borrador/cierre/stock insuficiente, solo cierre válido descuenta y aplica costo; no reserva ni efectos parciales por rechazo. |
| AC-12 | Dada compra externa directa, costo se vincula a orden sin aumentar/descontar stock ni modificar promedio del almacén. |
| AC-13 | Dada compra partida, cantidades/costos por destino no duplican total; aplicar únicamente después de resolver política de distribución. |
| AC-14 | Dado comprobante recibido sin costo, transición documental no modifica stock ni declara costo completo. |
| AC-15 | Dado ajuste, conserva motivo/delta y rechazo de negativo; costo sigue política D-05, sin atribución ficticia a una unidad. |
| AC-16 | Dadas consultas de gasto, solo consumo aplicable se atribuye a unidad; reportes de piezas se etiquetan Costo de refacciones y explican cobertura. |
| AC-17 | Dado escritorio/móvil, existe una sola representación visible/focusable de Refacciones, sin lista duplicada ni pérdida de acciones. |
| AC-18 | Dada navegación, Comprobantes conserva ruta y estados; CTA Marcar comprobante recibido explica que no modifica existencias. |
| AC-19 | Dados carga/error/partial/vacío, se distinguen por recurso; fallo accesorio no borra datos válidos ni muestra ceros prematuros. |
| AC-20 | Dado rol sin permiso financiero, servidor y UI no revelan importes ni aceptan cambios; permisos resueltos en D-02. |
| AC-21 | Dados reintentos/concurrencia, no duplican cantidad/valor/costo; el servidor no acepta totales manipulados por cliente. |
| AC-22 | Dada corrección/histórico, se conserva trazabilidad y snapshots; no revaloración silenciosa con último precio. |
| AC-23 | Dados 390px, teclado y zoom 200%, lectura/captura/revisión/errores son accesibles; targets ≥44px y sin scroll horizontal de página. |
| AC-24 | Dado diff ejecutado, existe proof-ui y auditoría independiente ≥8.5 por dimensión/vista afectada, sin gates fallidos; evidencias reales separadas de pruebas planeadas. |
| AC-25 | Dado ancho suficiente y detalle abierto, lista permanece a la izquierda y ficha a la derecha; si no cabe, se usa Sheet con modalidad/foco coherentes. En móvil solo aparece la superficie activa y cerrar detalle restaura contexto/foco. |
| AC-26 | Dada Entrada, identificación/cantidad preceden costo/IVA y revisión; neto, IVA, total y efecto en stock/promedio se muestran antes de confirmar, también en móvil. No hay importes calculados sobre datos desconocidos. |
| AC-27 | Dadas las referencias visuales aceptadas, implementación conserva composición y semántica, ajustando controles a tokens/patrones actuales; Activa e indicador de stock son estados distintos y no se introducen fotos ni permisos por copia del mockup. |

### Criterios añadidos tras GrillMe

| ID | Dado / cuando / entonces |
|---|---|
| AC-28 | Dado stock sin costo, apertura Admin registra fecha de corte/cantidad/valor verificados; el promedio se establece desde esa base y no regulariza consumos previos automáticamente. |
| AC-29 | Dado costo pendiente completado o registrado corregido, se aplican permisos distintos, se conserva trazabilidad y el periodo del consumo muestra regularización; ningún promedio histórico cambia silenciosamente. |
| AC-30 | Dado comprobante RECIBIDA, adjuntar documento posteriormente es posible bajo permiso y auditoría; no cambia cantidad, costo, promedio ni recepción documental. |

### Criterios añadidos tras la segunda ronda

| ID | Dado / cuando / entonces |
|---|---|
| AC-31 | Dada compra, solo se captura total por refacción/operación y modo/tasa IVA; unitario neto es derivado. No existen campos ni reparto automático de descuento/flete. |
| AC-32 | Dadas merma/sobrante/retorno de orden, se aplican reglas de costo aceptadas y trazabilidad; devolución acumulada no supera cantidad consumida y costo desconocido no se convierte en cero. |
| AC-33 | Dada compra nueva, proveedor es obligatorio; comprobante puede quedar pendiente sin bloquear recepción/consumo. Alta de catálogo, apertura y ajuste no exigen proveedor ficticio. |

### Criterios añadidos tras la tercera ronda

| ID | Dado / cuando / entonces |
|---|---|
| AC-34 | Dada compra con proveedor y costo desconocido, recepción física se registra una vez con costo pendiente; IVA/importe/promedio no se inventan ni se muestran como cero. |
| AC-35 | Dada recepción pendiente de costo, promedio global figura incompleto hasta regularización coherente; costos históricos conocidos se conservan y consumo de costo no determinable permanece pendiente sin nuevo bloqueo de cierre. |
| AC-36 | Dado alcance inicial, no hay flujo financiero de devolución a proveedor/cambio/garantía; excepciones quedan documentadas por ajuste/revisión Admin sin simular crédito o reintegro. El retorno de orden al almacén conserva su regla propia. |

## Dependencies

[UX spec](../design-system/inventario-flujo-costos-v1.md), [discovery](../../workspace/discovery/inventario-flujo-estandar-y-costos-v1.md), [SPEC-MTTO-UX-002](SPEC-MTTO-UX-002.md), [SPEC-MTTO-UX-001](SPEC-MTTO-UX-001.md), [flujo operacional actual](../design-system/ux-operacional-cortes-v0.md). Costeo requiere shaping/PRD proporcional, decisión de arquitectura/contrato y EWO aprobado antes de ejecución. No crear EWO ejecutable con decisiones materiales pendientes.

## Related ADRs

[ADR-002](../adr/002-schema-per-module.md), [ADR-003](../adr/003-shadcn-tailwind.md), [ADR-007](../adr/007-inventario-stock-bajo.md), [ADR-001](../adr/001-visita-cerrada-outbox.md). Reglas de alertas configurables actuales conservadas; no reabrir ownership por agregar precios.

## Open Questions

| ID | Decisión necesaria | Propuesta / límite hasta resolver |
|---|---|---|
| D-01 · Dirección resuelta | Capturar total por refacción/operación, derivar unitario; proveedor obligatorio en compra nueva y comprobante puede quedar pendiente. | Sin descuento/flete/prorrateo automáticos. Asociación de comprobante compartido por diseñar; sin nuevo bloqueo de cierre. |
| D-02 · Dirección aceptada | Supervisor captura/consulta; Admin consulta, valida y autoriza correcciones posteriores, con auditoría. | Implementar capacidades según contrato efectivo; detalle de autorización pendiente en B. A conserva permisos actuales. |
| D-03 · Reglas aceptadas | Apertura Admin con corte/cantidad/valor; recepción sin costo y cierre con pendientes permitidos. Promedio incompleto hasta regularizar; históricos conocidos preservados. | Procedimientos/contrato/concurrencia por diseñar; no cero ni retrovaloración automática. |
| D-04 · Diseño propuesto | Centavos enteros, half-up por operación, promedio como razón valor/cantidad y residuo al agotar saldo; tasas en puntos básicos y discrepancia de documento sin ajuste oculto. | INV-001 secciones1/4: concreto para revisión; descuentos/fletes separados excluidos. |
| D-05 · Reglas aceptadas/contrato propuesto | Merma al promedio conocido; sobrante pendiente Admin; retorno de orden al costo histórico disponible. Completar/corregir con permisos distintos. | INV-001 secciones5/6: revisión/versionado y regularización. Fecha de reporte del retorno propuesta explícitamente, pendiente de aceptación del paquete. Proveedor/cambios/garantías fuera de primera entrega. |
| D-06 · Parcialmente resuelta | Fecha del consumo confirmado para gasto por unidad; cobertura/regularización histórica pendientes. | No imputar compra de almacén directamente a unidad ni afirmar total completo con faltantes. |
| D-07 · Diferida | Conservar SKU manual único; automatización de formato pospuesta. | No migrar SKUs ni fusionar equivalentes automáticamente. |

A puede dividirse en un corte solo de UI/estados sin depender de B. B no se marca Approved/Ready con decisiones materiales abiertas. Estas preguntas no vuelven a abrir promedio ponderado, MXN o selector de IVA ya acordados.

## Traceability and impact

PRD: A mejora operación existente; B amplía producto fuera de v0 y requiere shaping/PRD proporcional antes de ejecución. Área: Inventario con seam de consumo de Mantenimiento; no se editan cards como si el futuro ya existiera.

Actual: Context. Deseado: F-01–F-10. Modelo/migración: ninguna en A; B requiere costos/IVA/moneda, cobertura y snapshots, con ubicación/versionado en contrato/ADR posterior. API: conservar A; definir contrato B, sin endpoints inventados. UI: seis secciones actuales, formularios y ficha según UX enlazada.

## Negative cases and UI states

Loading, ready, empty, error, partial, success y disabled según Failure Behavior/UX. En guardado, control ocupado y formulario conservado; éxito confirmado muestra resumen y siguiente acción; fallo de refresco no convierte escritura confirmada en fallo a repetir. Datos previos se muestran solo con aviso y sin mezclarse con otra unidad/rol/refacción/periodo.

## AC-to-test plan

| AC | Escenario / verificación planeada | Evidencia tras ejecución |
|---|---|---|
| 01–03 | Alta/duplicado y continuación con fallo de entrada; click-through y API | Pendiente |
| 04–07 | Entrada e IVA, ambos modos, tasa editable, documento con diferencia; pruebas de cálculo/contrato y UI | Pendiente |
| 08–10 | Promedio, snapshot, nueva recepción y stock inicial desconocido; pruebas unitarias y transaccionales | Pendiente |
| 11–15 | Cierre, insuficiencia, externa, documento y ajuste; regresiones C/O/I más casos nuevos autorizados | Pendiente |
| 16 | Agregados de conjunto completo con cobertura y paginación | Pendiente |
| 17–19 | Breakpoints 767/768/800/801, desktop/móvil y fallos por recurso | Pendiente |
| 20–22 | Acceso, integridad, concurrencia, reintento y corrección | Pendiente |
| 23–24 | Teclado/zoom/contraste, proof-ui y ux-auditor independiente | Pendiente |
| 25–27 | Lista/ficha, selección/restauración y revisión de entrada contra las referencias aceptadas en desktop/móvil | Pendiente |
| 28–30 | Apertura/corte, regularización con permisos y adjunto posterior a RECIBIDA; contrato/API y UI | Pendiente |
| 31–33 | Total único/IVA, proveedor obligatorio y merma/sobrante/retornos con límites de cantidad y costo | Pendiente |
| 34–36 | Recepción sin costo, promedio incompleto, preservación histórica y exclusiones de primera entrega | Pendiente |

Casos numéricos documentales se verifican con aritmética decimal/entera, sin sustituir pruebas de implementación. No se ejecutaron pruebas de producto por una entrega documental. Los nombres de tests/contratos se concretan en el EWO de cada incremento; no confundir casos planeados con PASS.

## Risks and assumptions

Costos promedio requieren stock previo valorizado y precisión acordada. Documentos tardíos, compras partidas y correcciones pueden modificar reportes; el modelo debe conservar qué se conocía y qué se corrigió. Unidad física actual fija limita packs/fracciones. Identidad de actor y permisos son los del servidor efectivo, no labels del screenshot. Una suma de importes conocidos con costos faltantes no es total completo. El diseño de costos de unidad contiene cifras ilustrativas corregidas en SPEC-MTTO-UX-002; no copiar esas imágenes como datos.
