# SPEC-AN-MTTO-001 — Análisis de mantenimiento

## Estado / autoridad

### Autorización posterior

Approved para construir el alcance de EWO-063: el propietario indicó «After you
finish, go ahead and build, if there are pending decisions, pass them trough
grillme and do the recommendations». Incluye resolver decisiones técnicas
aplicando recomendaciones y registrar motivos; no requiere volver a pedir las
confirmaciones ya otorgadas. Los estados Proposed anteriores se conservan como
historia del diseño. Sin autorización implícita de producción/push/deploy.

**Proposed**. Fecha cliente2026-10-18. Dirección de producto confirmada en
GrillMe Q1–Q16; petición «okay, entonces, hazle spec» autoriza esta especificación.
Después el propietario acepta las recomendaciones para cerrar contratos:
Directivo configura horarios, utilización solo con cobertura completa y costo
externo reconocido al concluir. Esas decisiones ya no están pendientes.
No afirma implementación/despliegue ni aprueba ejecución. La ratificación técnica
descrita en §Cierre de decisiones y readiness debe completarse antes de
Approved/Ready y del EWO correspondiente. AC de esta SPEC son canónicos para
este incremento; UX concreta en [UX](../design-system/ux-analisis-mantenimiento-mock-v1.md).

Última revisión de contratos: invariantes y formas lógicas en
[AN-MTTO-001](../contracts/AN-MTTO-001-contract.md), Proposed. Ese documento
precisa intercambio/fallos y enumera validaciones pendientes; no es un contrato
HTTP/SQL aprobado. No presentar esta SPEC como lista para ejecutar por contar
con un contrato de lectura propuesto.

Diseño HTTP/persistencia completo para revisión en
[AN-MTTO-001-technical](../contracts/AN-MTTO-001-technical.md), con
[ADR030 Proposed](../adr/030-maintenance-analysis-contracts.md). Falta ratificación
técnica de esa opción y EWO acotado, no reabrir decisiones ya confirmadas.

Registro de esta revisión y límites:
[evidencia documental](../evidence/AN-MTTO-001-contract-review.md).

Cierre posterior con decisiones confirmadas y validación documental:
[evidencia de cierre](../evidence/AN-MTTO-001-contract-closure.md).

## Problema / contexto / objetivos

Consolidar una revisión semanal con tendencia mensual para Directivo y Supervisor:
identificar gasto elevado, explicar tiempo sin operar y planear mantenimiento/
refacciones a partir de tendencias por sistema. Presentar evidencia trazable,
sin convertir faltantes en cero ni sugerir causalidad no registrada.

Actualmente hay órdenes, piezas/costos, categorías de trabajo, km y viajes.
Servicio externo no equivale a compra externa de piezas. Faltan captura de
servicio externo general, atribución por sistema y reporting completo de
indisponibilidad. Ver [PRD](../prds/analisis-mantenimiento-v1.md) para evidencia.

## Alcance / no objetivos

Incluye las cuatro vistas, lectura/drill-down, captura económica externa,
clasificación de trabajos/costos, horarios versionados e identidad global de tipo.
Los ocho insights de discovery se distribuyen según §Vistas.

Excluye mano de obra interna, compras/OC/contabilidad, GPS/rutas nuevas, costo de
oportunidad estimado, ranking de mecánicos/choferes, ML, pronósticos de desgaste,
stock comprometido, inspección ampliada, edición de seguridad o autorizaciones
desde reportes. No modificar algoritmos de Salud/Andon ni sustituir Inventario.

## Actores / permisos

| Actor | Capacidad objetivo |
|---|---|
| SUPERVISOR | Consultar las cuatro vistas/horarios y registrar/completar servicio externo en su alcance; solicita ajustes de horario, sin edición |
| ADMIN_DIRECTIVO | Consultar, configurar horarios y corregir costos con motivo/preview en su alcance según contrato técnico |
| LOGISTICA | Conserva captura/paradas/liberación de sus flujos; esta SPEC no concede acceso al módulo ni elimina autoridad existente |
| MECANICO / otros | Sin nuevos permisos por esta SPEC |

Aplicar autenticación confiable y alcance de unidad/instalación en cada lectura,
agregado, detalle y escritura. Un gráfico no amplía scope. Horarios solo Directivo;
correcciones económicas según capacidad explícita del contrato, no inferir
capacidad desde visibilidad de botón o rol enviado por navegador.

## Vistas y jerarquía de información

### V1 — Resumen: dónde investigar esta semana

