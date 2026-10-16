# Inventario: flujo estándar, UX y costo por refacción

Estado: propuesta de discovery/shaping, 2026-10-15. Solicitada por el usuario para sintetizar el flujo completo y preparar costo por refacción. No es SPEC/EWO aprobado ni implementación.

Especificación derivada solicitada posteriormente: [SPEC-INV-001](../../docs/specs/SPEC-INV-001.md) y [UX de Inventario](../../docs/design-system/inventario-flujo-costos-v1.md), ambas Proposed. Este discovery conserva contexto; los AC canónicos se encuentran en la SPEC.

## Acuerdos posteriores de GrillMe

Las respuestas posteriores del usuario están consolidadas en SPEC-INV-001, rondas primera/segunda. Prevalecen frente a preguntas históricas de este discovery: solo captura de total (unitario derivado), sin descuento/flete separados, proveedor obligatorio en compras nuevas y comprobante pendiente permitido; apertura Admin con corte y regularización explícita; completar pendiente vs corregir registrado; adjunto posterior; merma al promedio/sobrante pendiente/retorno al costo de consumo. Recepción sin costo permitida con promedio incompleto hasta regularización; devolución a proveedor/cambios/garantías fuera de primera entrega. Retorno de orden al almacén sigue siendo caso distinto. No se implementó runtime.

## Objetivo

Registrar una refacción una sola vez, controlar sus entradas y consumos, y conocer el costo histórico de lo utilizado por orden y unidad. Conservar consistencia de cantidades, costos y comprobantes sin convertir Inventario en un ERP.

## Evidencia actual

- `CreateItemDto` y `createItem`: SKU, nombre, categoría, OEM opcional, compatibilidad por tipos y mínimo opcional. Crear refacción crea stock en cero; no equivale a una entrada. Unidad actual fija: pieza; cantidades enteras.
- SKU único en `Item`, máximo 40 caracteres. Nombre máximo 120; OEM máximo 80. No hay convención de nomenclatura de negocio impuesta por esa validación.
- `EntradaDto`: refacción, cantidad positiva y nota; sin precio ni proveedor por entrada.
- `AjusteDto`: diferencia con signo no cero y nota obligatoria. Stock no puede quedar negativo.
- Cierre de visita: DESDE_STOCK genera SALIDA_OT; stock insuficiente impide cierre/consumo. COMPRA_EXTERNA crea pendiente de comprobante y no afecta stock.
- `PendienteComprobante`: cantidad, visita, ticket y PENDIENTE/RECIBIDA; recibido se refiere al comprobante, no a entrega física de mercancía.
- Vínculo refacción/proveedor: código del proveedor y preferencia; no importes.
- Controller Inventario permite Supervisor y Admin en sus operaciones actuales. Esto no decide los permisos futuros de costos.
- No se verificó despliegue; análisis de capturas del usuario y código local.

## Lenguaje propuesto

| Término | Significado operativo |
|---|---|
| Refacción | Registro de un producto identificado por SKU |
| Pieza | Unidad física contabilizada; hoy unidad de medida soportada |
| Categoría | Agrupación de refacciones; persistencia existente Familia |
| Alta de refacción | Crear identidad y características; no recibir stock |
| Entrada a almacén | Aumentar cantidad mediante recepción física registrada |
| Consumo de almacén | Uso en orden que descuenta existencias al cierre vigente |
| Compra externa para orden | Piezas compradas para utilizar directamente en esa orden; no ingresan al almacén |
| Comprobante recibido | Documento atendido; no entrada de piezas |
| Ajuste | Corrección de cantidad física con motivo, no sustituto de entrada o consumo |
| Costo de entrada | Importe de adquisición de esa recepción |
| Costo de consumo | Importe histórico atribuido a las piezas utilizadas |

Estos términos aclaran la propuesta; no se alteran enums, rutas, glosario ni cards de dominio hasta resolver decisiones.

## Flujo estándar recomendado

### 1. Buscar antes de dar de alta

