# INV-001 — Contrato técnico de costos de refacciones

## Estado y precedencia

**Proposed, diseño técnico para revisión**, solicitado al consolidar «adelante entonces, spec it». Reglas de operación aceptadas en [SPEC-INV-001](../specs/SPEC-INV-001.md); este contrato no afirma endpoints desplegados, migraciones ejecutadas o autorización de implementación. [ADR-026 propuesto](../adr/026-inventario-costos-historicos.md) es fuente de ownership/persistencia. Prevalece este documento sobre referencias a decisiones técnicas aún no desarrolladas en discovery. Los AC de producto siguen en la SPEC.

## 1. Tipos y precisión

- Moneda única inicial `MXN`. Importes persistidos y transportados como **centavos enteros en string decimal**, evitando límite de precisión de JSON/Number. Ejemplo `"139200"` = $1,392.00. API no acepta símbolos de moneda, notación exponencial, negativos en compra ordinaria ni más de dos decimales de captura monetaria.
- Cantidades enteras positivas en piezas en entradas/consumos/retornos; delta entero no cero en ajustes. Mantener validaciones actuales y stock no negativo.
- Tasa en puntos básicos de porcentaje: `1600` =16%; `800` =8%; rango técnico inicial 0..10000 inclusive, entero. Base propuesta de validación, no catálogo de tratamientos fiscales. UI default1600 editable. `NO_TAX` explicita Sin IVA; `TAXED` exige tasa. Tasa0 explícita no es desconocida ni se etiqueta exento por inferencia.
- Modo `INCLUDED` / `EXCLUDED`; `NO_TAX` ignora desglose tributario y conserva impuesto0 explícito. Importe ausente se representa con costo `PENDING` y campos monetarios nulos, nunca `"0"`.
- Redondeo **half-up** a centavo, sobre números no negativos. Cálculos por línea de refacción/operación. No aplicar porcentaje sobre valores ya redondeados a formato visual. No asignar a otras líneas diferencias de una factura; distribución automática de descuentos/fletes está fuera.
- Incluido: `netCents = roundHalfUp(totalCents*10000/(10000+rateBps))`; `taxCents = totalCents-netCents`.
- Excluido: `taxCents = roundHalfUp(netCents*rateBps/10000)`; `totalCents = netCents+taxCents`.
- Sin IVA: `netCents=totalCents=inputCents`, `taxCents=0`.
- Costo unitario es derivado, no captura editable. Mostrar2 decimales en consulta habitual y hasta6 cuando haga falta explicar promedio; nunca reutilizar el valor formateado para contabilizar.
- Desglose declarado del documento es opcional. Si se declara, neto+IVA debe igualar total y coincidir con cálculo a centavo. Diferencia produce422 con preview y campos afectados; no ajustar documento ni tolerancia oculta. El usuario puede corregir datos o dejar costo pendiente, conservando referencia/evidencia. No OCR.

## 2. Identidad, autorización e integridad

Cada escritura nueva de costos/entrada/ajuste/retorno/adjunto lleva `Idempotency-Key` UUID, validado antes de mutar. Servidor vincula clave a identidad del actor confiable y operación; persiste hash canónico del payload, resultado y referencias en la misma transacción. Permisos se revalidan en cada acceso, incluso replay; una respuesta anterior no elude revocación.

- Misma identidad/clave y mismo payload: devuelve resultado confirmado sin reaplicar cantidad/costo/documento.
- Misma clave con payload distinto:409 `IDEMPOTENCY_CONFLICT`.
- Concurrentes iguales esperan el resultado único o devuelven409 `OPERATION_IN_PROGRESS` con recuperación. No dos escrituras.
- Fallo antes de commit: sin efecto financiero/stock ni resultado exitoso. Después de commit con respuesta perdida: repetir misma clave recupera el resultado persistido.
- Cliente conserva clave y payload durante recuperación. Nueva acción intencional usa nueva clave. No generar clave nueva por timeout.
- Los comandos de corrección/completado llevan `expectedVersion` entero; desactualizado:409 `VERSION_CONFLICT`, sin overwrites. Bloquear fila de stock/valoración en orden estable por itemId al tocar varios ítems.
- El registro idempotente confirmado no se elimina por un TTL arbitrario que permita duplicar operaciones antiguas. Política de archivo conserva unicidad y referencia verificable.
- Implementación debe demostrar atomicidad con la transacción de cierre y las alertas actuales. Error del refresco/UI o emisión posterior al commit no cambia un resultado confirmado en orden a reenviar.