- Franja de síntesis: costo conocido sin IVA, pendientes de costear, tiempo en
  viaje observado y órdenes abiertas al corte. Utilización porcentual solo con
  horario/elegibilidad soportados. Cada magnitud indica periodo y cobertura.
- Tabla Unidades para revisar: identidad, costo conocido/parcial, correctivos,
  motivo observable y acceso a unidad/registros. Ordenación visible, inicialmente
  por costo conocido; no score opaco ni color de peligro por gasto alto.
- Evolución mensual del gasto por concepto, con mes parcial identificado;
  selección de mes abre Costos con ese periodo.
- Frecuencia por sistema en semana seleccionada; selección abre Tendencias.
- Alertas vencidas/riesgo real enlazan su fuente. No añadir nuevas alarmas o
  puntajes. Mantenimiento próximo disponible desde análisis de planeación.

### V2 — Utilización: qué explica el tiempo sin operar

- Horas y cobertura primero; porcentajes cuando exista denominador válido.
- Comparación por unidad y evolución temporal; categorías exclusivas de reporte:
  indisponibilidad de mantenimiento, otra indisponibilidad/retención, viaje fuera
  de indisponibilidad, disponible sin uso evidenciado, sin confirmar/sin información.
- Detalle por unidad muestra línea temporal, motivos y registros origen, con
  horarios y vigencia usados. Causas simultáneas mixtas visibles sin dividirlas
  arbitrariamente. No confundir tiempo de orden con trabajo efectivo o downtime.
- Configuración muestra horario general, excepciones por tipo/unidad, vigencias
  y periodos no configurados. Edición por capacidad que se acuerde en contrato.

### V3 — Costos: dónde se concentra el gasto

- Costo conocido neto y pendientes; impuestos y total consultables. Tendencia,
  ranking por unidad y costo/km condicionado a lecturas válidas.
- Cambiar desglose entre **tipo** Preventivo/Correctivo/Sin clasificar y
  **concepto** Refacciones/Servicios externos. Son dimensiones distintas; leyenda,
  título y detalle cambian juntos, sin confundir servicio externo con correctivo.
- Filtros por sistema, unidad/tipo y periodo; comparación entre unidades del
  mismo tipo con km/contexto visible. No usar gasto bruto para declarar eficiencia.
- Tabla subyacente muestra fecha efectiva, unidad, fuente, concepto, tipo,
  sistema, importe/cobertura y vínculo al registro autorizado.
- Refacciones de mayor gasto/consumo apoyan planeación; existencias/minimos son
  hechos actuales de Inventario, etiquetados como actuales si el periodo es pasado.

### V4 — Tendencias por sistema: qué se repite

- Frenos, llantas, suspensión/dirección y demás sistemas del catálogo aprobado.
  Separar revisión/ajuste, reparación y cambio; no llamar falla a toda intervención.
- Frecuencia de órdenes/servicios concluidos por sistema, costo atribuible,
  km entre reparaciones/cambios y evolución mensual con contexto por unidad.
- Cambiar frecuencia/costo y seleccionar tipo de trabajo sin cambiar significado
  de denominadores. Detalle permite revisar trabajos y consumos, no solo totales.
- Próximo mantenimiento: umbrales vigentes de km/días y último mantenimiento
  válido; mostrar vencido/próximo con criterio existente. No pronosticar fecha
  de falla ni inventar umbrales de recurrencia/alerta.
- Rutas, carga y pavimento son hipótesis humanas; no capturas nuevas ni
  conclusiones automáticas en v1. Una repetición no demuestra reparación defectuosa.

## Reglas comunes de consulta

1. Semana como unidad inicial de revisión y meses como contexto de tendencia.
   Selección explícita de rango y unidades/tipo; instalación según scope. Calendario
   operativo MexicoCity vigente de las fuentes, no reloj/zona del navegador.
   Semana propuesta lunes–domingo; debe ratificarse en el contrato de consulta.
2. Intervalos [inicio,fin), cortados al instante de consulta. No contabilizar futuro
   de semana/mes actual ni un retorno abierto hasta el final futuro del periodo.
3. Título/subtítulo de cada bloque indica alcance. Si gráfico muestra seis meses
   y tabla una semana, ambos lo dicen. Mes parcial no recibe comparación porcentual
   contra mes completo sin alcance comparable explícito.
4. Filtros compartidos se conservan entre vistas y al volver desde detalle;
   selección de barra/punto abre un desglose trazable. Restablecer vuelve al alcance
   inicial autorizado. Filtros sin datos no se convierten en total de toda la flota.
5. Ordenación, categoría de conteo y unidad monetaria/temporal visibles. No unir
   magnitudes de distintas revisiones de cálculo. Indicar corte y actualización.
