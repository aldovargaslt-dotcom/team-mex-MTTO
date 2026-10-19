# AN-MTTO-001 — Diseño técnico v1 para revisión

## 0. Estado y decisiones

Autorización posterior: aceptado para construcción local EWO-063 por instrucción
del propietario «After you finish, go ahead and build… do the recommendations».
Los rótulos Proposed siguientes conservan la historia, no retienen esa ejecución.
Decisiones de implementación se registran en EWO/evidencia; no producción/deploy.

**Proposed técnico completo**, fecha cliente2026-10-18. No endpoints/tablas
existentes ni permiso de ejecutar migraciones. Implementa como diseño las reglas
de [SPEC](../specs/SPEC-AN-MTTO-001.md),
[contrato funcional](AN-MTTO-001-contract.md) y
[ADR030 propuesto](../adr/030-maintenance-analysis-contracts.md).

Decisiones del propietario confirmadas: Admin configura horarios y Supervisor
consulta/solicita ajuste; no porcentaje de utilización con cobertura incompleta;
servicio externo de varios días se reconoce económicamente al concluir. Piezas
propias mantienen fecha de consumo. No imputar a mes de pago/captura.

Decisiones técnicas seleccionadas para revisión, ya concretas en este documento:
semana ISO lunes–domingo, `America/Mexico_City`, excepción unidad>tipo>general,
catálogo versionado A–E, almacenamiento Mantenimiento, endpoints bajo
`/analisis-mantenimiento`, snapshot15min, rangos366días y paginación100máx.
No son preguntas de producto pendientes ni aprobaciones de arquitectura implícitas.

## 1. Capacidades y fronteras

| Operación nueva | SUPERVISOR | ADMIN_DIRECTIVO | LOGISTICA / MECANICO |
|---|---|---|---|
| Consulta/snapshot/detalle/catálogo/horarios | Sí, scoped | Sí, scoped | Sin capacidad nueva |
| Alta externo y completar costo pendiente | Sí, scoped | Sí, scoped | Sin capacidad nueva |
| Corregir costo conocido, fecha o clasificación confirmada | No; solicita a Admin por canal existente | Sí, motivo+preview+revisión | Sin capacidad nueva |
| Crear/reemplazar horario o catálogo activable | No; consulta y solicita por canal existente | Sí, scoped y auditado | No |
| Finalizar parada o liberar unidad | Sin capacidad desde este módulo | Sin capacidad desde este módulo | Flujos propietarios existentes intactos |

No crear workflow de solicitudes/notificaciones por esta tabla. Para solicitud
de ajuste se reutiliza proceso humano; no inventar bandeja nueva. La capacidad
se valida con TrustedActor/FacilityResourceReadPort antes de leer datos o recibos.
Actor/instalación efectiva se resuelven en servidor; `X-Role` no autoriza escritura.
Vínculo a otra instalación/unidad/orden se rechaza; Admin no implica scope global.

### Puertos propuestos (lectura, no JOIN cruzado)

| Puerto | Respuesta mínima scoped/versionada |
|---|---|
| InventoryMaintenanceCostReadPort | opId,version,kind,unidadId,visitaId,itemId,qty,sourceId,effectiveAt,netCents,money?,coverage; CONSUMPTION/EXTERNAL/RETURN |
| MaintenanceOrderFactsReadPort | orderId,version,unit,facility,type,lifecycle,completedAt,work facts,km y procedencia |
| LogisticsJourneyReadPort | journeyId/revision,origen,captureId,extremos y gaps de LOG-JOURNEY-001 |
| MaintenanceDowntimeReadPort | segmentos/revisiones/motivos del ledger de su owner, no createdAt de OT |
| FleetEvidenceReadPort | custodia física y km con identidad/fecha/procedencia |
| UnitHistoryReadPort | identidad y segmentos demostrables de tipo/elegibilidad/facility; unknown cuando falta historia |
| MaintenancePlanningReadPort | último mantenimiento/umbrales válidos/avisos y fuente; no recalcula Salud/Andon |

Cada puerto recibe actor/scope, rango y cursor de fuente. Scope actual restringe
acceso e historia; historia desconocida no se completa con valores actuales.
No considerar existente un puerto por nombrarlo aquí; adapter y tests son parte
del slice correspondiente. Fuentes con solo neto no inventan money/IVA.

