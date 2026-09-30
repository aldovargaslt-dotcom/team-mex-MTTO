# PROPOSAL — Dashboard Supervisor e Inventario Control v0

## Estado

**Propuesta de shaping.** Input de producto recibido el 2026-09-28. No es decisión aprobada, SPEC, ADR ni Engineering Work Order.

## Dirección de producto recibida

1. **Órdenes** es el panel de control de las órdenes de trabajo; Inicio solo resume órdenes abiertas y dirige a ese panel, sin duplicar su lista/ficha/acciones.
2. El futuro **Dashboard Supervisor** concentra alertas de sus responsabilidades —Inventario, Mantenimiento y Salud de unidad— y el resumen de órdenes abiertas para orientar la siguiente revisión.
3. Una alerta permanece visible mientras su condición fuente siga abierta. «Vista» no controla su vigencia ni su presencia en la superficie operativa.
4. Se requiere un futuro **panel de control de Inventario**, comprensible y digerible, para configurar mínimos y consultar indicadores. Los máximos no forman parte de este corte.
5. El rol `SUPERVISOR` trabaja mobile-first. Sus cuatro vistas operativas principales son **Inicio**, **Órdenes**, **Unidades** e **Inventario**; alertas, ficha de unidad, wizard de orden y notificaciones son destinos o flujos dentro de esa arquitectura, no ítems principales adicionales.

## Propuesta A — Dashboard Supervisor

### Propósito

Responder «¿qué excepción de mi responsabilidad sigue abierta, hay órdenes abiertas y dónde debo entrar?»; no administrar órdenes ni convertirse en tablero de Flota/Logística.

### Fuentes existentes reutilizables

| Responsabilidad | Fuente actual | Acción existente |
|---|---|---|
| Mantenimiento | Andon / Salud → Inbox | Abrir unidad, revisar alerta, continuar o registrar visita; `Enterado` no resuelve. |
| Inventario | Stock bajo/agotado → Inbox; compra externa pendiente de comprobante | Abrir Existencias filtradas o Pendientes de comprobante. |
| Salud | `HEALTH_BELOW_THRESHOLD` → Inbox / hub | Abrir ficha y revisar factores de Health. |

### Jerarquía propuesta

```text
Dashboard Supervisor
  Alertas abiertas
    Mantenimiento       → unidad y siguiente acción
    Inventario          → SKU, cantidad actual y mínimo
    Evidencia pendiente  → compra externa pendiente de comprobante
    Salud de unidad     → unidad, estado y factores
  Órdenes abiertas
    Conteo + acceso a /ordenes (no lista ni ficha en Inicio)
  Accesos de apoyo
    Unidades            → consulta y diagnóstico
    Inventario          → panel de control separado
```

No mostrar: lista de borradores, ficha de orden, prioridad, SLA, vencimiento, asignado a, Flota, mapas ni KPI decorativo.

### Gap a resolver

La UI actual abre `/notificaciones` con filtro predeterminado `No leídas` y marca la fila como leída antes de navegar. Con el input recibido, la superficie operativa debe listar alertas **abiertas** por defecto, incluso vistas. «Vista» puede ser una señal visual secundaria o dejar de mostrarse, pero no puede sacar la condición abierta del dashboard.

No se modifica el ciclo de vida por ello: Andon, Inventario y Salud conservan sus propias reglas de expiración/resolución.

**Lenguaje:** el producto actual registra `COMPRA_EXTERNA` y pendiente de comprobante/evidencia; no existe una Orden de Compra formal en v0. El dashboard debe decir `Evidencia pendiente de compra externa` (o el copy equivalente aprobado), no `orden de compra pendiente`, hasta que ese concepto exista en dominio.

## Propuesta B — Panel de control de Inventario

### Propósito

Permitir configurar y entender el nivel de inventario sin obligar a interpretar tablas técnicas o crear acciones de compra inexistentes.

### Estructura inicial

```text
Inventario · Control
  Resumen de existencias
    Ítems agotados | Bajo mínimo | Evidencia pendiente | Sin regla
  Lista accionable
    SKU · existencia actual · mínimo · estado
  Configuración por ítem
    Mínimo | explicación de cómo afecta alertas
  Apoyo
    Movimientos, pendientes, familias y proveedores
```

Los conteos solo pueden usar categorías con semántica autorizada. No se añade «En rango» hasta definir qué significa en un modelo solo con mínimo. La acción predominante debe ser configurar el umbral o abrir la ficha/stock, no «comprar» ni generar una OC.

### Decisiones que el producto/dominio aún debe tomar

- Qué KPIs son operativos y medibles con los datos actuales. Candidatos seguros: agotados, bajo mínimo, sin umbral y pendientes de comprobante/evidencia de compra externa. No inventar rotación, cobertura, consumo proyectado, valor monetario ni compras recomendadas.
- Los máximos quedan diferidos: no crear `max_qty`, validaciones, alertas ni permiso asociado en esta propuesta. Si se retoman, habrá que definir si son tope visual, inventario deseado, máximo físico o límite de entradas antes de diseñarlos.

### Implicación arquitectónica

`min_qty` es propiedad de Inventario y su cruce está definido por ADR-007. No se persiste ni se alerta por máximo en este corte. Retomar máximos ampliaría ese modelo y requeriría shaping aceptado, SPEC con criterios canónicos y ADR actualizado/nuevo antes de API, schema o eventos.

### Preparación de datos para gráficas por SKU

El modelo ya permite medir **flujo histórico por SKU**: `inventario.movimientos` conserva `tipo` (`ENTRADA`, `SALIDA_OT`, `AJUSTE`), `qty`, `delta`, SKU/ítem, nota, visita opaca y `created_at`; la API ya filtra por ítem, tipo y periodo. Con eso son fiables gráficas de entradas, salidas a OT, ajustes y consumo neto por día/semana, además de rankings de SKU con más salidas.