6. No transformar error en vacío, cero o ausencia de incidentes. Agregado y detalle
   deben conciliar con idéntico scope, fechas, versiones y reglas de redondeo.

## Modelo funcional de costos y captura externa

### Costo conocido y cobertura

- `Costo conocido neto = refacciones consumidas reconocidas + servicios externos
  reconocidos`, después de retornos/correcciones válidos de sus fuentes y sin
  duplicaciones. Entradas/compras para stock no son gasto de mantenimiento hasta
  su consumo. Se excluye mano de obra interna.
- Sin IVA para comparación; impuestos y total separados. Moneda y precisión
  heredadas de Inventario (actualmente MXN). Sin mezclar divisas ni conversiones
  implícitas. Centavos exactos, no sumas monetarias con float.
  Neto conocido con IVA desconocido conserva neto, pero no permite presentar
  IVA0/total fiscal completo. Cobertura fiscal independiente de cobertura neta.
- Monto desconocido es Pendiente, no cero; monto cero solo si se confirma como
  tal con evidencia/justificación de fuente. Conteo pendientes junto a total.
- Costo clasificado por sistema + Sin desglose concilia al costo conocido.
  Sin clasificar por tipo concilia igualmente. No estimar importes faltantes.
- Costo/km usa costo neto conocido y distancia del mismo alcance temporal/unidad.
  Solo con lecturas suficientes, ordenadas y comparables; reinicio/retroceso/gap
  relevante de odómetro impide indicador definitivo. No usar último odómetro
  acumulado como distancia del periodo ni aproximar silenciosamente por visita.
  Flota: suma de costos / suma de km de cohorte compatible, no media de ratios;
  exponer exclusiones y no mezclar unidades sin km en el numerador del ratio.
  Si faltan costos o hay importes en conciliación, el ratio es costo **conocido**
  por km, parcial y con cobertura, nunca costo total/km definitivo. No comparar
  un ratio parcial con uno completo como prueba de eficiencia. Una fuente fallida
  no equivale a costo pendiente identificado y no permite ratio final.

### Registro del servicio externo

Supervisor registra desde la unidad, asociando orden/parada existente si hay;
no obliga a abrir una OT interna duplicada. Campos funcionales: unidad, proveedor,
fecha efectiva del servicio, tipo, sistema(s)/tipo de trabajo, monto con impuestos
o Pendiente, referencia y comprobante si están disponibles; actor/fecha captura
provienen de fuente confiable. Validación precisa del proveedor/adjunto en contrato.

Fecha de realización aportada con evidencia es un hecho económico; no equivale
a fecha de liberación operativa. Si solo se conoce el día, conservar precisión
de día en calendario de negocio, sin inventar un instante para el ledger. Servicio
futuro/no realizado no se presenta como gasto realizado. Trabajo de varios días
se reconoce íntegro en fecha de conclusión económica acreditada, no por días:
30oct–2nov pertenece a noviembre; piezas propias conservan fecha de consumo.
Esto no finaliza una parada ni sustituye la liberación por Logística.

Tipo heredado de orden vinculada cuando exista; captura directa solicita
Preventivo/Correctivo. Históricos sin evidencia quedan Sin clasificar. Un servicio
externo puede ser preventivo. No clasificar por proveedor/origen de pieza.

Para múltiples sistemas, líneas de costo explícitas o Sin desglose. Suma de líneas
reconcilia neto/impuestos/total del servicio; no prorrateo automático por cantidad
de trabajos. Clasificación de piezas por sistema requiere vínculo explícito o
regla validada, nunca asignación arbitraria a todos los sistemas de la orden.

### Piezas incluidas y no duplicación

- Proveedor suministra piezas incluidas: total de servicio ya las incluye;
  registros de pieza vinculados no vuelven a sumar ese componente monetario.
- Empresa suministra piezas: suma su consumo reconocido más el servicio de
  proveedor, que excluye esas piezas. No convertir servicio en movimiento de stock.
- Factura/registro mixto sin importe separable y posible duplicación: no descontar
  cantidades estimadas ni publicar total definitivo. Resolver vínculo/desglose
  mediante revisión del propietario, mostrando pendiente de conciliación y la
  parte conocida no duplicada. Representación técnica pendiente de contrato.
- Identidad estable del registro y reintentos: misma operación no duplica gasto;
  referencia de factura no es por sí sola identidad universal (factura multiunidad).

### Fecha y revisiones