Captura de fuente: el adapter abre lectura REPEATABLE READ de su propio owner y
exporta manifest inmutable (refs/versiones/hash/cutoff/scope) y páginas del mismo
snapshot de fuente. Lectura aborta si excede30s o100000hechos por fuente/consulta;
422 QUERY_TOO_LARGE con indicación de reducir rango, sin publicar captura truncada.
Sin transacción global: verificar referencias/versiones entre manifests; vínculo
faltante o cambiado hace parcial/reintenta, no mezcla versiones como completo.
Son límites de seguridad del diseño; validar carga real en rehearsal. El contrato
de cada adapter debe mantener snapshot durante sus páginas, nunca paginar rows
live con un supuesto watermark de updatedAt global que no existe.

## 2. Tipos y validaciones comunes

- IDs UUID; versiones enteros positivos como strings decimales JSON. Dinero
  string de centavos: regex de `cost-rules.ts`, 1–16dígitos, rango explícito; MXN
  únicamente. Duraciones en segundos enteros, distancias km de fuente y precisión
  declarada. Sin floats monetarios.
- `maintenanceType`: PREVENTIVE/CORRECTIVE. UNKNOWN solo proyección de legacy.
  Colores UI #2F5BB8/#C45D23; nunca status crítico por tipo.
- `workKind`: REVIEW_ADJUSTMENT/REPAIR/REPLACEMENT; UNSPECIFIED solo histórico.
  `system`: A/B/C/D/E del catálogo; null en cobertura Sin desglose.
- Fechas económicas `YYYY-MM-DD`, fechas de servidor UTC ISO8601 con offset.
  Día de conclusión económico <=hoy local; comienzo opcional <=conclusión.
  Prohibido fabricar timestamptz de downtime desde un día económico.
- Strings: proveedor nombre1–160, referencia0–200, nota0–1000, motivo1–1000,
  normalizados trim; rechazar desconocidos en DTO de escritura.
- `money`: estado PENDING sin campos de importe, o RECORDED con inputTotalCents,
  taxMode INCLUDED/EXCLUDED, taxTreatment TAXED/NO_TAX, rateBps0–10000, MXN.
  Reutilizar calculateCost/redondeo; cero requiere `zeroReason` no vacío.
- Límite100líneas/trabajos por comando y100unidades explícitas por filtro;
  selección Todas se resuelve en servidor paginado, no enumera IDs en navegador.
- Documento: referencia opcional; evidencia adjunta se guarda por puerto privado
  ya establecido, no URL pública/base64 en DTO. Solo objeto verificado y dentro de
  scope, hasta5archivos por servicio de10MiB, formatos PDF/JPEG/PNG, acceso firmado
  scoped y corto. Son límites de diseño, no cambiar políticas CHECK existentes.

## 3. Servicio externo y fecha económica

Registro `ExternalService` = una unidad, una fecha económica de conclusión, uno o
más trabajos. Campos: id,version,unitId,facilityId resuelto,orderId?/stopRef?,
providerName y supplierRef? validado,startedOn?,performedOn,maintenanceType,
workLines[],costLines[],documentRef?,attachmentRefs[],registeredAt/By.

Excepción de importación LEGACY: fecha/tipo/proveedor faltantes se conservan null/
UNKNOWN con gapReason y referencia de evidencia, sin cumplir artificialmente
los campos de NEW. Servicio sin fecha no se asigna a un mes; se informa como
histórico sin periodo evaluable en cobertura, sin inventar gasto del rango.

Alta exige evidencia/declaración de trabajo ya realizado y fecha de conclusión;
no registra cotización/anticipo como gasto realizado. Si se vincula a parada aún
no finalizada, la declaración económica NO la finaliza ni autoriza salida. Si
Logística confirma conclusión después con otra fecha, no sobreescribir: mostrar
discrepancia y revisión Admin. Fecha física/operativa independiente.

`performedOn` es conclusión económica confirmada por Supervisor. Para un servicio
30oct–2nov, costo externo íntegro2nov; no prorratear por días. Consumo propio30oct
conserva30oct. Registro tardío conserva registeredAt. Nuevo servicio directo
exige tipo; con OT hereda su tipo+versión, sin override. Costos pueden quedar
PENDING, sin bloquear registro ni finalización operativa por su propietario.

