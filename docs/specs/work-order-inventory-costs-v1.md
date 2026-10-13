# SPEC-INV-OT-001 — Refacciones, compras y costos por orden de trabajo

## Status

Approved for bounded local implementation by the 2026-10-12 request to follow commit 39cd9a5. Execution and actual verification: [EWO-038](../engineering-work-orders/EWO-038.md) and [evidence](../evidence/EWO-038.md). No deployment or production migration approval. The requirements below remain the canonical ACs; planned verification is not evidence.

## Problem

Registrar piezas de almacén y compras para una OT sin duplicar captura, perder sobrantes o confundir gasto de compra con costo de mantenimiento. El supervisor realiza la operación y puede cerrar la OT; no se incorpora aprobación de compras.

## Baseline inspected before implementation

- `api/src/visitas/visitas.service.ts`: cierre transaccional, consumos en `VisitaCerrada`; administrador consulta cerradas y no ve borradores en el detalle legacy.
- `api/src/inventario/inventario.service.ts`: `applyVisitaCerrada` descuenta `DESDE_STOCK`; `COMPRA_EXTERNA` crea pendiente de comprobante sin movimiento. `marcarRecibida` sólo cambia estado del comprobante.
- `api/src/inventario/entities/stock.entity.ts`: cantidad entera, sin valoración.
- `api/src/inventario/entities/movimiento.entity.ts`: movimientos sin costo unitario ni referencia de corrección.
- `web/src/app/inventario/pendientes/page.tsx`: cierre documental explícitamente no cambia existencias.

Costeo y OC formal figuran fuera de v0 en [PRODUCT](../../context/PRODUCT.md). Este incremento incorpora el costeo acordado; mantiene fuera una suite de compras y OC formal. La [decisión ADR-025](../adr/025-work-order-inventory-costs.md) identifica la modificación necesaria de ADR-002; no altera el baseline aceptado.

## Goals and non-goals

Objetivos: costos históricos explicables por OT, stock correcto, captura corta, compras vinculadas, devoluciones y correcciones auditadas.

Fuera: aprobaciones, reembolsos/pagos contables, multi-almacén, lotes, reservas en borrador, OCR obligatorio, OC formal, impuestos desglosados, moneda múltiple, cambios en CHECK, Flota, Andon o firmas.

## Actors

- `SUPERVISOR`: captura compra, confirma consumo, recibe sobrantes, devuelve a proveedor, cierra mantenimiento.
- `ADMIN_DIRECTIVO`: corrige materiales/costos de OT cerradas mediante acción explícita y motivo.
- `LOGISTICA` y otros roles: sin nuevo permiso de inventario por este incremento.

Modificar una OT cerrada aquí significa corregir materiales y compras relacionadas. Cambios de km, trabajos, fechas o firmas no se infieren de esa autorización y requieren alcance separado por sus efectos de mantenimiento.

## Functional Behavior

### 1. Usar piezas de almacén

Dentro de Piezas, buscar SKU y registrar **Cantidad utilizada**. Al confirmar uso, deducir stock y congelar costo de valoración. No pedir precio, proveedor ni comprobante. Mostrar disponible y costo derivado. Guardar una selección sin confirmar no mueve stock.

### 2. Comprar para esta OT

Acción **Registrar compra**: ítem, cantidad comprada, total pagado, comprobante y cantidad utilizada. OT, unidad, actor, fecha y moneda se heredan. Mostrar **Restante al almacén** como cálculo; confirmar su recepción física antes de contabilizarlo como disponible.

Cada compra de este flujo pertenece a una OT. Una compra tiene líneas por ítem; el comprobante se adjunta una vez a la compra. No ofrecer reparto entre varias OT. El catálogo permite alta de un ítem nuevo con stock cero antes de registrar la compra.

Cantidad usada es obligatoria, admite cero y nunca se preselecciona como toda la compra. Una foto o adjunto no cambia stock. El costo de cada línea se captura por ítem, no se distribuye automáticamente un total de recibo entre productos diferentes.

Comprobante opcional al registrar; puede adjuntarse posteriormente, incluso con OT cerrada, sin aprobación ni nuevo movimiento. Mientras falte, mostrar **Comprobante pendiente** en compra y alertas activas de Inicio, prioridad Seguimiento, con acceso a esa compra. Una condición por compra, no por línea/ítem; adjuntar evidencia elimina la condición sin cambiar costos ni stock. Leer la alerta o cerrar la OT no resuelve el faltante. Reutilizar la façade/ownership de [SPEC-ALERT-ATTENTION-001](alert-attention-v1.md); no generar una alerta paralela al pendiente legacy para la misma compra. La campanita conserva su semántica de avisos no leídos.