Servicio se atribuye al periodo de conclusión de su realización, no al pago ni al ingreso tardío.
Refacciones conservan fecha efectiva de consumo de su propietario; no redatar
todo al cierre de orden. Captura en noviembre de servicio realizado en octubre
actualiza octubre y conserva captura/actor/revisión. No reescribir silenciosamente
el snapshot usado por un detalle abierto; informar actualización o refrescar
coherentemente. Costos pendientes pueden completarse después del fin del servicio.
Correcciones conservan original, actor, fecha y motivo por la capacidad vigente.

## Horarios, indisponibilidad y utilización

### Horarios con vigencia

Horario general con días/franjas, excepción por tipo y excepción por unidad.
Precedencia propuesta para contrato: unidad > tipo > general. Mostrar la regla
resuelta. Franjas nocturnas se parten en sus días; uniones no duplican minutos.
Rechazar intervalos/solapes de reglas de igual prioridad que hagan ambigua la
configuración. No hay horario por defecto inventado, ni 24/7 tácito.
Una regla válida que declara día no laborable es distinta de ausencia de horario.
La primera aporta duración esperada cero; la segunda es información desconocida.
Cambios futuros no modifican historia. Corrección retrospectiva, si se habilita,
requiere justificación y procedimiento auditado del propietario, no guardar normal.

### Reconciliación con SPEC-UTIL-INPUTS-001

F6 de la spec anterior conserva reportes de horas/elegibilidad histórica activa;
no se reemplaza su denominador silenciosamente. Q11/Q13 añaden aquí un indicador
distinto: **Utilización en horario esperado**. La definición técnica propuesta es:

- Denominador: unión de horario esperado aplicable ∩ elegibilidad histórica
  demostrada de la unidad/instalación ∩ periodo transcurrido consultado.
- Numerador: tiempo en viaje fuera de indisponibilidad, intersectado con ese
  denominador. Las horas de viaje fuera del horario se muestran aparte y no
  inflan la utilización por encima de100%.
- Horario desconocido, elegibilidad/sitio desconocidos o denominador cero:
  sin porcentaje definitivo; mostrar horas observadas/cobertura/no evaluado.
- Si hay historia incompleta dentro de denominador conocido, mostrar horas sin
  clasificar y declarar cobertura parcial; no inferir disponibilidad ni publicar
  porcentaje. Decisión confirmada: utilización porcentual solo con cobertura
  temporal100% del alcance solicitado; sin excluir unidades incompletas en silencio.
- Flota: suma de numeradores / suma de denominadores válidos de la misma cohorte,
  excluidos identificados, nunca promedio simple de porcentajes.

Estas fórmulas son propuesta verificable, no una decisión arquitectónica ya
aprobada. Requieren validar enmienda/contrato previo al EWO. ADR025/F6 siguen
gobernando la evidencia temporal y autoridad de las causas.

### Intervalos y seguridad

Unir indisponibilidad una vez por unidad; prioridad downtime, viaje fuera de
downtime y patio evidenciado (disponible/retenido/no confirmado). Motivos mixtos
se muestran mixtos; no repartirles a cada uno la duración total y luego sumarla.
Una avería real en viaje puede solaparse con viaje fuente: conservar evidencia,
sin duplicar tiempo en totales exclusivos. Un regreso faltante no se inventa.
No tomar createdAt/tiempo de orden como inicio histórico de indisponibilidad.

Viaje registrado por Logística conserva esa procedencia: sus extremos prueban
la acción operativa registrada, no salida/entrada física ni motor/productividad.
Flota aporta custodia física independiente. No renombrar horas de viaje
registrado como horas productivas ni exigir igualdad entre ambos ciclos.

Una orden cerrada no resuelve otros motivos ni verificaciones de seguridad.
Guardar/finalizar costo externo no termina paro ni autoriza salida. No mutar
estado físico, readiness, viaje, administrativo o stock desde consulta analítica.

## Conteos, sistemas y planeación

- Tipos: Preventivo/Correctivo de fuente canónica; CHECK/Revisión excluido de
  conteo de mantenimiento realizado y resets de cadencia por su sola conclusión.
  No convertir un CHECK en mantenimiento porque detectó un hallazgo.
- Frecuencia por sistema: órdenes de mantenimiento/servicios externos concluidos
  que contienen ese sistema, una vez por identidad y sistema; no una vez por pieza.
  Una orden con dos sistemas participa en ambos; suma por sistema puede superar
  total de órdenes y se explica. Orden interna y servicio vinculado que representan
  la misma intervención no generan dos intervenciones por simple vínculo.
  Sin vínculo explícito no colapsar por unidad/fecha/sistema coincidentes. Una
  orden puede tener trabajos de tipos distintos; la frecuencia por cada tipo
  cuenta esa intervención una vez, no piezas. No sumar subtotales no exclusivos
  como si fueran total de intervenciones únicas.