Cada workLine tiene id estable,system,workCode,workKind,orderWorkRef? y
interventionId. Crear intervención propia por defecto. Solo un enlace explícito
a trabajo de OT existente permite compartir interventionId. Misma fecha/unidad
no fusiona. Conclusión analítica de ese trabajo externo deriva de performedOn;
OT usa su fecha de conclusión. Conflicto entre conclusiones compartidas requiere
revisión, no escoger fecha arbitraria ni doble frecuencia.

Cada costLine tiene id,money,system? y workRef?; al menos una línea (puede PENDING).
Total reconocido = suma de líneas conocidas sin duplicación, con pendientes
separados. `system=null` significa Sin desglose y conserva importe. No hay total
independiente editable que pueda divergir de líneas. Registrar un total sin
desglose se representa como una línea; dividirla requiere sustituir atómicamente
su versión, no sumar líneas nuevas además del total anterior.

## 4. Componentes incluidos, impuestos y retornos

Modo de componente por línea: SERVICE_ONLY, SUPPLIER_PARTS_INCLUDED o COMPANY_PARTS.
Default no inferido: Supervisor lo declara. Una línea mixta se divide explícitamente
o queda PENDING_RECONCILIATION. No porcentajes estimados.

SUPPLIER_PARTS_INCLUDED puede vincular operaciones de tipo EXTERNAL de Inventario
que documentan esas piezas del proveedor. No vincular CONSUMPTION de almacén como
si proveedor las hubiera suministrado; esa contradicción exige conciliación.
Claim por sourceOpId+quantityRange, unidad, serviceLineId y versión comprobada de
fuente; intervalos enteros de cantidad [from,to) no solapan entre claims activos.
Claims suprimen únicamente contribución monetaria duplicada de esa pieza en la
proyección. No mutan stock ni operaciones financieras de Inventario.

Todas las unidades del sourceOp deben estar cubiertas para excluir su contribución
completa; cantidad parcial usa reparto proporcional exacto del owner con absorción
de residuo, nunca promedio visual redondeado. Si no hay dato suficiente para
separar importes, conjunto en conciliación y total no definitivo. Históricos sin
qty/evidencia no reciben claims automáticos. Cambiar sourceOp.version invalida
captura del claim y recalcula; si evidencia deja de ser válida se marca conflicto.

COMPANY_PARTS referencia consumo propio por trazabilidad, pero no lo excluye:
neto total = consumo+servicio que no incluye piezas propias. Devoluciones RETURN
se restan por su source/effectiveAt, conservando tipo monetario positivo en
fuente y signo negativo de contribución al gasto. No inventar un abono externo;
servicio mal capturado se corrige por revisión Admin, sin eliminar historia.

Agregados de periodos pueden ser negativos por retornos válidos de consumos de
otro periodo: serializar suma con signo, no aplicar regex de importe de alta al
agregado ni truncarlo a0. Gráfico admite eje negativo y detalla ajustes/retornos;
un ratio neto negativo no se interpreta automáticamente como mayor eficiencia.

Factura multiunidad: `documentGroupId` opcional con asignaciones identificadas a
costLines; importe global y asignaciones suman net/tax/gross en centavos. Solo
usuario con scope de todas las asignaciones puede crear/cambiar grupo; resto ve
su asignación, no total ajeno. Referencia libre no crea unicidad entre proveedores.
Reparto explícito; diferencias rechazan command completo, sin asignar residuo a
otra unidad silenciosamente.

**Cobertura fiscal independiente:** Inventario puede exponer netCents conocido
con money=null (consumo valorado). netKnown sigue siendo conocido; taxKnown y
grossKnown son null si no hay evidencia fiscal para ese componente. No usar
IVA0 ni asumir tasa16%. Solo `gross = net+tax` cuando cobertura fiscal completa.
Reportes muestran cobertura monetaria/fiscal por separado y subconjuntos si se
consultan. Pendiente de IVA no vuelve desconocido un neto histórico válido.

## 5. Horario versionado y utilización