Permisos propuestos basados en actor autenticado del servidor:

| Operación | Supervisor | Admin |
|---|---|---|
| Consultar costos/agregados dentro de su alcance actual | Sí | Sí |
| Capturar compra/costo inicialmente pendiente | Sí | Sí |
| Apertura/regularización de valoración | No | Sí |
| Validar, corregir importe registrado | Solicitar corrección; sin aplicarla | Sí, autorización explícita con motivo |
| Ajuste de cantidades | Permiso vigente; sin ampliarlo | Permiso vigente |
| Valorar sobrante, aprobar corrección financiera | No | Sí |
| Adjuntar comprobante, incluso RECIBIDA | Según permiso documental vigente | Según permiso documental vigente |

Registrar `actorId`, momento servidor, acción, motivo, versión anterior/nueva y referencias. No actor recibido en body ni confianza en rol enviado desde navegador. Adaptar los guards actuales a identidad confiable sin migrar auth global silenciosamente; si no hay identidad verificable en entorno productivo, rechazar comandos financieros. Otros roles no adquieren lectura de importes por ser usuarios de órdenes.

## 3. Entrada y compra externa

Payload conceptual de entrada, endpoint propuesto `POST /inventario/recepciones`:

```json
{
  "itemId": "uuid",
  "qty": 10,
  "supplierId": "uuid",
  "cost": {
    "state": "RECORDED",
    "currency": "MXN",
    "inputTotalCents": "139200",
    "taxMode": "INCLUDED",
    "taxTreatment": "TAXED",
    "rateBps": 1600
  },
  "documentReference": "FAC-001",
  "note": null
}
```

Solo total de las piezas de esa refacción. Servidor calcula neto/IVA/total y unitario. Compra nueva exige proveedor válido; proveedor inactivo no habilita nueva compra. Registrar su identificación histórica para lectura sin renombrar compras pasadas al editar catálogo. Recepción física sin costo: `cost.state=PENDING`, demás importes nulos. Puede quedar referencia/documento pendiente.

Respuesta incluye `operationId`, `version`, `quantityAfter`, `valuationStatus`, `cost` y, solo cuando procede, promedio derivado. Fuente de stock/costo se lee consistentemente. No insertar una entrada monetaria sin su cantidad ni al revés.

Compra directa externa: usar registro de costo por línea de consumo de la orden (visitaId/itemId opacos y origen), nunca recepción al almacén. Capturar provisional antes de cierre no genera gasto confirmado ni pendiente documental duplicado. El cierre existente determina uso; snapshot confirma costo conocido o pendiente. Si solo se captura después, usa la línea confirmada y el proceso de completar. Invariante: costo vinculado no modifica stock/promedio de almacén.

Compra partida: cada destino registra su cantidad y total, con reference al mismo documento si corresponde. UI advierte que referencia repetida no significa duplicar todo el importe. No reparto automático ni aceptación de un total de documento como si perteneciera a cada línea.

## 4. Promedio ponderado y consumo

Valoración por refacción en Inventario: cantidad actual `Q`, valor neto en centavos `V`, estado `COMPLETE`/`INCOMPLETE`, versión y último corte. El stock existente sigue como fuente de cantidades; la valoración no crea un segundo saldo físico autoritativo. Q se contrasta/actualiza en la transacción vigente.

Cuando la base es completa, recepción neta `v` y cantidad `q` da `Q'=Q+q`, `V'=V+v`. Promedio exacto es razón `V'/Q'` (centavos por pieza); el costo unitario visual no limita la precisión.

Para salida de `q` con base completa: `consumptionNetCents=roundHalfUp(V*q/Q)`; si sale todo el stock, consumir **V completo** y dejar valor0. Restar costo aplicado del valor y q de cantidad. Este reparto a centavo evita un residuo sin destino; snapshot conserva importe autoritativo y razón V/Q usada. Aceptar una diferencia de redondeo en la razón remanente, sin recalcular snapshots previos.

