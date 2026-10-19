# AN-MTTO-001 — Contrato propuesto de análisis de mantenimiento

## Estado, autoridad y límites

**Proposed**, fecha cliente2026-10-18. Revisión final solicitada por propietario
para precisar contratos de [SPEC-AN-MTTO-001](../specs/SPEC-AN-MTTO-001.md).
Q1–Q16 confirman producto; los esquemas, endpoints, nuevas capacidades y límites
operativos requieren validación técnica antes de ejecución. No crea nuevo BC,
schema, rol ni permiso. No instala ni cambia API/UI.

Actualización posterior: propietario confirmó Directivo configura horarios,
Supervisor consulta/solicita, utilización solo con cobertura completa y servicio
externo reconocido al concluir. Diseño concreto para revisión:
[AN-MTTO-001-technical](AN-MTTO-001-technical.md) y
[ADR030](../adr/030-maintenance-analysis-contracts.md). Este documento conserva
invariantes; transporte y persistencia están definidos allí como propuesta.

AC canónicos permanecen en la SPEC. Este documento define las invariantes de
intercambio; los nombres de campos/operaciones son lógicos, no una promesa HTTP.
Subordinar a ADR001/002/025/027, contratos de propietarios y seguridad vigente.

## 1. Fronteras y hechos fuente

| Fuente | Hecho confiable | No demuestra |
|---|---|---|
| Mantenimiento | Orden, trabajos, ciclo, evidencias y ledger por su capacidad | Duración de mano de obra desde apertura/cierre |
| Inventario | Operación de costo/consumo/retorno y revisión, fecha efectiva, MXN | Gasto de mantenimiento desde toda compra/recepción |
| Logística | Viaje registrado, procedencia y extremos según LOG-JOURNEY-001; paradas/liberación por sus capacidades | Custodia física, motor encendido o productividad |
| Flota | Movimientos/custodia física y km con fuente/fecha | Trayecto continuo o historial de disponibilidad entre eventos sin evidencia |
| Kernel/auth | Identidad, elegibilidad/tipo/instalación con alcance e historia disponible | Que valor actual sea válido para todo el pasado |
| Salud/Andon | Puntaje/alerta/umbrales del propietario y su actualización | Un nuevo score de riesgo calculado por este módulo |

Lectura mediante ports/proyecciones, sin JOIN/FK cruzados ni llamadas de escritura
desde selección de gráficos. El endpoint actual de consumos exige unidad u orden;
no es contrato de agregado global. No eludirlo descargando toda la flota al browser.

Costo externo: Supervisor es actor de captura acordado, no nuevo propietario
arquitectónico. Guardado económico no resuelve motivos ni firma/verificación.
Logística conserva autoridad de finalización operativa de ADR025. Servicio directo
sin parada puede documentar gasto realizado, pero no crear episodio/fecha de
liberación implícitos. ADR030 propone almacenamiento/puertos de Mantenimiento,
sin ampliar ownership de Inventario ni quitar autoridad de Logística.

## 2. Consulta y snapshot lógico

Entrada mínima: periodo [from,to), zona/calendario de negocio resuelto por servidor,
unidad/tipo/instalación permitidos, métrica, agrupación, ordenación y paginación.
Rangos/fechas/grupos inválidos se rechazan; nunca ampliar a toda la flota. El
cliente no establece actor, permisos ni calendario arbitrario.

Respuesta mínima común:

| Campo lógico | Invariante |
|---|---|
| scope | Alcance normalizado autorizado; filtros vacíos distintos de Todas |
| period / cutoff | Límites efectivos y corte transcurrido; UTC+zona de interpretación explícitos |
| snapshotId | Referencia opaca del conjunto consistente de versiones de fuentes |
| calculationVersion | Versión de reglas/cálculo usada; no confundir con updatedAt de unidad |
| sourceVersions / freshness | Procedencia, capture boundary y revisión/corte disponibles por fuente |
| status | Completo / parcial / actualización pendiente / no disponible, con causas |
| amount / duration / ratio | Unidad explícita, valor nulo cuando no calculable; ratio incluye numerador/denominador/cohorte |
| coverage | Registros/tiempo conocidos, pendientes, no clasificados, excluidos y motivos |
| rows / totals / cursor | Misma consulta/snapshot, suma verificable, paginación estable con desempate por identidad |