`visita_piezas` y `pendientes_comprobante` completan el caso de compra externa: registran SKU opaco, cantidad, origen, estado del comprobante y fecha de creación. Sirven para mostrar el mix «desde stock vs compra externa» y pendientes abiertos, componiendo lecturas en la capa dueña de cada API; no corresponde hacer joins cruzados de schemas.

No alcanza todavía para una línea histórica fiable de **existencia disponible**: `inventario.stock.qty` guarda el valor actual y su última actualización, no snapshots ni saldo antes/después de cada movimiento. Tampoco hay costo, proveedor/OC con fechas de entrega, ni una fecha de resolución en el pendiente de comprobante; por ello quedan fuera valor de inventario, rotación monetaria, cobertura, lead time, forecast y tiempos de cierre históricos. La primera lectura futura debe ser un agregado de solo lectura dentro de Inventario, no una nueva escritura de kardex.

### Preparación de datos para comportamiento de órdenes por unidad

Una orden es hoy una `visita`: pertenece a una unidad y conserva estado (`BORRADOR`/`CERRADO`), fecha de creación, última actualización, fecha de cierre, kilometraje, tipo (`PREDICTIVO`/`CORRECTIVO`), trabajos A–E, observaciones, chofer, creador, fotos, firmas y líneas de piezas con cantidad y origen. En una visita cerrada, el km es obligatorio y no puede retroceder frente al último cierre de esa unidad.

Por tanto, sí son defendibles por unidad y por periodo: número de órdenes cerradas/abiertas, mix predictivo-correctivo, frecuencia y recurrencia de trabajos, kilometraje y días entre cierres, top de piezas consumidas, uso desde stock frente a compra externa y una demora operativa aproximada `cerradoAt - createdAt`. Esta última mide el ciclo del registro, no horas efectivas de taller: un borrador puede permanecer abierto antes de iniciar el trabajo.

**Costo por unidad no es trazable aún.** Las piezas solo registran `itemId`, `qty` y origen; Inventario guarda catálogo/proveedor y movimientos de cantidad, pero no precio unitario, moneda, importe, descuento, factura/OC estructurada ni costo de mano de obra o servicio externo. El comprobante de compra externa es una evidencia (`ticketDataUrl`), no un importe utilizable para cálculo. Sumar piezas hoy produciría una cifra inventada.

Si el producto decide medir costo, el siguiente discovery debe definir un registro financiero inmutable de costo aplicado por línea de orden (precio unitario capturado al cierre, moneda e importe), más mano de obra/servicio externo cuando corresponda. Debe conservar el precio histórico —no leer un precio de catálogo actual— y respetar las fronteras de Mantenimiento e Inventario con una lectura compuesta o contrato explícito, no un JOIN SQL cruzado.

### Propuesta recibida — evidencia y costo administrativo

**Estado: dirección de producto para detallar; no autoriza implementación.** El Supervisor de mecánica adjunta el comprobante cuando existe una compra externa y no captura precio. Un perfil administrativo autorizado captura o ajusta el costo. Puede hacerlo aun sin comprobante, pero el sistema debe conservar y hacer visible la excepción.

La orden sigue su ciclo operativo normal: puede quedar `CERRADO` aunque el costo esté pendiente o tenga excepción. La conciliación financiera no añade estados a la orden; se modela como un registro asociado por ID opaco a la visita y a la línea de pieza.

```text
Compra externa en una orden cerrada
  comprobante adjunto?        costo capturado?
  no / sí                     no / sí
      ↓                           ↓
Pendiente de evidencia     Pendiente de costo
  o excepción              o conciliado
```

El registro debe conservar hechos y auditoría, no solo un estado mutable: evidencia y quién/cuándo la adjuntó; importe, moneda y quién/cuándo lo capturó; motivo codificado de excepción y explicación; y revisiones de importe como correcciones anexas, sin sobrescribir el valor anterior. `SIN_COMPROBANTE` es el primer motivo mínimo; otros motivos solo se añaden si el SOP los exige.

#### Cola y consulta de excepciones

Una futura superficie de Inventario/Costos presenta colecciones por condición, sin ownership individual: **Pendientes de evidencia**, **Pendientes de costo**, **Costos con excepción** y **Conciliados**. Cada fila permite abrir orden, unidad, SKU/cantidad, comprobante si existe, importe vigente y motivo/historial de excepción. Los totales de reportes deben separar `conciliado` de `con excepción`; no deben sumar un costo excepcional como si fuera confirmado.

La visibilidad financiera corresponde al perfil administrativo autorizado. Si el Supervisor necesita seguimiento, su superficie muestra una señal no financiera como «Revisión administrativa pendiente», sin exigirle corregir ni exponer importes. El mapeo inicial puede usar roles existentes, pero las capacidades deben quedar separadas: adjuntar evidencia, capturar/ajustar costo, ver costo y ver excepciones.

Para costo desde stock, una entrada administrativa futura tendrá que registrar precio y moneda; al consumir una pieza, Inventario aplicará y congelará un costo histórico. La opción inicial más simple es costo promedio ponderado. Una decisión futura de cambiar a FIFO/LIFO no debe recalcular órdenes históricas: cada costo aplicado conserva su base y versión.

## Secuencia sugerida

1. Aprobar/rechazar el comportamiento de Dashboard Supervisor y definir que la vista por defecto sea «abiertas», no «no leídas».
2. Especificar y ejecutar el ajuste de UX de alertas sin cambiar los schemas fuente.
3. Diseñar los KPIs y agregados de lectura por SKU que aprovechen movimientos existentes; diferir máximos.
4. Solo entonces redactar SPEC/ADR de Inventario Control y su EWO.