### 3. Costo directo frente a costo de almacén

Para compra destinada a OT, conservar origen `COMPRA_EXTERNA` y costo real de sus piezas usadas. No mezclar ese consumo directo con el promedio de las piezas existentes. Sólo el sobrante recibido aumenta cantidad y valor del almacén.

Para `DESDE_STOCK`, usar promedio ponderado móvil. Registrar cantidad, costo unitario aplicado, total, moneda, origen y referencia de compra/movimiento. El historial no se recalcula al cambiar precios posteriores.

Ejemplo: almacén 10 filtros a MXN 200 (valor 2,000). Compra de 3 a MXN 250: usa 2 en OT (costo 500), recibe 1 al almacén. Saldo 11, valor 2,250, promedio 204.54545…; la OT conserva costo 500. Una salida posterior de almacén usa ese promedio, no 250.

### 4. Unidades y cierre

Definir unidad base por ítem y conversión de compra: caja de 10 → 10 piezas. Mostrar la conversión antes de confirmar; rechazar conversión desconocida o inconsistente. Cantidades fraccionarias confirmadas por usuario: compra, consumo, sobrantes, stock, devoluciones y correcciones admiten decimales para unidades divisibles, por ejemplo litros. Ítems indivisibles (piezas) conservan cantidades enteras; una conversión de caja a pieza debe producir un entero. Mostrar siempre unidad base. Propuesta técnica: representación decimal exacta y precisión definida por unidad, sin redondeo silencioso de cantidades; rechazar exceso de precisión con explicación. Migrar cantidades y umbrales compatibles antes de habilitar captura fraccionaria.

El supervisor conserva **Cerrar orden**. Además de validaciones existentes, toda compra debe reconciliar cantidades: comprada = usada neta + recibida en almacén + devuelta a proveedor + pérdida documentada + pendiente de destino. Para cerrar, pendiente debe ser cero. Registrar movimientos de retorno/reclasificación sin contar la misma pieza en dos destinos. Una devolución de pieza usada reduce uso neto; una devolución de sobrante reduce saldo de su destino previo.

Una pérdida no se registra como consumo de reparación ni inventario disponible. Requiere cantidad y motivo; mostrar su costo separado del material instalado.

### 5. Devoluciones y correcciones

Devolución a proveedor referencia la compra y cantidad originales. Si sale del almacén, reduce stock con valoración correspondiente y mantiene separado el importe del reembolso del proveedor; si sale del uso directo de OT, revierte el costo original correspondiente sin aumentar almacén. Registrar **Reembolso pendiente / Reembolsado / Reemplazo pendiente / Reemplazado** sin inferir pago automático. Un reemplazo físicamente recibido exige su propio movimiento vinculado, sin crear un gasto de compra duplicado.

Administrador: **Corregir materiales**, motivo obligatorio, versión esperada y resumen antes/después. Revertir el movimiento incorrecto y crear el correcto, conservando los originales y sus costos. Restaurar cantidad al almacén sólo si está físicamente allí; en caso contrario indicar destino real. Mantener OT cerrada y fecha de cierre original; no volver a publicar mantenimiento realizado.

No borrar compras o consumos contabilizados, ni eliminar el borrador que los contiene sin resolver sus movimientos físicos. Cancelar una OT no devuelve automáticamente piezas al almacén.

## Business Rules

- Cantidades y montos finitos; comprada > 0, usada >= 0 y usada <= comprada disponible. No stock negativo ni doble devolución.
- Costo monetario decimal, sin operaciones financieras autoritativas con flotantes binarios. Mantener precisión interna, redondear totales de moneda; reconciliar residuos para no perder valor.
- Decisión confirmada: MXN, total efectivamente pagado por línea **incluyendo impuestos** como costo operativo de adquisición. Sin desglose fiscal ni recuperación de IVA en este incremento.
- Cada comando contabilizado lleva clave de idempotencia, actor, fecha y versión. Repetir misma clave/payload devuelve resultado previo; misma clave con otro payload falla.
- Bloquear/versionar saldo y OT para competir entre cierre, consumo, devolución y corrección. Validar permisos y reglas en servidor.
- Una compra contabilizada puede editarse sólo mediante corrección, nunca sobrescribiendo el costo histórico.
- Costos históricos desconocidos se muestran como **Costo pendiente**, nunca cero asumido. No presentar costo total completo mientras haya líneas sin valorar.