Snapshot es vector de fuentes consistentes, no afirma una transacción global entre
propietarios. Si falta fuente, no presentar estado Completo. Número y antigüedad
de snapshots conservados se definen en el contrato técnico (TTL15min); expiración nunca
autoriza sustitución silenciosa de revisión.

Drill-down y páginas llevan snapshot y consulta asociados. Refrescar cambia el
conjunto de forma explícita. Snapshot/cursor vencido: pedir refresco. Cambio de
scope actual: reautorizar y rechazar si corresponde; snapshot no es credencial.
No devolver totales globales a quien solo puede leer una parte del detalle.

Suma por conceptos exclusivos incluye Sin clasificar/Sin desglose cuando aplique.
Subtotales no exclusivos (sistemas/tipos de trabajo de una misma intervención)
incluyen definición y total único separado, no sumatoria engañosa.

## 3. Dinero, pendientes y conciliación

- Reutilizar semántica monetaria de `cost-rules.ts`: MXN, centavos como entero
  decimal exacto, taxMode/taxTreatment/rate con validación; neto+IVA=total.
  Límite monetario de servicios se concreta en contrato técnico (centavos1–16dígitos),
  sin ampliarlo respecto a Inventario por un DTO nuevo. Redondeo antes de agregar; mismo
  cálculo en resumen/detalle, no re-redondear por chart.
  netCents conocido con money=null no prueba IVA: tax/gross completos null y
  cobertura fiscal aparte. No inventar tasa ni IVA0 para consumo valorado.
- Pendiente: importe nulo y motivo; no mandar monto0 como placeholder. Conocido:
  neto/impuestos/total válidos. Cero explícito solo si confirmado, nunca ausencia.
- Separar **valor económico reconocido**, **tipo** y **sistema**: un costo puede
  ser conocido y Sin clasificar/Sin desglose. Eso no elimina el importe del total.
- Contar pendientes por identidad de costo fuente; mostrar piezas pendientes y
  servicios pendientes por separado o aclarar que el conteo incluye ambos.
  Revisiones no generan un pendiente extra; una pieza sin costo no desaparece
  de cobertura por no tener línea monetaria completa.
- Posible duplicación/conciliación es una causa distinta de monto pendiente.
  Presentar solo la parte no duplicada identificable como subtotal parcial. Si
  no se puede aislar la parte válida, valor nulo para ese conjunto y causa visible;
  no seleccionar una cifra arbitraria por ser la mayor o la más reciente.
- Retornos/ajustes se leen del dueño, conservando signo y fecha efectiva de sus
  operaciones. No inventar reembolso negativo ni borrar el costo original. Monto
  de servicio nuevo no admite negativos; corrección/abono requiere contrato dueño.

### Factura, piezas y distribución

Identidad de factura/referencia no sustituye identidad de cada asignación. Factura
multiunidad requiere asignaciones explícitas no duplicadas; suma de neto/impuesto/
total de asignaciones reconcilia el documento cuando sus importes estén completos.
Usuario fuera de scope no ve otras asignaciones ni monto global no autorizado;
la conciliación global la valida el propietario con permiso suficiente.

Parte incluida en factura y registro de pieza se vincula mediante referencias de
componente/asignación. Ese vínculo decide una única contribución monetaria al
reporte; no cambia stock, costos originales ni firmas. Si un componente ya tiene
contribución, enlace conflictivo se rechaza hasta conciliación. Piezas suministradas
por empresa son contribución separada y el proveedor no debe cobrar ese mismo
componente como incluido. Claims y asignaciones concretos en el contrato técnico
propuesto respetan propietarios; gráfico no efectúa descuentos automáticos.