Buscar SKU, nombre, OEM y código de proveedor cuando esté disponible. Ante coincidencias, abrir ficha y reutilizar. Mismo nombre no garantiza mismo producto; compatibilidad, número de parte y presentación importan. No fusionar automáticamente supuestos equivalentes.

### 2. Crear refacción

Obligatorios actuales: SKU, nombre y categoría activa. Recomendación de estándar visible: nombre «tipo de pieza + aplicación/especificación que la distingue»; ejemplo «Filtro de aceite — [aplicación]». SKU interno consistente y estable; proponer prefijo por categoría + descriptor + consecutivo, sin imponer renombrado de SKUs existentes. Confirmar nomenclatura antes de automatizarla.

Complementarios: OEM/número de parte, compatibilidad por tipo de unidad, proveedor/código y mínimo de stock. Compatibilidad no es un requisito actual de alta, pero sí afecta la búsqueda compatible en la orden; informar si queda sin definir. No mezclar categoría con marca o tipo de unidad.

Mantener pieza como unidad actual. Si se requieren litros, metros, kits, paquetes o fracciones, definir conversión y stock antes de habilitarlos. No recibir una caja como si fuera una pieza sin regla explícita.

Resultado: ficha creada, stock cero, confirmación y siguiente acción **Registrar entrada**. Si el alta se realiza desde una entrada, volver al formulario con la refacción seleccionada. Alta y entrada mantienen resultados separados: si falla la entrada, no duplicar el alta al reintentar.

### 3. Recibir piezas al almacén

Refacción seleccionada → cantidad recibida → costo total con/sin IVA → proveedor obligatorio en compra nueva; comprobante puede quedar pendiente → revisar total → confirmar.

Mostrar «Existencias actuales», «Entrada» y «Existencias después de registrar». La entrada actual existe; costo, proveedor/documento por entrada y revisión financiera son ampliaciones propuestas. Prevenir doble envío y usar identidad de operación cuando se implemente. Registrar quién/cuándo; correcciones trazables, sin sobrescribir movimientos históricos silenciosamente.

### 4. Consumir desde almacén

En la orden elegir DESDE_STOCK → refacción compatible → cantidad → revisar disponibilidad. El borrador no reserva ni consume stock. Al cierre vigente, validar cantidad y descontar transaccionalmente; otra orden puede haber usado stock mientras el borrador estaba abierto.

Propuesta de costeo: guardar costo histórico en el consumo en el mismo resultado confirmado; después sumar por orden/unidad. No calcular una orden antigua con el precio actual de catálogo. Un costo faltante no es cero ni debe introducir un nuevo bloqueo de cierre sin decisión explícita.

### 5. Compra externa para uso directo

En la orden elegir COMPRA_EXTERNA → refacción → cantidad → registrar costo/proveedor/comprobante cuando estén disponibles y lo permita la política. Mantener el vínculo con la orden. No entrada ni salida ficticia de almacén por esas piezas.

Si se compran 5 y solo 3 se usan directamente, las 3 consumidas pertenecen a la orden y las 2 físicamente recibidas deben registrarse por el flujo de almacén. No contabilizar las mismas 5 en ambos flujos. La asociación de un mismo documento a líneas partidas queda por especificar; no está implementada por esta propuesta.

### 6. Atender comprobantes

Pendiente → adjuntar/revisar documento → registrar/verificar importes cuando exista el contrato → marcar comprobante recibido. Mantener separados «documento recibido» y «costo completo/verificado»; uno no prueba el otro. No reinterpretar RECIBIDA como recepción de mercancía.

Propuesta UI: **Comprobantes**, con filtros Pendientes/Recibidos/Todos. Acción **Marcar comprobante recibido**. Ayuda: «Compras externas utilizadas en órdenes. Esta acción no modifica existencias». Renombra labels, no endpoints o estados.

### 7. Ajustes y excepciones

Desde ficha/existencias → cantidad física observada o delta claramente explicado → motivo → revisar diferencia y confirmar. Conservar delta backend y la prohibición de stock negativo.