Stock existente sin costo puede consumirse y la OT puede cerrarse con cantidades reconciliadas y validaciones de cierre cumplidas. Mostrar **Costo pendiente** por línea y total incompleto; no bloquear por ese faltante ni usar cero. Administrador completa valoración mediante registro explícito vinculado a movimientos afectados, con autor/motivo/versiones; no recalcular líneas ya valoradas con precios posteriores. Mientras exista cantidad de almacén sin valorar, su promedio permanece incompleto, no se obtiene sólo de compras conocidas.

## State Transitions and failure behavior

- Captura → confirmación contabilizada → corrección/devolución vinculada. No estado de aprobación.
- OT conserva borrador/abierta → cerrada. La corrección añade versión; no reabre por sí sola.
- Fallo transaccional: ningún saldo, costo o movimiento parcial. Mantener datos de formulario para reintentar con la misma clave.
- Conflicto concurrente: refrescar saldo/versión y pedir revisar; nunca sustituir una compra específica por stock silenciosamente.
- Comprobante documental y recepción física son conceptos distintos; no reutilizar **Cerrar comprobante** como entrada de stock.

## Domain and architecture implications

Mantenimiento conserva OT y líneas de piezas con IDs opacos. Inventario conserva compras, recepciones, valoración, movimientos y reversos. UI compone ambos mediante APIs; sin JOINs/FKs cruzadas ni escritor paralelo de stock.

Se propone contabilizar al confirmar uso/recepción, no esperar al cierre, para representar físicamente la operación. Esto difiere de ADR-002: resolver mediante ADR-025 y contrato versionado antes de implementar. El cierre debe verificar movimientos ya aplicados sin repetirlos; el envelope histórico `VisitaCerrada` permanece congelado. Las correcciones no reejecutan efectos de Andon/Salud/CHECK.

## Acceptance Criteria

| ID | Given / When / Then |
|---|---|
| AC-01 | Dado stock valorado, confirmar uso descuenta una vez y registra su costo; no exige recibo. Selección no confirmada no descuenta. |
| AC-02 | Dada compra de 3 a 250 para OT, confirmar uso 2 y recibir sobrante 1 carga 500 a OT y 250 al almacén; no genera 3 piezas disponibles. |
| AC-03 | Dado saldo 10 a 200, AC-02 deja saldo 11 y valor 2,250; consumo directo permanece a 250. |
| AC-04 | Dada nueva compra con otro precio, costos contabilizados previamente no cambian. |
| AC-05 | Dada compra caja de 10 por 2,000, usar 2 piezas carga 400 y recibir 8 agrega valor 1,600. Conversión desconocida bloquea confirmación. |
| AC-06 | Dada compra con usada ausente/negativa/excesiva, falla sin movimientos; usada cero es válida. |
| AC-07 | Dada compra con cantidades sin destino, supervisor no cierra; reconciliadas, cierra con validaciones existentes y sin aprobación. |
| AC-08 | Dado reintento/doble clic/timeout, una misma operación produce una sola compra y aplicación de stock/costo. |
| AC-09 | Dada devolución directa de una pieza a 250, revierte 250 de OT sin aumentar almacén; devolución excesiva falla. |
| AC-10 | Dada devolución desde almacén, descuenta stock y valoración, registrando reembolso por separado sin distorsionar promedio. |
| AC-11 | Dada OT cerrada, administrador corrige con motivo y destino físico; registra reverso, nuevo saldo/costo y autor. Supervisor y roles no permitidos no corrigen cerradas. |
| AC-12 | Dada corrección o cierre de consumos ya aplicados, no se duplican consumos ni eventos de mantenimiento completado. |
| AC-13 | Dadas dos salidas que exceden saldo combinado, sólo operaciones con saldo suficiente se confirman; no saldo negativo ni pérdida de actualizaciones. |
| AC-14 | Dada falla en cualquiera de las escrituras, transacción completa revierte y reintento es seguro. |
| AC-15 | Dado legado sin costo, UI indica Costo pendiente; no inventa gasto cero ni altera envelope histórico. |
| AC-16 | Dada compra multítem, cada línea conserva importe y costo propios y comparte un solo comprobante; no exige asignación entre OT. |
| AC-17 | Dada pérdida o sobrante sin recepción física, no se carga como material instalado ni aparece como stock disponible. |
| AC-18 | Dado borrador con consumo contabilizado, eliminar/cancelar no destruye historial ni restaura piezas automáticamente. |
| AC-19 | Dada compra sin comprobante, registrar y cerrar OT es posible con cantidades reconciliadas; aparece Comprobante pendiente en compra e Inicio, una condición por compra incluso multítem. |
| AC-20 | Leer alerta/cerrar OT no resuelve comprobante pendiente; adjuntar evidencia elimina condición sin cambiar stock/costo ni repetir consumo. Un retry no duplica alerta ni compra. |
| AC-21 | Stock legado sin costo permite consumir/cerrar con total incompleto; administrador completa costos con historia vinculada sin alterar otros costos congelados. |
| AC-22 | Total de compra con impuestos incluidos se usa en costo directo y valor del sobrante; no descontar impuestos automáticamente. |
| AC-23 | Dada compra de 5 L por MXN 500 incluyendo impuestos, uso 4.5 L y recepción física 0.5 L, OT recibe costo 450 y almacén cantidad 0.5 L/valor 50; cierre reconcilia sin redondear cantidades. |
| AC-24 | Dado consumo 0.25 L con saldo suficiente, se permite; una fracción de pieza indivisible o conversión incompatible falla sin movimiento. Devoluciones/correcciones fraccionarias conservan cantidad y costo exactos. |