Costo/km: neto conocido/distancia compatible; costos pendientes lo vuelven parcial.
Si no hay distancia válida, ratio nulo aun con monto0. Un total monetario puede
seguir visible aunque esa unidad quede fuera de la cohorte de costo/km. Exponer
costo y km de cohorte junto a exclusiones, sin comparar parcial/completo como ranking
de eficiencia definitivo.

## 4. Captura, clasificación y concurrencia

Registro externo lógico: identidad estable, unidad, vínculo orden/parada opcional,
proveedor, fecha de realización y precisión (día/instante), tipo, sistemas/trabajos,
dinero o Pendiente, referencias/componentes incluidos y comprobante disponible.
Actor/registeredAt/authMode/scope provienen de fuente confiable; referencias
opacas se validan por mismo alcance/unidad, no por existencia en el navegador.

Clasificación heredada de orden es una referencia a tipo+revisión de fuente. No
copiar texto de etiqueta ni aceptar override cliente contra orden vinculada.
Cambio histórico de clasificación conserva revisión y recalcula por procedimiento
autorizado; no deriva tipo histórico de catálogo actual sin evidencia.
Sin clasificar solo para histórico o clasificación pendiente explícita, no para
evitar selector obligatorio de nuevo servicio directo.

Comando nuevo incluye identidad de idempotencia y payload normalizado; actualización
incluye revisión esperada. Ámbito de unicidad lo valida el owner antes de ejecutar.
Reintento mismo actor/comando/payload devuelve recibo original; payload incompatible
o revisión obsoleta conflictúa. Validar scope actual antes de exponer recibo.
Dos escritores no pueden asignar el mismo componente financiero a dos contribuciones.

Registro y recibo de éxito se confirman atómicamente en el propietario. Error de
persistencia deja ambos sin confirmar; resultado de red desconocido se recupera
con la misma identidad. Actualización de proyección puede ser posterior: conservar
fuente confirmada, indicar pending refresh y servir último snapshot coherente o
No disponible. No revertir registro por fallo de gráficos ni afirmar rollback
distribuido entre módulos. No perder invalidación; mecanismo durable a diseñar.

## 5. Fechas, horarios y tiempo

Tiempo registrado servidor distinto de fecha efectiva aportada con evidencia.
Día sin hora basta para agrupación económica por día/mes, pero no se transforma
en comienzo/fin de indisponibilidad. Un servicio puede estar realizado pero costo
pendiente, o importe conocido sin liberación operativa: son hechos independientes.
Servicio de varios días: confirmado reconocerlo en fecha de conclusión económica,
sin prorratear.30oct–2nov se reconoce2nov. Consumo propio30oct permanece30oct.
Directivo configura horarios; Supervisor consulta y solicita ajustes por canal
existente, sin nueva bandeja de aprobación/solicitudes.

Horarios: días/franjas con zona, vigencia [start,end), alcance y revisión. Diferenciar
regla que dice no laborable, ausencia de regla, regla contradictoria y capacidad
de fuente fallida. Sin regla no es24/7. Precedencia unidad>tipo>general propuesta;
vínculos históricos de tipo/instalación deben ser demostrables. Franjas cruzando
medianoche y traslapes se unen en tiempo transcurrido, no horas de reloj duplicadas.

Horas históricamente elegibles F6 y utilización en horario esperado son métricas
distintas con metricId/denominador explícitos. Ratio propuesto:
viaje exclusivo dentro de horario elegible / duración del horario elegible.
Estado administrativo inactivo demostrado se excluye; elegibilidad desconocida
no se presume. Denominador0 devuelve No aplica, no0%; sin información devuelve
No disponible. Confirmado: con cobertura temporal parcial ratio=null y horas
visibles; porcentaje solo100%del alcance solicitado, sin excluir desconocidos
silenciosamente. Diseño y códigos de estado en contrato técnico.

Conservar evidencias de viajes y paros superpuestos; normalizar totales exclusivos
sin cambiar fuentes. Horas disponibles requieren evidencia positiva histórica.
Un viaje abierto válido puede observarse hasta cutoff; si se desconoce salida no
se reconstruye su duración. Viaje registrado Logística no demuestra custodia Flota.