- Revisión/ajuste, reparación y cambio son clasificación de trabajo distinta de
  Preventivo/Correctivo. Catálogo actual debe ampliarse, especialmente llantas;
  no convertir Calibración y rotación en supuesto cambio de neumático.
- Km entre intervenciones: pares cronológicos por unidad, sistema y tipo de
  trabajo seleccionado con lecturas válidas en eventos comparables. Sin pares,
  Sin datos suficientes. No reportar vida útil de pieza individual sin identidad
  trazable de pieza/posición, fuera de v1.
- Recurrencia se explora por periodo/eventos; no umbral de mala reparación ni
  estado de riesgo nuevo. Salud, vencimientos y stock son proyecciones de sus
  propietarios; se enlazan sin recalcular su significado.

## Identidad visual e interacción

Preventivo **#2F5BB8**, Correctivo **#C45D23** siempre que se visualice ese tipo,
en toda la aplicación (cola, detalle, ficha, historial y gráficas). Fondos suaves
para etiquetas, color de serie en chart, texto/leyenda siempre. Sin clasificar
neutral. Color de tipo no comunica criticidad; filtros conservan selección neutra.
Canónico: [contrato visual](../design/DESIGN_SYSTEM.md).

Gráficos: seleccionar serie/mes/sistema abre registros o vista filtrada; leyenda
activable, tooltips por mouse/foco/toque y alternativa tabular. No depender de
hover/color. Navegación/historial preservan consulta. Recharts es recomendación
de diseño, no aprobación de instalar dependencia/versión.

UI: Roboto, navy/naranja oficiales, sin sombras/gradientes y densidad compacta.
Desktop secciones en sidebar, no tabs duplicados; móvil patrón vigente con
acceso por menú y selector contextual propuestos en UX. No migrar otros módulos.
1440/1024/800/390 y smoke320 en implementación; targets44móvil, foco y overlays
sin recorte, motion funcional150–250ms/reduced0. Mock no prueba estas propiedades.

## Transiciones de estado

| Hecho | Efecto permitido |
|---|---|
| Crear servicio con costo pendiente | Registro trazable y pendiente visible, no importe cero ni cierre de paro |
| Completar importe | Versión auditada, recalcular periodo efectivo y cobertura |
| Corregir importe/clasificación autorizada | Conservar original/motivo; invalidar proyección afectada coherentemente |
| Concluir servicio por su propietario | Actualizar finalización según contrato; no exige costo conocido |
| Configurar horario futuro | Nueva vigencia; historia previa conservada |
| Cambiar filtro / seleccionar gráfico | Solo lectura/navegación; sin mutaciones operativas |

## Fallos y estados UX

| Estado | Comportamiento |
|---|---|
| Carga | Cargando análisis…; no números de ejemplo, controles ocupados coherentes |
| Sin registros | Explicar alcance/periodo vacío, permitir cambiar filtros |
| Sin coincidencias | Explicar filtro y ofrecer Restablecer, sin ampliar scope automáticamente |
| Fuente falla | Error por bloque y Reintentar; total incompleto identificado, nunca cero válido |
| Datos anteriores | Fecha/revisión visible; no mezcla silenciosa con cifras nuevas |
| Costo pendiente | Conteo/motivo cerca del total parcial; completar desde capacidad permitida |
| Sin horario/km/clasificación | Métrica no disponible o categoría neutral; no interpolación oculta |
| Guardado ambiguo/reintento | Consultar resultado original por identidad, no crear duplicado |
| Versión cambió | Conflicto visible y recarga/revisión, sin sobrescribir corrección concurrente |
| Sin permiso/scope | Rechazar sin filtrar existencia/importes de otras instalaciones |

## Restricciones y límites técnicos

- Mantener monolito modular, propietarios y ports; sin nuevos BC/schema ni
  JOIN/FK cruzados. Proyección de lectura integra hechos autorizados y versionados.
- Mantenimiento conserva trabajo/ledger; Logística conserva paradas/liberación;
  Inventario conserva consumo/valoración. Esta SPEC no decide quién almacena
  servicios/horarios nuevos: contrato explícito antes de implementación.
- Consultas acotadas por periodo/scope, paginación de detalle y agregados en
  servidor; no descargar toda la historia al navegador. Rango máximo, volumen,
  latencia, estrategia de refresco y concurrencia se fijan como readiness inputs,
  no promesas de performance inventadas.
- Preservar rutas/consultas Inventario, navegación existente, Salud/Andon y
  dual-stack notify. No ampliar permisos por consulta de datos económicos.