Regla: id,version,facilityId,scope GENERAL/TYPE/UNIT,scopeRef?,validFrom/validTo
timestamptz,timezone fija America/Mexico_City,weeklyDays[ISO1..7],dateOverrides[].
Cada día declara CLOSED o lista de franjas HH:mm con endDayOffset0/1 para nocturna.
Excepción por fecha sustituye ese día dentro de la misma regla. Unidad>tipo>general
sustituye el horario completo, no mezcla franjas heredadas implícitamente.
No regla=UNKNOWN, CLOSED=duración0, indisponible=SOURCE_ERROR.

Una sola regla activa por scope/facility/ref/instante. Configurar nueva vigencia
>=reloj servidor, cerrar vigencia previa en ese instante y conservar versión.
No aplicar a tiempo anterior al comando ni extender cobertura hacia atrás. Cambio
futuro puede programarse con instante explícito. Anular programación aún futura
es revisión Admin auditada; rectificación pasada fuera de v1, nunca UPDATE simple.
Rechazar cambios sin revisión vigente y franjas contradictorias/duplicadas; unir
traslapes de franjas válidas para medir tiempo una sola vez. Partir medianoche
según zona; clipping por vigencia antes de agregar.

`SCHEDULED_UTILIZATION`: E=horario∩elegibilidad/facility demostrados∩rango/cutoff;
N=viaje registrado exclusivo fuera de downtime∩E; D=duración(E). Ratio=N/D solo
si D>0 y cobertura temporal100% de cohorte solicitada, incluidos horario, elegibilidad
y clasificación temporal. Con desconocidos en alguna unidad del alcance, el ratio
global solicitado es null; no ocultarla ni reducir cohorte silenciosamente.
Horas y desconocidos siguen visibles. D0conocido=NOT_APPLICABLE, falta=UNAVAILABLE.
Costos no intervienen en cobertura de utilización. Razón de sumas, no media.
Tiempo fuera de horario separado; máximo100%. F6 conserva métrica histórica
eligible-unit-time con otro metricId; no reemplazar sus reportes ni reglas safety.

Km: v1 solo intervalos con lecturas de origen/fin del periodo compatible o
subperiodo explícito con evidencia continua y válida. Sin interpolar. Si no hay
fronteras válidas para el rango solicitado, ratio/km nulo; permitir seleccionar
rango evidenciado mostrando sus extremos. No rebajar criterio por desear ranking.
Regresión/reinicio/incompatibilidad de unidad invalidan par afectado. Completar
km requeriría fuente autorizada, no un campo oculto en el reporte.

## 6. Catálogo de trabajo v1 y compatibilidad

Catálogo Mantenimiento conserva códigos de sistema A–E y los11labels legacy,
sin cambiar envelope congelado VisitaCerrada ni validadores de otros cortes.
Cada trabajo nuevo usa code estable y kind explícito; no deducir acción de nombre
de pieza. Versión1 del catálogo de análisis:

| Sistema | Trabajos conservados o añadidos |
|---|---|
| A Motor/distribución/auxiliares | Mantener4labels existentes, con kind explícito por intervención nueva |
| B Frenos | Mantener2labels existentes; kind explícito, sin inferir falla por balata |
| C Suspensión/dirección | Mantener Amortiguadores y bujes; Alineación y balanceo |
| D Llantas | Mantener Calibración y rotación; añadir D_REPAIR Reparación de llanta y D_REPLACE Cambio de llanta |
| E Carrocería/luces/interiores | Mantener2labels existentes con kind explícito |

Legacy Calibración y rotación y Alineación y balanceo permiten REVIEW_ADJUSTMENT
por significado explícito; labels de componentes sin acción quedan UNSPECIFIED.
No autoclasiﬁcar como reemplazo. Catálogo no es checklist ABC ni mantenimiento
preventivo recomendado. Admin activa/inactiva elementos; no cambia code/sistema
de un elemento usado, crea nueva versión. Supervisor selecciona; sin texto libre
como sistema nuevo. Legacy sin mapeo conserva texto fuente/UNKNOWN, sin borrado.
Piezas se atribuyen mediante vínculo explícito a workLine/system; no por nombre
del SKU ni por copiar todos los sistemas de OT.

## 7. API HTTP v1 propuesta

Namespace lógico `/analisis-mantenimiento` detrás del mismo BFF que autentica
actores. No reutilizar endpoint Inventario para escritura de servicios. Los DTO
rechazan actor/registeredAt/roles/facility arbitrarios; facility de filtro es
solicitud validada, no override de la autorización resuelta.