Snapshot de consumo guarda ID estable, visitaId/unidadId/itemId, origen, qty, fecha efectiva del cierre, costo neto histórico o null, base de valoración/version, fecha de registro y revisión vigente. No inventar IVA de un consumo de almacén como si fuera una compra nueva: impuesto de compra permanece en recepción. El reporte de gasto usa neto; la trazabilidad enlaza operaciones de origen cuando esté disponible.

Reaplicación de cierre deduplica por `eventId` y por identidad estable de consumo para evitar duplicar el mismo cierre bajo otro delivery. Legado conserva la restricción actual por visita/item; no introducir múltiples líneas del mismo item/origen sin contrato explícito. No cambiar el envelope congelado para meter precios.

## 5. Costo desconocido, apertura y regularización

Una recepción sin costo o sobrante sin valoración deja estado `INCOMPLETE`. No mostrar `V/Q` como promedio global conocido. Conservar información monetaria conocida con cobertura, sin identificarla como valor total del stock. Consumos desde base incompleta quedan PENDING; no bloquean mantenimiento ni toman último precio como sustituto.

Apertura Admin (`POST /inventario/items/:id/valoraciones/aperturas`, propuesto): cantidad física verificada, valor neto MXN, fecha efectiva de corte, evidencia/referencia y motivo. No exige proveedor ficticio. Lock/version verifica que el stock coincida con la cantidad observada antes de activar base completa. Si difiere,409 y revisión; no cambiar cantidad en silencio desde valorización. Ajuste físico es operación separada y auditada. Un corte no precede operaciones ya confirmadas de forma que las recalcule silenciosamente; migración inicial requiere ventana de consistencia.

Completar una recepción pendiente registra su importe y revisión, pero **no convierte automáticamente** todo el stock en valorizado si hubo movimientos con costo desconocido. Con stock base incompleta, Admin realiza regularización al corte actual con cantidad/valor verificados y referencias de costos completados. Historial anterior conserva pendientes hasta regularización explícita de cada consumo. No recalcular cadenas de promedios retrospectivamente para producir snapshots ficticios.

Para cada consumo pendiente regularizado guardar costo asignado, soporte, autor y fecha además del momento original del consumo. El reporte del periodo original se actualiza con etiqueta de regularización y revisión/asOf; importes conocidos anteriores no cambian al completar otra operación. No atribuir automáticamente a consumos pasados la nueva apertura.

## 6. Correcciones, merma, sobrante y retorno

- Costo pendiente: completar autorizado con expectedVersion. Si ya tiene importe, el mismo comando rechaza409 y ofrece solicitar corrección, nunca sobrescribe.
- Costo registrado: Admin aplica revisión con motivo y referencia al registro original. Auditoría conserva antes/después; una revisión vigente no elimina anteriores. Si afecta una compra de almacén ya consumida, no reescribir todas sus salidas: registrar corrección financiera y determinar nueva base por regularización Admin, sin presentarla como gasto de una unidad sin consumo.
- Merma/faltante: cantidad disminuye con costo proporcional al promedio completo, usando el algoritmo de salida; se clasifica ajuste, no consumo por unidad. Con base incompleta, importe pendiente.
- Sobrante: cantidad aumenta, valor añadido desconocido y base INCOMPLETE hasta Admin. No entrada de compra gratis.
- Retorno de orden: solo desde consumo DESDE_STOCK identificado, stock físico recibido y qty disponible no devuelta. Aplicar el costo histórico conocido del consumo, prorrateado por cantidad retornada; retorno final de toda la cantidad devuelve exactamente el costo restante. Monto/cantidad acumulados nunca superan el consumo original. Lock conjunto evita doble devolución. No recalcular la orden como si nunca ocurrió: reporte muestra consumo y retorno separados, neto/cobertura.
- Fecha propuesta del retorno: momento de recepción física confirmado; reduce gasto neto del periodo del retorno, conservando vínculo con el consumo original. Esta elección de reporte está **Proposed**, no respuesta explícita del usuario; requiere aceptación del contrato antes de ejecutar B.
- Devolución a proveedor/cambio/garantía: fuera de la primera entrega. Ajuste físico con motivo y revisión puede conservar costo pendiente; no crear nota de crédito/reembolso automático.