- Correcciones no reescriben evidencia firmada ni decisiones históricas de
  autorización. APIs/esquema/migraciones no definidos ni ejecutados aquí.

## Acceptance Criteria — fuente canónica

Cada fila define Given / When / Then; los EWOs referencian estos IDs.

| ID | Dado / cuando | Entonces |
|---|---|---|
| AC-01 | Supervisor o Directivo autorizado abre Análisis | Accede a las4vistas con scope conservado; otro rol no recibe capacidad nueva |
| AC-02 | Consulta con fechas/unidades y retorno desde detalle | Filtros, periodo y ordenación se conservan; Restablecer es explícito |
| AC-03 | Semana actual y contexto mensual | Cada bloque muestra periodo/corte; meses parciales identificados y futuro excluido |
| AC-04 | Resumen con costo faltante o sin horario | Muestra conocido, pendientes, horas y cobertura; sin porcentaje de utilización si cobertura temporal incompleta ni cero ficticio |
| AC-05 | Selección de mes, sistema o unidad | Abre registros/vista del alcance correcto y permite volver sin perder contexto |
| AC-06 | Consulta de tipo en cualquier superficie de app | Preventivo azul#2F5BB8/Correctivo terracota#C45D23 con texto; atraso/criticidad aparte |
| AC-07 | Alternar desglose tipo/concepto | Cambian título/leyenda/datos coherentes; Refacciones no equivale a Preventivo ni Externo a Correctivo |
| AC-08 | Consumos, compra de stock y servicios coexistentes | Gasto incluye consumos+servicios reconocidos; no compras para stock ni mano de obra interna |
| AC-09 | Fuente con neto/impuestos y monto pendiente | Sumas exactas en centavosMXN, desglose fiscal y pendiente distinto de cero; sin divisas mezcladas |
| AC-10 | Supervisor registra externo sin OT interna | Vincula unidad y datos obligatorios, no crea OT artificial ni movimiento de stock |
| AC-11 | Externo ligado a orden o capturado directo | Hereda tipo de orden o solicita selección; histórico sin evidencia queda Sin clasificar |
| AC-12 | Servicio de varios sistemas | Líneas reconcilian total o Sin desglose visible; no distribución arbitraria |
| AC-13 | Piezas de proveedor incluidas y ya referenciadas | Componente económico se suma una vez; vínculo/desglose verificable |
| AC-14 | Empresa aporta pieza y proveedor cobra servicio | Se suma consumo propio+servicio excluyente; no descuenta otra vez esa pieza |
| AC-15 | Posible duplicación sin importe separable | No total definitivo ni resta estimada; pendiente de conciliación explícito |
| AC-16 | Repetición de mismo comando o revisión concurrente | Sin duplicar gasto; identidad/revisión comprobadas, conflicto no sobrescribe |
| AC-17 | Servicio octubre capturado/completado noviembre | Actualiza octubre, conserva captura/actor/revisión y refresca reportes coherentes |
| AC-18 | Guardar/completar costo externo | No concluye servicio/paro, no libera unidad ni altera safety gates |
| AC-19 | Corrección de costo autorizada | Original/motivo auditables y agregado/detalle comparten revisión tras recalcular |
| AC-20 | Piezas de orden con múltiples sistemas | Atribución explícita o Sin desglose, sin duplicar todo el gasto en cada sistema |
| AC-21 | Odómetros faltantes, retroceso, distancia0 o periodo incompatible | Costo/km no definitivo; motivo y exclusiones visibles, sin división inválida |
| AC-22 | Ratio flota con cohortes válidas | Razón de sumas compatibles; no media simple ni numerador de unidades excluidas |
| AC-23 | Horario general y excepciones con vigencia | Regla resuelta inequívoca según contrato; solapes ambiguos rechazados |
| AC-24 | Horario nuevo futuro/no configuración | No cambia historia; sin configuración no supone24/7 ni porcentaje definitivo |
| AC-25 | Intervalos nocturnos/mes parcial/corte | Unión y clipping [inicio,fin) por calendario fuente, sin minutos duplicados/futuros |
| AC-26 | Tiempo en viaje fuera de horario esperado | Se informa aparte; no infla numerador horario ni porcentaje>100% |
| AC-27 | Indisponibilidad y viaje solapan genuinamente | Fuentes preservadas, totales exclusivos sin doble conteo; causas mixtas identificadas |
| AC-28 | Regreso/facility/elegibilidad histórica desconocidos | No se fabrica intervalo ni disponibilidad; cobertura no evaluada explícita |
| AC-29 | Orden creada/abierta heredada sin evidencia temporal | No se retrodata downtime por createdAt ni se usa duraciónOT como trabajo efectivo |
| AC-30 | Mantenimiento acaba pero quedan otros motivos/retenciones | Reporte conserva motivos independientes; no representa unidad libre automáticamente |
| AC-31 | Orden con dos sistemas/varias piezas y externo ligado | Cuenta una intervención por identidad+sistema, no por pieza ni doble por vínculo |
| AC-32 | CHECK completo y calibración concluida en orden de mantenimiento | CHECK no cuenta como mantenimiento; calibración sí puede contar como revisión/ajuste, sin convertirla en falla o cambio |
| AC-33 | Pares de intervenciones con/sin km válidos | Distancia por unidad+sistema+trabajo; sin pares no inventa promedio ni vida útil de pieza |
| AC-34 | Tendencia repetida o gasto elevado | Presenta evidencia sin atribuir causa/riesgo nuevo; Salud/Andon conservan lógica |
| AC-35 | Próximo mantenimiento/refacción de alto consumo | Umbrales/stock del dueño y fecha de referencia visibles, sin pronóstico o reserva inventados |
| AC-36 | Usuario sin scope intenta agregado/detalle/escritura | Rechazo server-side sin filtración ni permiso heredado del gráfico |
| AC-37 | Error parcial, vacío, carga y retry | Estados distintos y recuperables; sin error convertido en cero/dato normal |
| AC-38 | Ratios/totales de resumen y detalle misma revisión | Conciliación verificable, Sin clasificar/Sin desglose incluidos y parciales visibles |
| AC-39 | Interacción por mouse/teclado/toque | Tooltip/selección con alternativa tabular, leyenda accesible, sin depender del color/hover |
| AC-40 | Desktop y móvil según UX | Shell/escala/semántica consistentes, targets/foco/scroll local y overlays sin recorte |
| AC-41 | Escritura confirmada y proyección se retrasa/falla | Registro fuente y recibo permanecen; reporte declara actualización pendiente o último snapshot, sin revertir fuente ni mezclar versiones |
| AC-42 | Incremento llega a implementación | AC mapeados a suites reales, gates UI y evidencia PASS/FAIL/SKIPPED; mock no equivale a proof |
| AC-43 | Reporte usa viajes Logística y custodia Flota | Procedencias distintas visibles; no se afirma movimiento físico ni productividad desde viaje operativo |
| AC-44 | Detalle se solicita con snapshot vencido o fuera de scope actual | Rechazo/refresco explícito; sin mezclar revisión ni revelar datos por conservar cursor viejo |
| AC-45 | Día no laborable configurado y periodo sin horario | Primer caso esperado0/sin ratio por denominador0; segundo caso desconocido, nunca equivalentes |
| AC-46 | Km válido y costo pendiente o en conciliación | Solo costo conocido/km parcial con cobertura, no costo total/km ni comparación definitiva |
| AC-47 | Orden y externo coinciden en fecha/sistema, con/sin vínculo explícito | No doble conteo cuando representan una intervención probada; sin evidencia no se fusionan automáticamente |
| AC-48 | Servicio con fecha de día o factura distribuida entre unidades | Sin instante operativo inventado; asignaciones monetarias explícitas suman factura sin fuga de scope ni doble importe |
| AC-49 | Directivo configura horario y Supervisor intenta editarlo | Directivo autorizado dentro de scope; Supervisor solo lectura/solicitud por canal existente, sin permiso de escritura |
| AC-50 | Servicio30oct–2nov y pieza propia consumida30oct | Servicio en noviembre por conclusión; pieza en octubre por consumo; sin prorrateo ni efecto de liberación |
| AC-51 | Cobertura temporal99.9% o unidad del alcance con horario desconocido | Utilización porcentual null, horas/cobertura visibles; solo100% y denominador positivo permiten porcentaje |
| AC-52 | Consumo con neto conocido y money/IVA ausente | Neto conserva valor; IVA y total fiscal completos null con motivo, nunca IVA0 inventado |