Cantidad física, merma, devolución, intercambio, garantía y error de registro requieren distinguirse antes de asignar costo. No convertir una merma en gasto de una unidad sin orden. Una devolución de almacén no es una nueva compra. Definir política de devoluciones y ajustes antes de habilitar costeo completo; no inventar reversos financieros desde notas libres.

### 8. Consultar y reponer

Existencias responde cuánto hay y qué requiere reposición. Movimientos reconstruye entradas/salidas/ajustes. Consumo responde qué se utilizó, en qué orden/unidad y cuánto costó cuando se conozca. No sumar entradas y ajustes como si fueran consumo de mantenimiento.

Conservar alertas opt-in y reglas actuales: sin mínimo no se afirma stock saludable; stock cero sin alerta configurada no dispara una nueva política por diseño. Las alertas siguen en Notifications, no Andon.

## Costo por refacción: conceptos separados

| Valor | Fuente propuesta | Uso |
|---|---|---|
| Último costo de compra | Recepción/compra conocida, con fecha y proveedor | Consulta de referencia; no revaloriza consumos anteriores |
| Costo de almacén | Método aprobado sobre recepciones/ajustes valorizados | Atribuir costo al consumo desde stock |
| Costo de consumo histórico | Snapshot del costo aplicado a cantidad consumida | Orden, unidad, periodos y gráficas |
| Costo de compra externa | Importe asignado a piezas utilizadas directamente en orden | Orden y unidad, sin afectar stock |

No colocar un único campo editable «Precio» en el catálogo como fuente universal: confundiría referencia de compra, valoración y gasto histórico. La ficha puede mostrar último costo y costo de almacén, ambos con su nombre y fecha.

### Método elegido: promedio ponderado móvil

Promedio ponderado móvil para stock con valores conocidos: (valor previo + importe nueva recepción) / (cantidad previa + cantidad recibida). Ejemplo: 10 piezas a $100 + 10 a $120 → 20 piezas, costo promedio $110. Consumo de 3 → $330 históricos. Frente a última compra ($120), evita que la recepción nueva atribuya $360 a esas mismas 3 piezas por un simple cambio de precio.

Decisión explícita del usuario en este chat, 2026-10-15: «Promedio ponderado (recomendado)». Se adopta como dirección para la futura especificación de costos de almacén. No es aprobación de implementación ni resuelve stock inicial, impuestos, correcciones o permisos. Último costo de compra queda como dato de referencia, no método de valoración. No se introduce FIFO ni gestión por lotes.

### Moneda y captura de IVA acordadas

Moneda: MXN, confirmada por el usuario. La instrucción posterior permite escoger **El importe incluye IVA** o **El importe no incluye IVA** en cada captura. Esta opción sustituye una captura exclusivamente sin IVA; se mantiene una base neta homogénea para promedio ponderado y costo de consumo. Registrar modo elegido, tasa, subtotal sin IVA, IVA y total, sin sumar el impuesto dos veces.

- Incluye IVA: subtotal = importe capturado / (1 + tasa); IVA = importe capturado - subtotal; total = importe capturado.
- No incluye IVA: subtotal = importe capturado; IVA = subtotal × tasa; total = subtotal + IVA.
- Si falta el desglose y la tasa es conocida, calcular automáticamente y mostrar los tres valores antes de guardar. No extraer o asumir una tasa solo porque el comprobante tiene un total.
- Si el documento ya tiene IVA desglosado, validar consistencia con la tasa/base y redondeo; una diferencia requiere revisión, sin reemplazar silenciosamente el comprobante ni volver a añadir IVA.
- Desglose de ejemplo al 16% (tasa predeterminada confirmada por el usuario): $116 incluido → subtotal $100, IVA $16, total $116; $100 sin IVA → subtotal $100, IVA $16, total $116. Ambas capturas aportan $100 netos al promedio.
- Tasa por defecto: **16%, editable**, con opción **Sin IVA**, elegida por el usuario en este chat. Mostrar la tasa antes de confirmar y recalcular el desglose al cambiar tasa o modo de captura. Sin IVA no equivale a tasa desconocida; tasa cero y exento requieren tratamiento explícito si se incorporan.
- Definir precisión y asignación de redondeo por línea/documento antes de implementar; totales deben reconciliar sin error binario. Compras con varias tasas necesitan desglose por línea o validación específica.