## Traceability, impact and validation plan

PRD: [inventory-work-order-costs-v1](../prds/inventory-work-order-costs-v1.md). UX: [ux-work-order-inventory-costs-v1](../design/ux-work-order-inventory-costs-v1.md). ADR: [025](../adr/025-work-order-inventory-costs.md). Áreas afectadas: Inventario y Mantenimiento, provisionales; no nuevo Bounded Context.

Datos requeridos: valoración/costo inicial, compras y líneas, conversión de unidades, vínculos opacos a OT, historial de movimientos/reversos y claves únicas de comandos. Migración aditiva; no borrar pendientes ni inventar comprobantes/costos del legado.

API propuesta: comandos confirmar uso, registrar compra/recepción, devolver y corregir; consulta de costo y movimientos por OT. Nombres/rutas y contrato final se fijan al preparar ejecución, no se declaran existentes.

| AC | Validación planificada |
|---|---|
| 01–06, 09–10, 15, 17 | Unitarias de costeo/conversión/reconciliación y pruebas de integración de saldos. |
| 07, 11–12, 18 | E2E permisos, cierre, correcciones, eventos y cancelación; contratos de Mantenimiento/Inventario. |
| 08, 13–14 | Integración Postgres: retries, concurrencia, rollback y claves únicas. |
| 16 | Integración compra multítem y una evidencia documental compartida. |
| 19–20 | Integración compra/alertas, deduplicación legacy, adjunto posterior a cierre, retry y lectura sin efectos. |
| 21–22 | Valoración incompleta, costo incluyendo impuestos, cierre y completado administrativo auditado. |
| 23–24 | Unitarias e integración: cantidades decimales, menor que uno, conversión, precisión, rollback, devolución y saldo. |
| 01–24 UI | Click-through en 390/1024/1440, estados de error, costo pendiente, accesibilidad y revisión visual independiente. |

Los tests se crearán en módulos afectados durante ejecución; no hay tests nuevos ejecutados en este cambio documental. Comandos futuros: `cd api && npm test && npm run test:e2e`; `cd web && npm run lint && npm run build`. E2E sólo contra BD desechable validada. Evidencia posterior enlazará resultados, no pruebas planificadas como PASS.

## Confirmed decisions and remaining technical risks

1. **Costos iniciales:** usuario confirmó uso/cierre con Costo pendiente y completado administrativo. Obtener valores reales; no inferirlos del último precio.
2. **Precisión de cantidades:** resuelto por usuario: sí, cantidades fraccionarias. Fijar escala decimal por unidad en contrato/migración; piezas indivisibles permanecen enteras. Adaptar validación legacy que exige al menos 1 para aceptar consumo positivo menor que 1 en unidades divisibles.
3. **Impuestos/moneda:** resuelto por usuario: MXN/total pagado incluyendo impuestos para control operativo.
4. **Comprobante:** usuario confirmó captura opcional y alerta mientras falte. Fijar tipos/tamaño y almacenamiento privado reutilizando límites existentes. Evidencia pendiente no equivale a mercancía por recibir.
5. **Contrato técnico:** aprobar ADR-025, compatibilidad de consumos al cierre y migración antes de preparar EWO ejecutable. La aprobación de reglas de producto no se presenta como aprobación de todos estos detalles.

No ampliar edición administrativa a identidad, km, fechas o firmas sin especificación de sus efectos. Sin reservas, seleccionar stock en borrador no garantiza disponibilidad; confirmar uso valida contra saldo actual.