## Trazabilidad y verificación de EWO-063

Implementación local autorizada y pruebas en [evidencia EWO-063](../evidence/EWO-063.md).
La evidencia distingue lo implementado de la capacidad objetivo que necesita nuevas fuentes.

| AC | Resultado actual |
|---|---|
|01–07,36| Roles/scope, snapshots, navegación y filtros probados; no cada combinación de filtros |
|08–22,38,41| Costos/servicios/conciliación implementados y probados; importador LEGACY no incluido |
|23–30| Reglas y cobertura nula probadas; ledger de motivos e historia de elegibilidad ausentes. No se afirma implementación de esa historia |
|31–35| Frecuencias/atribución/planeación con fuentes actuales; pares solo con evidencia comparable, sin inferencia causal |
|37,39–40| Proof CDP y auditoría visual independiente OK para capturas; no certificación exhaustiva de accesibilidad |
|42| EWO autorizado y evidencia de ejecución local; sin despliegue |
|43–48| Procedencia/scope/snapshot/versiones y concurrencia probados; histórico inexistente no reconstruido |
|49–52| Horarios por rol, corte económico, cobertura e IVA desconocido probados en reglas/integración |

Los fixtures temporales de paradas simultáneas, elegibilidad y estado administrativo
histórico siguen dependiendo del ledger ABC/UTIL. No se sustituyen por duración de
OT, ausencia de viaje o estado físico actual. El estado funcional de Utilización
es horas registradas y cobertura faltante, con porcentajes nulos.