### Reglas que necesitan definición

- Manejo de excepciones fiscales, descuentos, flete y redondeo; tasa predeterminada 16% editable ya acordada. Moneda MXN y captura con/sin IVA ya acordadas; importes por línea no se infieren de la imagen del ticket.
- Costo de stock inicial: captura de apertura verificada o desconocido. No inventar promedio mezclando existencias sin costo con entradas valorizadas.
- Permisos de capturar, ver, corregir y validar importes; roles actuales de inventario no resuelven automáticamente esos permisos.
- Momento de reconocimiento para reporte: recepción, uso/cierre u otro. Comprar piezas para almacén no es por sí mismo gasto de mantenimiento de una unidad.
- Fuente/cobertura de datos históricos. Registros sin costo deben identificarse y no contaminar un «total» con ceros ficticios.
- Tratamiento de devoluciones, ajustes positivos/negativos, errores y cambios posteriores al cierre. Mantener trazabilidad y política explícita, no recalcular historia silenciosamente.
- Costos incompletos al cierre: decidir si se permite completar después con auditoría; no endurecer cierre de mantenimiento por defecto.
- Cantidad y costo deben confirmarse con concurrencia controlada; operación reintentada no duplica stock ni valor.

## UI: función de cada sección

Conservar rutas/secciones para una primera iteración. Renombrar Catálogo a **Configuración de inventario** es opcional y no necesario para resolver el flujo; por ahora conservar Categorías y Proveedores detrás de Catálogo. El cambio necesario propuesto es Por recibir → Comprobantes.

| Vista | Trabajo principal | Acción / información |
|---|---|---|
| Refacciones | Encontrar y mantener identidad | Nueva refacción; nombre/SKU, categoría, estado; fila abre ficha |
| Existencias | Saber cuánto hay y reponer | Registrar entrada; cantidad, mínimo, faltante y estado explícito |
| Movimientos | Reconstruir qué cambió | Fecha/tipo/refacción/cantidad/referencia/responsable; detalle con costo cuando aplique |
| Consumo | Entender qué se usó | Periodo/origen/orden/unidad; cantidades y costos con cobertura identificada |
| Comprobantes | Resolver documentación de compra externa | Pendientes por defecto; documento, orden, proveedor e importes si existen |
| Catálogo | Mantener listas base | Categorías y proveedores; sin competir con operación diaria |

Ficha de refacción propuesta: identidad y especificación → stock/mínimo → costos identificados y fechados → compatibilidad/proveedores → movimientos. Una acción principal pertinente, por ejemplo Registrar entrada; ajuste e inactivación secundarios.

## Hallazgos de UI y prioridades