| Método / ruta | Contrato |
|---|---|
| POST /consultas | Read-only con cuerpo de filtros;201 crea snapshot; no efecto operativo |
| GET /consultas/:snapshotId/resumen |200 franja/tabla/tendencia con periodos/cobertura |
| GET /consultas/:snapshotId/utilizacion |200 horas/ratio nulo si parcial y evidencia por unidad |
| GET /consultas/:snapshotId/costos |200 agregados/tipos/conceptos y cobertura fiscal |
| GET /consultas/:snapshotId/tendencias |200 frecuencias/pares con definiciones exclusivas/no exclusivas |
| GET /consultas/:snapshotId/registros?metricId=&cursor=&limit= |200 detalle ordenado y mismos filtros/versión, limit1–100 |
| GET /catalogo-trabajos |200 catálogo vigente/versionado scoped |
| GET /servicios-externos/:id |200 registro/revisión/cobertura y referencias autorizadas |
| POST /servicios-externos |201 servicio realizado+recibo; idem key requerida |
| POST /servicios-externos/:id/completar-costo |200 solo pendientes con expectedVersion; sin cierre operativo |
| POST /servicios-externos/:id/previsualizar-correccion |200 preview Admin+token ligado a versión/payload, sin escritura fuente |
| POST /servicios-externos/:id/corregir |200 revisión Admin con motivo+preview token+expectedVersion |
| GET /horarios |200 reglas/vigencias/evaluación del alcance; ambos roles |
| POST /horarios |201 Admin, expectedVersion del scope (0si inicial), vigencia y motivo |
| POST /catalogo-trabajos/:code/vigencias |201 Admin activación/inactivación versionada, sin alterar filas usadas |
| POST /clasificaciones-costos |201 atribución inicial de op a sistema/work; Supervisor/Admin; referencia/versión fuente y expectedVersion0; sin modificar importe |
| POST /clasificaciones-costos/:id/revisiones |200 Admin corrige atribución con motivo,expectedVersion,referencias de fuente; conserva original |
| POST /grupos-documentales |201 grupo/asignaciones a líneas ya existentes, scopes completos, suma validada; no añade gasto por sí mismo |
| POST /grupos-documentales/:id/revisiones |200 Admin,expectedVersion+motivo; referencias/versiones y suma comprobadas |
| GET /comandos/:commandId |200 recibo propio autorizado o404; resolver timeout sin duplicar creación |

`QueryRequest`: from/to fechas locales inclusivo/exclusivo; facilityIds?,unitIds?,
unitTypeIds?,systems?,maintenanceTypes?,workKinds?,breakdown TYPE/CONCEPT/SYSTEM,
sort enum y dirección. Validar entre1y366días; cutoff servidor. Semana inicial
ISOactual transcurrida. Tendencia mensual: seis meses hasta corte, scope igual y
periodo propio explícito. Rango vacío/futuro completo invalida; no ampliar filtros.
Filtros incompatibles retornan conjunto vacío autorizado, no toda la flota.

`QueryEnvelope`: snapshotId,calculationVersion,sourceVector,scope,period,cutoff,
status COMPLETE/PARTIAL/REFRESH_PENDING/UNAVAILABLE,coverage,currency,metricIds,
rows/totals,cursor. Coverage: temporalSecondsKnown/Unknown/Unassessed,
pendingPartsCount,pendingServicesCount,reconciliationCount,unclassifiedCount,
fiscalUnknownCount,excludedUnits con motivo autorizado. Null distinto de0.
Cada ratio tiene numerator,denominator,unit y reason cuando null.

Snapshot server-side expira15min desde creación, no extiende TTL por páginas.
Vinculado a sujeto y consulta/hash; revalidar scope en cada acceso. Datos fuente
solo servidor, response no expone IDs/versiones ajenos. Cursor opaco+autenticado
liga snapshot,metric,sort y último(id,valor); cambio cursor/filtro rechaza.
El frontend refresca explícitamente y preserva filtros si409 SNAPSHOT_EXPIRED.

### Dinero, comandos y errores