## 7. Adjuntos posteriores

Modificar contrato existente de adjunto para permitir documento después de RECIBIDA. Añadir registro/versionado de adjuntos o revisión auditada, conservando referencia al anterior; no borrar evidencia silenciosamente. Control de tamaño/tipo/acceso según almacenamiento existente. Adjuntar no cambia el estado documental, cantidades, costos ni valor promedio. Idempotencia evita duplicar adjunto por reintento; no implementar esta capacidad en EWO-038 que es solo UI.

## 8. Contratos de lectura y cobertura

Consulta por visita/unidad mediante puerto de Inventario; datos de unidad/tipo/fecha/origen se toman del evento confirmado o del puerto de mantenimiento autorizado, no JOIN SQL entre módulos. No atribuir gastos de stock a unidad antes de consumo. CHECK no produce gasto de mantenimiento.

Agregado propuesto `GET /inventario/costos/consumos?unidadId=...&desde=...&hasta=...`: autorizado para unidad/visitas correspondientes, con meses/tipo, conocidos/pendientes, ajustes por retorno y asOf. Fecha de uso del cierre para consumo; fecha de registro/corrección independiente. Fecha efectiva de retorno según aceptación de sección6.

Rango por fecha local de negocio `America/Mexico_City`, límites inclusivos convertidos a intervalo UTC semiabierto; consistente con operación local actual. No confundir zona de la compañía con zona del cliente de Codex. Máximo propuesto24 meses por consulta interactiva; no SLA inventado.

Respuesta distingue `coverage=COMPLETE|PARTIAL|NONE`; `knownNetCents`, `pendingCount`, `totalNetCents` (null salvo COMPLETE), `currency`, `asOf`, `revision`. Si parcial, UI dice **Costo conocido de refacciones** y pendientes; no Gasto total. Tipo desconocido queda sin clasificar con cobertura identificada, no Preventivo por defecto. Detalle paginado no cambia agregados del conjunto completo. Sin mano de obra/Otros ficticios.

Leer costo de operación y movimientos también verifica permiso financiero; ocultar campos en respuesta, no solo CSS. Permiso retirado puede volver no accesible una referencia, sin devolver documento/importe cacheado al rol anterior.

## 9. Esquema conceptual y migración

Tablas propuestas, todas en Inventario: `cost_operations` (referencia movimiento/compra), `cost_revisions` (append-only), `valuation_state` (estado/cache derivado transaccional), `consumption_costs` (snapshot y revisiones vinculadas), `operation_receipts` (idempotencia) y auditoría/adjuntos según entidades existentes. FK solo dentro del módulo; visita/unidad son IDs opacos. No duplicar toda entidad de Visita ni crear motor contable.

Migración aditiva: columnas/costos nulos para legado, sin atribuir precio actual ni cero. Ningún consumo físico histórico vuelve a aplicarse como efecto de backfill financiero. Versionar datos y preparar lectura compatible antes de habilitar escrituras. Verificar cantidades existentes y coberturas en read-only. Ejecución manual/autorizada en target verificado; no synchronize, seed o migración automática al bootstrap por esta SPEC. Recuperación: deshabilitar comandos nuevos y conservar datos/auditoría, sin borrar movimientos financieros para hacer rollback.

## 10. Errores y casos de prueba técnicos

401 identidad ausente;403 permiso;404 referencia inaccesible según contrato actual;409 versión/idempotencia/operación en curso/conflicto de corte;422 costo/IVA inválido o discrepante; stock insuficiente mantiene semántica vigente400. Respuestas identifican operación y estado confirmado cuando corresponda, sin PII ni SQL.

Casos mínimos: 10×100+10×120; consumo3; retorno parcial/final; salida total con residuo; 3 piezas por $1.00 y salidas sucesivas; $116 incluido/$100 excluido; $0.01 incluido; tasa0/8/16/Sin IVA; cambio de modo; revisión esperada perdida; recepción pendiente y consumos pendientes; corte con concurrencia; corrección tardía sin reescritura; recuperación tras commit; roles; adjunto RECIBIDA; parcialidad del reporte y fechas límite. Se verifican con Decimal/enteros, API transaccional y proof-ui cuando se implemente, sin marcar ahora PASS de producto.