## 6. Intervención y frecuencia

Separar identidad de orden/servicio, identidad de intervención que se reporta,
sistema y tipo de trabajo. Registro externo ligado a orden no equivale por sí
solo a que todos sus trabajos sean la misma intervención; resolver enlace por
trabajo/evidencia. Mismo día/unidad/sistema sin vínculo no permite fusión automática.
Mapping del legacy puede quedar sin resolver y se expone, no se adivina.

Contar una intervención concluida una vez por sistema/tipo de trabajo seleccionado;
no por cada pieza. CHECK no cuenta como mantenimiento. Calibración realizada en
OT sí puede contar como revisión/ajuste; no como reemplazo/falla. Los umbrales
de frecuencia no crean warning ni inferencia de reparación fallida.

Fecha de conclusión por fuente y fecha económica pueden diferir: frecuencia y
gasto no tienen que coincidir en periodo; cada gráfico indica cuál agrupa. Un
importe conocido no prueba conclusión de un servicio. Registros sin conclusión
acreditada no entran como concluidos por tener factura.

## 7. Fallos lógicos

| Condición | Respuesta esperada (sin imponer código HTTP) |
|---|---|
| Sin auth/scope | Denegar, sin datos de existencia/importes ajenos |
| Consulta/fecha/importe inválido | Error de validación por campo; sin escritura ni scope ampliado |
| Revisión o idempotencia incompatibles | Conflicto con referencia autorizada para revisar |
| Fuente falla | No disponible/parcial explícito; nunca completo con0 |
| Fuente atrasada | As-of visible y snapshot consistente; readiness sigue leyendo fuente live |
| Snapshot/cursor vencido | Refrescar consulta; no sustitución silenciosa |
| Conciliación pendiente | Importe parcial/nulo con causa, sin prorrateo oculto |
| Capacidad no definida | No habilitar operación, no conceder permiso por conveniencia UI |

## 8. Ejemplos de contrato para pruebas

| Caso | Resultado |
|---|---|
| Piezas propias4000 + mano de obra externa2000 que no incluye esas piezas | Conocido neto6000, sin mecánico interno |
| Factura proveedor8000 incluye pieza referenciada3000 ya registrada como compra externa | Contribución económica8000 una vez para ese conjunto, sin sumar3000; vínculo explícito |
| Monto10000 conocido sin sistema ni tipo históricos | Total10000, Sin desglose10000 y Sin clasificar10000 en sus dimensiones respectivas |
| Servicio pendiente y piezas4000, distancia200km válida | Conocido4000; conocido/km20 parcial, no costo total/km20 |
| Horario8h, downtime2h, viaje exclusivo3h, disponible demostrado3h | Total8h; utilización propuesta3/8=37.5%, sujeto a aprobar denominador |
| Misma configuración sin eventos en1h del disponible supuesto | Sin información1h; no inventar disponibilidad, ratio no definitivo por cobertura |
| No laborable configurado vs horario faltante | Denominador0/No aplica vs desconocido/No disponible |
| Fuente confirmada, actualización de gráfico falla | Mantener recibo; reporte actualización pendiente, sin segunda creación |
| Cambia instalación autorizada después de recibir snapshot | Reautorizar; snapshot previo no permite leer alcance ya no permitido |

No son resultados ejecutados. Mapear a SPEC AC08–33/36–41/43–48 y pruebas reales
de límites/rollback/concurrencia antes de aprobar el slice.

## 9. Cierre de diseño y readiness

Las tres decisiones operativas están confirmadas. El contrato técnico concreta
calendario/precedencia, catálogo/intervenciones, owner/puertos propuestos, HTTP,
persistencia, migración/rollback, retención, idempotencia y límites. Ya no son
una lista de temas sin alternativa definida. ADR030 y contrato técnico requieren
ratificación técnica antes de EWO; no implica permiso de implementar/deploy.
No ampliar seguridad ni owner de fuentes por conveniencia del reporte. Colores
de tipo están confirmados y no requieren otra elección estética.