Escrituras usan `Idempotency-Key` UUIDv4 y expectedVersion cuando aplica.
Clave única por(sujeto,commandId) en todo el namespace, hash canónico incluye
método/ruta/body; reintento compatible devuelve mismo status/body/recurso sin
nueva revisión. Reautorizar ahora antes de devolver recibo. Recibo durable sin
caducidad en v1 para evitar repetición histórica tras timeout/reload.
Preview token válido10min, sujeto/scope/revisión/payload, de un uso con recibo
idempotente; si fuente cambió, nueva preview. Header transmitido por BFF sin
ampliar allowlist de otros comandos de forma accidental.

Errores siguen forma `{code,message,details}` existente.401auth;403capacidad;
404recurso/snapshot no visible (sin revelar existencia);400DTO inválido;
409 VERSION_CONFLICT/IDEMPOTENCY_CONFLICT/RECONCILIATION_REQUIRED/
SNAPSHOT_EXPIRED/PREVIEW_STALE;503 SOURCE_UNAVAILABLE/PROJECTION_NOT_READY.
Código SOURCE_UNAVAILABLE no sustituye status de bloque si snapshot parcial
es válido: respuesta200con coverage/causas. Sin tracebacks ni datos privados.
422 QUERY_TOO_LARGE exige reducir alcance/rango, no reintentar en bucle.

## 8. Persistencia propuesta (public; Mantenimiento)

Nombres nuevos propuestos, no as-is. UUID y versiones bigint. Sin FK a tablas
de Inventario/Flota/Auth/Kernel. FKs solo entre tablas maintenance_* del owner;
referencias a OT/Unidad validadas por puertos. Mantener historia por inactivación.

| Tabla | Clave e invariantes |
|---|---|
| maintenance_external_services | idPK,unit_ref,facility_ref,version>=1,performed_on DATE,started_on?,type PREVENTIVE/CORRECTIVE,order_ref?/stop_ref?,provider,text/refs,registered_at/by,origin NEW/LEGACY; fecha inicio<=conclusión |
| maintenance_service_revisions | PK(service_id,version),snapshotJSON,actor,reason,command_id,registered_at; append-only; conserva estado original |
| maintenance_service_work | idPK,service_id,system,work_code,kind,intervention_id,order_work_ref?,conclusion_date,version; fuente y link explícitos |
| maintenance_service_cost_lines | idPK,service_id,version,work_ref?,system?,statePENDING/RECORDED,net/tax/gross bigint?,mode/refs,zero_reason?; nulls coherentes,known net+tax=gross |
| maintenance_cost_claims | idPK,service_line_id,unit_ref,source_op_ref,source_version,qty_from/to,mode,superseded_at?; qty_to>from; exclusión de rangos activos solapados por source_op_ref |
| maintenance_work_catalog | PK(code,version),system,label,kind constraints?,active_from/to; código inmutable con historia, legacy aliases explícitos |
| maintenance_cost_classifications | PK(source_op_ref,revision),source_version,system?/work_ref?,actor/reason; revisión append-only y asignaciones económicas explícitas |
| maintenance_document_groups | idPK,version,provider_ref/text,document_ref,net/tax/gross,created_by/at; no contribución económica propia |
| maintenance_document_allocations | PK(group_id,line_id),line_version,unit_ref,net/tax/gross; unicidad de línea por grupo activo, suma validada bajo lock de grupo |
| maintenance_document_group_revisions | PK(group_id,version),snapshotJSON,actor/reason; append-only |
| maintenance_schedule_scopes | idPK,facility_ref,scope,scope_ref normalizada,revision>=0; unique(scope/facility/ref), CAS para programación vigente/futura |
| maintenance_schedule_versions | idPK,facility_ref,scope,scope_ref?,version,valid_from/to,zone,weeklyJSON,overridesJSON,actor/reason; exclusion de vigencias solapadas por scope/ref,GENERAL ref nula normalizada |
| maintenance_command_receipts | PK(actor_subject,command_id),request_hash,resource_ref,resource_version,response_status/body,created_at; append-only; original retry tras revisión no crea efecto |
| maintenance_projection_facts | PK(owner,source_ref,source_version),facility_ref,unit_ref,capture_id,factJSON,effective_date/range,registered_at,integrity_hash; nunca fuente de seguridad |
| maintenance_projection_captures | idPK,sourceVector,calculationVersion,coverage,status,completed_at; activación solo al terminar captura consistente |
| maintenance_projection_invalidations | idPK,owner,source_ref,source_version,range,status/retry/error; idempotencia por owner/source/version; durable |
| maintenance_report_snapshots | idPK,subject,scope_hash,query_hash,capture_id,queryJSON,resultJSON,created_at,expires_at;15minTTL, consulta scoped |