1. **Alta prioridad — render duplicado de Refacciones.** En la captura aparecen tabla y lista móvil a la vez. Código: reglas `.inventario-refacciones-mobile` y estilos de tarjetas están dentro de `@media(max-width:800px)` en globals.css, alrededor de 3655–3737. El ocultamiento base no se aplica en escritorio. Corrección propuesta: ocultar móvil por defecto fuera del media query y activarlo solo en su breakpoint; tabla inversa. Comprobar ancho 767/768/800/801, escritorio y navegación accesible. No se aplicó aún.
2. **Alta prioridad — Por recibir confunde documento con mercancía.** Cambiar copy a Comprobantes y aclarar efecto, conservando rutas/estados. La captura dice «sin entrar al almacén» aunque cerrar documento no aumenta existencias.
3. **Alta prioridad — estados de carga y error.** Refacciones inicializa lista vacía y carga catálogo, categorías, tipos y proveedores en Promise.all. Puede mostrar ausencia antes de confirmar carga o impedir lectura por fallo accesorio. Cargar cada recurso con estado propio; no convertir desconocido en vacío/stock cero.
4. **Media — inactivación domina cada fila.** Mover a ficha/acciones secundarias, con contexto de impacto. La lista sirve para buscar y abrir, no para repetir destructivas; conservar permisos y acceso.
5. **Media — navegación y términos.** Explicar Refacciones vs Existencias y Comprobantes; mismo patrón de búsqueda/filtros/periodo, sin reestructurar todo antes de probar tareas.
6. **Media — consumo mezcla hechos distintos.** Destacar uso desde almacén y compra externa como consumos; entradas/ajustes como contexto separado. Costos futuros tienen fuente, periodo y cobertura comunes.
7. **Media — vacíos y placeholders.** «Sin mínimo configurado» es diferente de «Normal». Un guion no comunica por qué no hay alerta. Mostrar lo que el dato permite, sin configurar umbrales automáticamente.
8. **Móvil — tabla o tarjetas, nunca ambas.** Columnas esenciales, tarjetas con acciones ≥44px, nombres sin recorte irreversible, filtros accesibles y teclado. Formularios preservan captura ante error.

## Secuencia de trabajo propuesta

1. Acordar estándar de identidad/presentación y recorridos; validar casos «producto existente», «nueva refacción con primera entrada» y «compra directa para orden».
2. Corregir responsive, estados y copy en un corte UI acotado, con SPEC/UX/EWO proporcional. No mezclar esta corrección con migración financiera.
3. Con promedio ponderado, MXN y modo de captura con/sin IVA acordados, resolver detalles fiscales restantes, stock inicial, permisos y excepciones. Elaborar SPEC y decisión de arquitectura/costeo, dado que costeo estaba fuera de v0. No modificar ADR-002 silenciosamente.
4. Implementar registro de costos, valorización y costo histórico por consumo mediante EWO aprobado; conservar límites de módulos y transacción de cierre.
5. Agregados por orden/unidad → habilitar las vistas de costos de SPEC-MTTO-UX-002. No mostrar total de mantenimiento si solo hay costos de refacciones y faltan mano de obra/otros: etiquetar **Costo de refacciones**.
6. Pruebas de cantidades/concurrencia/costos y auditoría visual independiente desktop/móvil. Datos reales o fixtures reconciliados; no autoaprobar mockups.

## Casos mínimos para validar el estándar

- SKU duplicado y equivalente dudoso: reutilizar o revisar; nunca duplicar por proveedor.
- Alta exitosa y entrada fallida: refacción se conserva, reintento no la duplica.
- 10×100 + 10×120; consumo 3; validar método elegido y snapshot histórico.
- Nueva compra tras consumo: costo de orden cerrada no cambia.
- Compra externa directa: aumenta costo de orden, no stock.
- Ticket recibido sin importe: documento recibido, costo aún desconocido.
- Stock inicial sin costo y recepción nueva: no promedio ficticio ni total completo.
- Dos órdenes consumen el mismo stock: no sobreconsumo ni doble cargo.
- Reintento/doble clic: no duplicar entrada, salida, comprobante o costo.
- Ajustes, devoluciones y parcialidad documentados según política aprobada.
- Sin permiso/fallo de consulta: no revelar importes ni afirmar ausencia.

## Límites y siguiente decisión

No se modificó runtime, esquema, políticas de costo, roles ni documentos aceptados. Fuentes de autoridad: PRODUCT, domain/inventario, ADR-002/007, UX operacional y SPEC-MTTO-UX-002. La solicitud actual justifica diseñar la ampliación; las decisiones faltantes no se tratan como tomadas.

Decisiones tomadas: promedio ponderado móvil; moneda MXN; captura a elección con IVA incluido o sin IVA, cálculo automático cuando falta el desglose y validación cuando ya existe. La base neta se conserva para comparar costos. Tasa predeterminada 16%, editable, con opción Sin IVA, confirmada por el usuario. El resto de decisiones abiertas se conserva arriba.