## Dependencias / impacto

- PRD: [análisis](../prds/analisis-mantenimiento-v1.md); UX y
  [discovery](../../workspace/discovery/maintenance-analysis-grillme.md).
- [SPEC-UTIL-INPUTS-001](SPEC-UTIL-INPUTS-001.md),
  [ABC](ABC-daily-release-spec-and-gap-analysis.md),
  [contrato propuesto ABC/UTIL](../contracts/ABC-UTIL-001-contract.md),
  [viajes](../contracts/LOG-JOURNEY-001-contract.md).
- [AN-MTTO-001](../contracts/AN-MTTO-001-contract.md): invariantes y formas
  lógicas de consulta/costo/configuración; Proposed, no endpoints aprobados.
- [Contrato técnico](../contracts/AN-MTTO-001-technical.md) y
  [ADR030](../adr/030-maintenance-analysis-contracts.md): opción concreta de
  persistencia/API/owner propuesta para revisión, sin cambios de runtime.
- ADR001/002: cierre/outbox y ownership; ADR025: motivos/seguridad; ADR027:
  viajes durables; ADR003 y contrato visual: presentación. No reescribir ADRs.
- Áreas: [Mantenimiento](../../domain/mantenimiento/CONTEXT.md),
  [Inventario](../../domain/inventario/CONTEXT.md),
  [Logística](../../domain/logistica/CONTEXT.md); Flota/Kernel/Salud/Andon solo
  como fuentes por capacidades existentes. Sin declarar bounded context nuevo.
- Datos/migraciones/API: nuevos hechos de servicio, clasificaciones y horarios
  requieren diseño/contrato, versionado y migraciones controladas. No se crean aquí.
- UI: módulo nuevo y adopción transversal de colores; requiere cortes acotados,
  no refactor global silencioso. Mocks previos representan conceptos de costo y
  no prueban adopción de la paleta de tipo. Sin cambios de runtime en este corte.

## Cierre de decisiones y readiness

| Tema | Resolución / estado |
|---|---|
| Cobertura | Confirmado: porcentaje solo100%temporal, horas cuando parcial; denominador esperado separado de F6 |
| Horarios | Confirmado: Directivo configura, Supervisor consulta/solicita; diseño unidad>tipo>general, overrides de fecha y vigencia sin retroactividad |
| Multiday | Confirmado: conclusión económica del servicio, consumo propio conserva su fecha |
| Owner/servicio | ADR030 propone Mantenimiento; autoridad Logística para liberación intacta, ratificación técnica pendiente |
| Factura/piezas/IVA | Claims y asignaciones explícitas, neto/fiscal separados en contrato técnico, sin modificar stock |
| Catálogo | A–E/legacy preservados, kind explícito, nuevas reparación/cambio de llanta, versionado sin recodificar pasado |
| Calendario/km | Semana ISO, MexicoCity, lecturas de fronteras compatibles, sin interpolación; identidad por vínculo de trabajo/evidencia |
| API/persistencia/performance | DTO/rutas/errores/tablas/límites/rollback/refresh definidos para revisión en contrato técnico |

No quedan las tres preguntas operativas anteriores. Antes de Approved/Ready,
ratificar ADR030 y contrato técnico del slice, comprobar compatibilidad de los
puertos y aprobar EWO. No llamar Approved a arquitectura propuesta por el solo
hecho de haberse autorizado su diseño. No reabrir decisiones ya confirmadas.
Riesgos principales: atribución arbitraria, costo/tiempo duplicado, falsa cobertura,
desfase de versiones y confundir tipo con urgencia. Esta SPEC los hace explícitos;
no presenta las capacidades futuras como desplegadas.