Para servicios LEGACY, performed_on/type/provider permiten null/UNKNOWN solo
con origin=LEGACY y gapReason; para NEW son obligatorios y validados. No backfill
que los invente. Clasificaciones de una fuente pueden tener allocationsJSON
por sistema/work y versión, con importes netos reconciliados y residual Sin desglose;
si neto fuente cambia se invalida/reconcilia, sin repartir diferencia en silencio.
El reporte no deriva una clasificación financiera de la cantidad de trabajos.

Cada línea documental pertenece como máximo a un grupo activo; factura corregida
supersede asignación con revisión. Si cambia una costLine, su grupo pasa a
reconciliación hasta confirmar nueva suma; no modifica dinero de otras unidades.
Creación de regla y cierre de vigencia previa, actualización del scope.revision,
recibo e invalidación se confirman en una transacción con lock del scope.

Fuente económica asignada una vez por componente; update de claim bajo lock del
sourceOpRef lógico y service, orden determinista. Ledger original Inventario no
se bloquea/escribe cruzado; sourceVersion se captura y si cambia se invalida
reporte y no se presenta claim obsoleto como completo. Exclusion constraint o
lock+constraint equivalente se ensaya en PostgreSQL real, no solo mocks.

Índices mínimos: servicios(facility,unit,performed_on,id), work(system,kind,
conclusion_date,intervention_id), clasificación(source_ref,source_version),
claims(source_op_ref), horarios(scope/ref,valid_from), facts(facility,unit,
effective_date/range), invalidaciones(status,created_at), snapshots(expires_at).
No JSONscan sin índices como plan de consulta principal.

Documentos privados se referencian; metadata por owner no borra objetos CHECK.
Datos/recibos/auditoría no se purgan automáticamente en v1; snapshots/capturas de
consulta expiradas se pueden limpiar sin afectar fuente, con límite de retención
de hechos de auditoría conservado. Archivar catálogos, no cascadas destructivas.

## 9. Actualización, rollback y límites

Registro+revisión+recibo+invalidación del propio servicio en una transacción.
Fuente financiera Inventario incorpora su revisión por puerto versionado y
watermark/integrity check: reintento de captura detecta cambios sin requerir
evento nuevo en VisitaCerrada. Lectura publica última captura terminada, nunca
mitad de captura. Consulta nueva compara watermark de cada fuente; cambio marca
REFRESH_PENDING hasta captura completa. No prometer frescura desde timestamps
actuales si fuente no pudo verificarse. Readiness operacional lee fuentes live.

Límites iniciales de diseño:366días/consulta,100filas/página,100IDs explícitos,
snapshot15min,preview10min. Trabajo de captura paginado por fuente y reintentable;
al abrir se solicita refresco y durante consulta activa revisión de freshness
cada30s como máximo de frecuencia (no garantía de terminación). Si no termina,
último as-of o503; sin polling infinito bloqueante. Medir latencia y volumen
en rehearsal; no afirmar SLO cumplido sin evidencia.

Migración aditiva y runner aislado: preflight verifica target/owner/version y
dependencias Auth/costos/viajes; no `synchronize`, seed ni migración durante arranque.
Orden: catálogo+servicios/recibos; claims/clasificaciones; horarios; proyección/
snapshots. Backfill solo evidencia conocida, legacy labels/origin explícitos;
sin fecha/importe/tipo inventados ni retrodatar downtime. Backfill por batches,
idempotente y reconciliado con conteos/sumas fuente.

Rollout por feature flags separados consulta/captura/horarios, inicialmente off.
Sin flag no hay endpoint activo por accidente. Rehearsal en DB descartable y
verificación de readiness primero. Down solo en vacío; con datos rechaza rollback
destructivo. Recuperar hacia adelante y deshabilitar flags conservando auditoría.
Producción requiere su autorización propia; nada de este documento la ejecuta.

## 10. Matriz de cierre y slices

| Slice futuro | Dependencias / prueba contractual obligatoria |
|---|---|
| Identidad global y catálogo | SPEC AC06/31–35; enum/legacy, filtros neutros, dos roles, sin efectos CHECK |
| Servicios económicos | AC08–20/36/41/47–50; auth scope, money net/tax, dup/claims, rollback+retry y fuente concurrente |
| Horarios | AC23–30/45/49; Admin writer, Supervisor denied, vigencias/franjas/unknown/closed |
| Proyección/API analítica | AC01–05/07/21–22/37–38/43–48/51–52; snapshot/cohortes, IVAunknown, fuente atrasada, scope cambiado |
| UI cuatro vistas | AC39–40/42; UX, interacción, better-ui/proof-ui y auditor independiente |

Ejemplos adicionales para tests:30oct–2nov externo reconocido2nov;100%temporal
permite ratio y99.9% no; costo neto100con IVAunknown conserva neto100/grossnull;
misma clave distinto endpoint409; fuente confirmada después de snapshot no
altera páginas de ese snapshot; Admin pierde scope antes de retry404/403 sin
recibo ajeno; tipo unidad cambiado no reescribe horarios anteriores.

## 11. Cierre del diseño

No quedan preguntas operativas de las tres decisiones confirmadas. Catálogo,
precedencia, roles, fechas, respuestas, límites y persistencia tienen aquí una
opción definida para revisión. Ratificar ADR030 y este diseño como arquitectura
antes del EWO de implementación; no volver a pedir decisiones ya contestadas.
Después corresponden rehearsal/AC y evidencia de cada slice, no más ideación.
No se afirma que el paquete esté desplegado ni que pruebas planeadas hayan pasado.


## Concreción de ejecución EWO-063 — 2026-10-19

La autorización posterior del propietario ratifica la ejecución local. Las tablas
anteriores se mantienen como contrato objetivo; el estado real y los AC parciales
se documentan en docs/evidence/EWO-063.md, sin afirmar que existan fuentes ABC/UTIL.

- Puertos de lectura owner-side scoped con captura REPEATABLE READ compartida en
  el monolito actual; savepoints y cobertura por fuente. No se usan endpoints
  históricos sin scope ni la lectura de Salud que escribe alertas.
- Costos y registro externo se reconocen por sus fechas canónicas independientes.
  Tipo de trabajo en costos solo se filtra cuando existe referencia explícita;
  Sin clasificar no se distribuye por cantidad de trabajos.
- GET /opciones, /unidades/:id/contexto, /costos-refacciones/:id y
  /lineas-documentales?unitId= son auxiliares scoped para formularios y detalle.
- Adjuntos: POST /servicios-externos/:id/adjuntos multipart file, Idempotency-Key
  obligatoria; hasta5 y10MiB, firma MIME PDF/JPEG/PNG verificada. Se añaden después
  del alta. GET /servicios-externos/:id/adjuntos/:attachmentId/enlace entrega token
 60segundos y GET de ese adjunto lo verifica junto a actor/scope actual. Descarga
  privada, integridad SHA256, sin URL pública ni clave física en DTO. Configuración
  ObjectStoragePort existente. Fallo SQL después de almacenar puede dejar objeto
  privado huérfano; nunca evidencia referenciada sin commit; requiere revisión de
  huérfanos antes de cualquier limpieza operativa. No se borran objetos inmutables.
- Una revisión conserva asignaciones previas de documento y muestra conciliación
  pendiente hasta revisión Admin. Quitar una línea vinculada se rechaza409 hasta
  revisar la distribución; no se generan referencias documentales huérfanas.
- Firma en producción: MAINTENANCE_ANALYSIS_SIGNING_SECRET base64 de32bytes,
  estable/compartida entre instancias. Falta de configuración bloquea solo el
  análisis habilitado con503; flags apagados no afectan otros módulos. En local
  secreto efímero: reinicio invalida preview/cursor, se recarga consulta.
- Migración aislada: npm run analysis:migration:inspect/up/down, DB_SYNCHRONIZE=false,
  DB_DROP_SCHEMA=false y MAINTENANCE_MIGRATION_TARGET=current_database para cambios.
  FKs solo entre tablas propias; ninguna escritura en schemas ajenos. Down rechaza
  si existe evidencia y recomienda deshabilitar flags/corrección hacia delante.
