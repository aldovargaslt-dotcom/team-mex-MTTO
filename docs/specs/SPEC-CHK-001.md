# SPEC-CHK-001 — Chequeo Operativo de Flota y Órdenes de Trabajo

**Estado:** Approved — paquete Slice0/contrato y owner D01–D14/R01–R05 aprobados 2026-10-01; no autoriza implementación de Slices1–8.
**Aprobación de decisiones:** owner, esta conversación, 2026-10-01; [paquete Slice 0](../engineering-work-orders/CHK-001-slice-0-review.md).\
**Producto:** Team Mex MTTO\
**Áreas:** Flota, Logística, Mantenimiento, Órdenes de Trabajo\
**Prioridad:** Alta\
**Fuente visual:** Iteraciones aprobadas de Stitch + flujo operativo definido con negocio\
**Regla:** Esta SPEC es fuente de verdad funcional. Las pantallas de Stitch son referencia visual; no deben usarse para inventar reglas de negocio.

---

## 1. Objetivo

Implementar un flujo de **Chequeo Operativo** ligado a Órdenes de Trabajo (OT) que permita:

- que el mecánico ejecute chequeos desde su área, teléfono o tablet;
- que Logística pueda solicitar y monitorear chequeos sin capturar datos técnicos;
- automatizar la creación de chequeos por jornada cuando corresponda;
- impedir dos chequeos activos simultáneos para una misma unidad;
- permitir que CHECK, PREVENTIVE y CORRECTIVE coexistan cuando corresponda;
- capturar evidencia fotográfica, hallazgos, dictamen técnico y firma táctil;
- preparar/generar una OT Correctiva desde un hallazgo sin duplicar captura;
- mantener trazabilidad, auditoría e inmutabilidad después del cierre;
- alimentar la Torre de Control con estado, habilitación y chequeo como conceptos separados.

---

## 2. Principios de dominio

La OT se implementa extendiendo **Visita** y su tabla/ID existentes, con extensión CHECK 1:1. No crear WorkOrder paralelo. [ADR-016](../adr/016-visita-check-evolution.md) supersede parcialmente ADR-015; adaptadores explícitos preservan contratos legacy.


### 2.1 Tipos de Orden de Trabajo

```text
WORK_ORDER
├── CHECK
├── PREVENTIVE
└── CORRECTIVE
```

**CHECK** es una inspección operativa.\
No es mantenimiento preventivo.

**PREVENTIVE** y **CORRECTIVE** siguen representando trabajo de mantenimiento.

### 2.2 Origen del CHECK

Un CHECK puede originarse por:

```text
DAILY_AUTOMATIC
LOGISTICS_MANUAL
CHECK_OUT
CHECK_IN
REINSPECTION
```

Los valores anteriores son internos. La UI debe mostrar lenguaje operativo en español:

- Chequeo diario
- Chequeo solicitado por Logística
- Chequeo de salida
- Chequeo de retorno
- Reinspección

---

## 3. Roles y responsabilidades

### Mecánico

Rol explícito `MECANICO`. Producción exige identidad autenticada de confianza del servidor para firma; headers manipulables no bastan. SUPERVISOR conserva su rol actual, sin renombre automático.

Puede:

- ver su cola de trabajo;
- iniciar/continuar CHECK;
- capturar condición física;
- capturar PSI;
- revisar/agregar evidencia;
- clasificar hallazgos;
- aceptar o cambiar el dictamen técnico;
- firmar mediante trazo táctil;
- concluir CHECK;
- ejecutar PREVENTIVE/CORRECTIVE conforme al flujo existente.

No debe necesitar acudir a la oficina de Logística para firmar.

### Logística

Logística y Admin pueden asignar CHECK. Mecánicos sólo reclaman elegibles no asignados si policy permite; scope y actor se validan server-side.

Puede:

- observar flota y readiness;
- solicitar CHECK manualmente;
- ver CHECK activo;
- monitorear progreso;
- ver resultado final;
- registrar/autorizar movimientos conforme al flujo de patio;
- no editar datos técnicos capturados por el mecánico.

### Chofer

Su participación pertenece al flujo de movimiento/check-out/check-in.

La firma del chofer **no es sustituida** por la firma del mecánico.

Cuando un movimiento requiera doble firma:

```text
Movimiento / check-out / check-in
├── firma chofer
└── referencia al CHECK mecánico firmado
```

---

## 4. Estados

### 4.1 Work Order

```text
PENDING
ASSIGNED
IN_PROGRESS
COMPLETED
CANCELLED
```

Para CHECK se considera **activo**:

```text
PENDING
ASSIGNED
IN_PROGRESS
```

### 4.2 Resultado del CHECK

```text
FIT
FIT_WITH_OBSERVATION
UNFIT
```

UI:

```text
Apta
Apta con observación
No apta
```

El estado de la OT y el resultado son conceptos distintos.

Ejemplo válido:

```text
status = COMPLETED
result = UNFIT
```

---

## 5. Invariantes

### INV-CHK-001 — Un solo CHECK activo por unidad

Una unidad puede tener **máximo un CHECK activo simultáneamente**.

Debe protegerse en backend y base de datos.

Conceptualmente:

```sql
UNIQUE vehicle_id
WHERE work_order_type = 'CHECK'
AND status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS')
```

### INV-CHK-002 — Convivencia con mantenimiento

Una unidad puede tener simultáneamente:

- 1 CHECK activo máximo;
- 0..N PREVENTIVE;
- 0..N CORRECTIVE.

### INV-CHK-003 — Correctiva no implica bloqueo

```text
type = CORRECTIVE
```

NO significa automáticamente:

```text
blocks_operation = true
```

El bloqueo es una propiedad/regla independiente.

### INV-CHK-004 — Inmutabilidad

Después de firma y cierre:

- CHECK no editable;
- firma no editable;
- evidencia no eliminable;
- hallazgos no reescribibles;
- correcciones posteriores deben ser nuevos eventos/registros.

### INV-CHK-005 — No duplicación diaria

La generación automática por jornada debe ser idempotente.

### INV-CHK-006 — Sin doble captura

Una anomalía detectada en Condición genera automáticamente un hallazgo.\
El mecánico no debe escribir el mismo problema nuevamente en Hallazgos.

---

## 6. Flujo de CHECK — 4 pasos visibles

El producto utiliza exactamente cuatro pasos visibles:

```text
1. Condición
2. Evidencia
3. Hallazgos
4. Revisión y Firma
```

No crear una quinta etapa en otras vistas.

---

# 7. Paso 1 — Condición

## 7.1 Patrón de formulario

Mantener la gramática visual conocida por taller:

```text
A. FLUIDOS Y FUGAS
B. LLANTAS Y PRESIÓN
```

Lectura vertical, categorías claras, pocos controles.

No convertir el CHECK en el formulario completo A–E de mantenimiento.

## 7.2 A. Fluidos y fugas

Alcance aprobado:

- aceite de motor;
- agua / limpiaparabrisas donde aplique;
- refrigerante / anticongelante;
- fugas visibles.

Camino normal:

```text
[ Todo conforme ]
```

La confirmación debe ser explícita; nunca preseleccionada.

Si se reporta anomalía, mostrar solamente los campos afectados.

Ejemplo:

```text
Refrigerante
○ Bajo
○ Crítico
```

No inventar Batería, Frenos, Suspensión u otros sistemas dentro del CHECK sin decisión de producto.

## 7.3 B. Llantas y presión

Capturar PSI por posición.

Ejemplo conceptual:

```text
DI  [65] PSI
DD  [65] PSI
TI  [70] PSI
TD  [68] PSI
```

El sistema deriva si está en rango usando configuración de la unidad.

No pedir al mecánico:

```text
¿PSI correcto?
```

si el sistema puede calcularlo.

Condición visual normal:

```text
[ Sin daños visibles ni ponchaduras ]
```

Si existe anomalía, expandir:

- posición;
- desgaste;
- ponchadura;
- daño exterior;
- otro.

---

# 8. Paso 2 — Evidencia

## 8.1 Regla dura

En V1 la evidencia es obligatoria en **todos** los CHECK, sin N/A ni bypass:

```text
mínimo = 2 fotos
máximo = 5 fotos
```

Backend y frontend deben validar.

## 8.2 Cobertura requerida

Las fotografías deben cubrir:

- odómetro;
- combustible;
- testigos del tablero.

No se requieren exactamente tres archivos.

Una fotografía puede cubrir más de un concepto.

## 8.3 Metadata

Cada evidencia debe registrar al menos:

- CHECK / inspección;
- object/storage key;
- MIME type;
- tamaño;
- hash;
- timestamp;
- usuario;
- tags de cobertura.

Los archivos viven en object storage privado; BD conserva identificador/object key y metadata.

---

# 9. Paso 3 — Hallazgos

## 9.1 Generación

Una respuesta anormal en Paso 1 genera hallazgo automáticamente.

Ejemplo:

```text
Refrigerante = Bajo
Fuga visible = Sí
```

genera:

```text
Hallazgo: Refrigerante bajo / fuga visible
Origen: Condición
```

## 9.2 Resolución

El mecánico clasifica el hallazgo:

```text
OBSERVATION
FIXED_DURING_CHECK
REQUIRES_WORK
```

UI:

```text
Observación
Corregido durante chequeo
Requiere trabajo
```

### Requiere trabajo

Seleccionar `REQUIRES_WORK` es la decisión explícita de preparar y crear una CORRECTIVE al completar firmado. No agregar checkbox de confirmación redundante. Permanece PREPARED antes del cierre y se crea/vincula atómicamente con el CHECK firmado; [contrato](../contracts/CHK-001-contract.md).

La Correctiva hereda:

- vehicle_id;
- source_check_id;
- finding_id;
- nota relevante;
- evidencia relacionada.

NO debe inventar:

- diagnóstico;
- refacciones;
- método de reparación;
- técnico;
- horario;
- programación.

Antes del cierre mostrar:

```text
Correctiva preparada
```

Después del cierre:

```text
Correctiva creada
```

---

# 10. Paso 4 — Revisión y Firma

## 10.1 Revisión exception-first

Datos normales resumidos:

```text
Condición       ✓
Llantas         ✓
Evidencia       ✓
```

Anomalías expandidas.

Los valores detallados quedan detrás de:

```text
Ver detalles
```

## 10.2 Dictamen

El sistema deriva en backend, usando reglas de seguridad configuradas:

- Sin anomalía: FIT.
- Anomalía no bloqueante: FIT_WITH_OBSERVATION.
- Hard safety blocker: UNFIT.
- Hard blocker no admite override que permita salida. Rangos/políticas PSI por posición son configuración; no números del mock.

El sistema muestra:

```text
FIT
FIT_WITH_OBSERVATION
UNFIT
```

El camino normal NO requiere un botón adicional de “Confirmar dictamen”.

Mostrar:

```text
DICTAMEN PROPUESTO
APTA CON OBSERVACIÓN

[ Cambiar dictamen ]
```

La firma final confirma el dictamen visible.

Si la policy de seguridad permite un cambio, registrar actor, cambio y razón. Nunca se rebaja un hard blocker a FIT ni a un resultado que permita salida. La firma confirma el dictamen visible y la revisión/hash actuales, no una decisión que haya cambiado después.

## 10.3 Firma

Firma real mediante canvas táctil.

Registrar:

- signer_user_id;
- nombre snapshot;
- timestamp;
- object/storage key;
- hash de firma;
- hash/snapshot del contenido firmado;
- dimensiones del canvas;
- método `TOUCH_CANVAS`.

No almacenar firma como texto plano.

## 10.4 Cierre

`Firmar y concluir chequeo` realiza lógicamente:

1. validar CHECK;
2. validar evidencia;
3. validar hallazgos;
4. fijar snapshot/hash;
5. persistir firma;
6. persistir dictamen;
7. cerrar CHECK;
8. volver inspección inmutable;
9. crear/vincular Corrective preparada;
10. emitir eventos/notificaciones para Logística.

Debe ser atómico en lo que corresponda a la transacción de dominio.

---

# 11. Generación automática

Crear proceso idempotente:

```text
GenerateDailyVehicleChecks
```

Por unidad elegible:

1. si ya hay CHECK activo → no crear;
2. si ya se generó el CHECK automático correspondiente a la jornada, incluso completado/cancelado → no duplicar;
3. si corresponde → crear CHECK `PENDING`.

Usar concepto de:

```text
operational_date
```

en timezone configurada de facility/negocio. Validez termina al final de esa jornada, no tras un TTL rodante de 24h. Scheduler invoca comando idempotente con actor SYSTEM; no escribe filas directo. Elegibilidad/horario son configuración aprobada antes de habilitarlo.

---

# 12. Creación manual por Logística

Comando conceptual:

```text
CreateVehicleCheck
```

Antes de crear:

- validar unidad;
- validar permisos;
- comprobar CHECK activo;
- crear si no existe;
- registrar auditoría;
- emitir evento.

Si ya existe:

```http
409 ACTIVE_CHECK_ALREADY_EXISTS
```

La respuesta debe incluir suficiente información para abrir la OT existente.

UI:

```text
Esta unidad ya tiene un chequeo activo.

CHK-1284
En progreso
Carlos Mendoza
18 min
Paso 4 de 4 · Firma pendiente
1 anomalía no bloqueante

[ Ver chequeo activo ]
```

No mostrar formularios deshabilitados.

---

# 13. Torre de Control

Mantener separados:

## Estado vehículo

```text
En patio
En ruta
En taller
Inactiva
```

## Habilitación operativa

```text
Lista
Pendiente
Bloqueada
Despachada
```

## Estado CHECK

```text
Apta
Apta con observación
No apta
En progreso
Requerido
```

EN_TALLER requiere fuente/transición operacional explícita, nunca existencia de CORRECTIVE. Torre es un read model compuesto por puertos; no sincroniza custodia de patio con journey Logística.

Una unidad en ruta debe usar:

```text
Habilitación = Despachada
```

no `Pendiente`.

## Urgencia

La columna/filtro comunica solo urgencia:

```text
Crítica
Atención
Normal
```

No usar `Despacho listo` como prioridad.

Derivar maximum severity de causas activas: CRITICAL por blocker duro/UNFIT/documentación requerida inválida/regreso críticamente vencido; ATTENTION por CHECK requerido/en progreso/FIT_WITH_OBSERVATION/regreso no crítico u otra atención no bloqueante; NORMAL sin causas. Thresholds temporales son configuración, no valores del screenshot.

## KPI bloqueadas

No usar:

```text
OT Correctiva = bloqueada
```

Usar:

```text
Mantenimiento bloqueante
```

cuando `blocks_operation = true`.

---

# 14. Integración con check-out / check-in

La OT CHECK del mecánico no sustituye el ciclo del movimiento ni CHOFER/AVAL existentes. Se conservan loop Flota SALIDA/ENTRADA y journey Logística independientes. Ambos commands de nuevas salidas validan CHECK firmado vigente por puerto server-side, sin sincronizar loops implícitamente.

Un DAILY_AUTOMATIC válido satisface CHECK_OUT posteriores en su vigencia operacional. No crear CHECK por cada salida. Si no existe válido o fue invalidado, se requiere nuevo CHECK, respetando exclusividad activa. Resultado vigente UNFIT no permite salida.

Dashboard/Torre permanece `/logistica`; `/flota` es movimientos. [ADR-017](../adr/017-check-movement-seam.md).

Conceptualmente:

```text
MOVIMIENTO
├── CHECK técnico / mecánico
├── evidencia requerida
├── firma chofer
└── autorización logística
```

El flujo de salida mantiene la regla documental/póliza existente.

La póliza debe validarse antes de comenzar/autorización de salida conforme a la regla de negocio vigente.

La entrada/check-in mantiene el mismo rigor de cierre del movimiento.

---

# 15. Reglas documentales duras

Preservar la regla:

```text
expiration_date <= operational_current_date
=> no vigente
```

V1 incorpora capacidad documental mínima desacoplada `POLIZA_SEGURO`, preparada para futura Master Data; no catálogo documental completo. La fecha actual es la operacional del facility/negocio, calculada server-side (no CURRENT_DATE de un host con timezone incorrecta). Póliza faltante también es hard block. Fuente indisponible falla cerrada con error técnico explícito. [ADR-019](../adr/019-vehicle-insurance-policy.md).

Una unidad con póliza faltante, vencida o que vence hoy:

- queda bloqueada documentalmente;
- no puede iniciar nueva salida;
- backend rechaza aunque frontend esté manipulado.

---

# 16. Concurrencia

La exclusión de CHECK debe resistir concurrencia real.

Caso:

```text
Scheduler crea CHECK
+
Logística crea CHECK manual
```

Resultado:

```text
1 creada
1 rechazada
```

Nunca dos activas.

---

# 17. Auditoría

Registrar al menos:

```text
CHECK_CREATED
CHECK_ASSIGNED
CHECK_STARTED
CHECK_FINDING_CREATED
CHECK_FINDING_CLASSIFIED
CHECK_REVIEW_STARTED
CHECK_SIGNED
CHECK_COMPLETED
CHECK_CANCELLED
CHECK_INVALIDATED
CORRECTIVE_PREPARED_FROM_CHECK
CORRECTIVE_CREATED_FROM_CHECK
```

Con:

- actor;
- timestamp;
- vehicle_id;
- work_order_id;
- source;
- motivo cuando aplique.

---

# 18. Permisos mínimos

### Mecánico

Rol explícito `MECANICO`. Producción exige identidad autenticada de confianza del servidor para firma; headers manipulables no bastan. SUPERVISOR conserva su rol actual, sin renombre automático.

- leer sus CHECK;
- iniciar CHECK;
- editar CHECK antes de firma;
- firmar/cerrar;
- ver Corrective derivada.

### Logística

Logística y Admin pueden asignar CHECK. Mecánicos sólo reclaman elegibles no asignados si policy permite; scope y actor se validan server-side.

- crear CHECK manual;
- ver CHECK;
- ver progreso/resultado;
- no editar datos técnicos;
- usar resultado para readiness/movimientos.

### Admin

Puede asignar CHECK dentro de scope; no firma como mecánico sólo por ser Admin.

- configuración;
- auditoría;
- nunca reescribir registros firmados.

---

# 19. Formulario de PREVENTIVE/CORRECTIVE

No sustituir el patrón actual de mantenimiento.

Conservar el modelo familiar por categorías A–E, por ejemplo:

```text
A. Motor y sistema de distribución / auxiliares
B. Sistema de frenos
C. Suspensión y dirección
D. Llantas y neumáticos
E. Carrocería, luces e interiores
```

La UI puede modernizarse, pero debe conservar:

- categorías;
- lista vertical de trabajos;
- selección directa;
- expansión progresiva solo de elementos seleccionados.

CHECK y mantenimiento comparten gramática visual, no el mismo alcance.

---

# 20. Acceptance Criteria

## AC-01 — Exclusividad

Dado un CHECK activo para una unidad,\
cuando Logística o el scheduler intenten crear otro,\
entonces el sistema rechaza la creación y devuelve la OT activa.

## AC-02 — Convivencia

Dado un CHECK activo,\
cuando se crea una PREVENTIVE o CORRECTIVE,\
entonces la creación es válida si no viola otra regla.

## AC-03 — Evidencia mínima

Dado un CHECK con 1 foto,\
cuando intenta avanzar/cerrar,\
entonces se rechaza.

## AC-04 — Evidencia máxima

Dado un CHECK con 5 fotos,\
cuando intenta capturar una sexta,\
entonces frontend bloquea y backend rechaza.

## AC-05 — Cobertura

Dado un CHECK con 2 fotos que cubren odómetro, combustible y testigos,\
entonces la evidencia puede considerarse completa.

## AC-06 — Hallazgo derivado

Dada una anomalía registrada en Condición,\
entonces se crea hallazgo automáticamente sin segunda captura textual obligatoria.

## AC-07 — Correctiva preparada

Dado un hallazgo `REQUIRES_WORK`,\
entonces puede prepararse una Corrective heredando contexto.

## AC-08 — Sin bloqueo implícito

Dada una Corrective abierta con `blocks_operation = false`,\
entonces la unidad no se marca bloqueada solo por existir esa OT.

## AC-09 — Firma

Dado un CHECK válido,\
cuando el mecánico firma y concluye,\
entonces se persiste firma táctil, dictamen, cierre e inmutabilidad.

## AC-10 — Readiness

Dada una unidad en ruta,\
entonces la Torre muestra `Despachada`, no `Pendiente`.

## AC-11 — Póliza

Dada una póliza con `expiration_date <= operational_current_date`,\
cuando se intenta iniciar/autorización de salida,\
entonces la API rechaza y la unidad queda bloqueada documentalmente.

## AC-12 — Auditoría

Todo cambio de estado relevante del CHECK genera un evento auditable.

---

# 21. Tests mínimos

## Dominio

- crear CHECK sin activo;
- rechazar segundo CHECK activo;
- crear CHECK después de completar anterior;
- CHECK + PREVENTIVE;
- CHECK + CORRECTIVE;
- múltiples CORRECTIVE;
- `COMPLETED + UNFIT`;
- Corrective no bloqueante;
- Corrective bloqueante.

## Concurrencia

- dos creaciones simultáneas → una sola activa.

## Scheduler

- idempotencia;
- no duplicación;
- respeta activo existente.

## Evidencia

- 1 foto → fail;
- 2 fotos + cobertura completa → pass;
- 5 fotos → pass;
- 6 fotos → fail;
- cobertura incompleta → fail.

## Firma

- sin firma → no concluir;
- firma válida → concluir;
- después de concluir → update/delete rechazado.

## UI

- cola muestra 1 en curso + 2 pendientes correctamente;
- anomalía genera hallazgo;
- dictamen sugerido no requiere doble confirmación;
- modal de CHECK activo enlaza a OT existente;
- Torre separa Estado / Habilitación / CHECK.

---

# 22. Decisiones de owner incorporadas y adoptadas

D01–D14 y la decisión adicional CHECK_COMPLETED fueron aprobadas explícitamente en esta conversación el 2026-10-01. Son baseline funcional; no autorización de implementación.

- D01: DAILY_AUTOMATIC válido reutilizable para CHECK_OUT; ausencia/invalidación requiere nuevo CHECK, sujeto a activo único.
- D02: validez por operational_date/timezone de instalación/negocio hasta fin de jornada; no TTL24h.
- D03: dictamen server-side no anomalía→FIT, no bloqueante→FIT_WITH_OBSERVATION, hard safety→UNFIT; hard no override operable; PSI configurado.
- D04: seleccionar REQUIRES_WORK ya es opt-in; PREPARED antes y correctiva creada atómicamente al cierre firmado; no confirmación extra.
- D05: invalidación append-only por incidente/daño, nueva anomalía seguridad, Mecánico/Logística autorizados con motivo, o mantenimiento completado/work requires_reinspection. Expiración no es invalidación ni reescritura.
- D06: conservar CHOFER/AVAL y loops independientes; departures validan CHECK firmado por puerto.
- D07: MECANICO explícito, Logistics/Admin asignan, claim si policy; identidad production confiable, stub limitado no-production.
- D08: extender Visita y CHECK1:1; supersession parcial ADR-015; CHECK≤1 activo, maintenance0..N; adapters legacy explícitos.
- D09: documentos mínimos desacoplados, POLIZA_SEGURO; missing o expiration_date<=fecha_operativa bloquea salida.
- D10: Torre compone cuatro ejes independientes; EN_TALLER transición/fuente explícita, no CORRECTIVE.
- D11: urgency=max severity causas activas con CRITICAL/ATTENTION/NORMAL; thresholds configurables.
- D12: evidencia todos los CHECK, 2–5 y odómetro/combustible/testigos; sin bypass.
- D13: S3-compatible privado, development MinIO/self-host y production configurado; no cleanup de firmados, sólo temporales no referenciados; TypeORM versionadas, sin synchronize deployment; daily command idempotente scheduler-triggered.
- D14: conservar DS tipografía repo, sin migración global; /logistica dashboard/Torre y /flota movements.
- Adicional: CHECK_COMPLETED distinto de VisitaCerrada; sin inventario/cadencia/mantenimiento/consumidores legacy.

D01–D14 y R01–R05 están respondidas/adoptadas. No quedan OWNER_DECISION_REQUIRED; mapping/PSI/provider/datos operativos son inputs de configuración. [Slice0 review](../engineering-work-orders/CHK-001-slice-0-review.md) distingue technical readiness de autorización y habilitación productiva.

---

# 23. Fuera de alcance de este incremento

- diagnóstico automático con IA;
- OCR obligatorio;
- telemetría avanzada;
- programación completa de mantenimiento;
- catálogo maestro definitivo de documentos;
- optimización predictiva;
- sustitución total del formulario PREVENTIVE/CORRECTIVE existente.

---

# 24. Orden recomendado de implementación

```text
Slice 1
Dominio + migration + exclusividad + API

Slice 2
Creación manual + generación automática + auditoría

Slice 3
Bandeja del mecánico + Paso 1

Slice 4
Evidencia + storage + Paso 2

Slice 5
Hallazgos + Corrective preparada + Paso 3

Slice 6
Review + firma + cierre + inmutabilidad

Slice 7
Torre de Control + realtime/readiness

Slice 8
Integración check-out/check-in + hardening + regression
```

Cada slice debe incluir tests y evidencia.


# 25. Contratos duraderos y criterios adicionales de owner

Arquitectura: [ADR-016](../adr/016-visita-check-evolution.md), [ADR-017](../adr/017-check-movement-seam.md), [ADR-018](../adr/018-mecanico-auth-signature-identity.md), [ADR-019](../adr/019-vehicle-insurance-policy.md), [ADR-020](../adr/020-check-storage-migrations-scheduler.md). Implementación: [contrato](../contracts/CHK-001-contract.md), [migration/backfill](../migrations/CHK-001-visita-backfill-plan.md), [UX propuesta](../design/ux-check-operativo-v1.md).

Se conservan AC-01–12 originales, ajustados a fecha operativa y mandatory evidence V1. Estos criterios nuevos concretan decisiones aprobadas sin reemplazar los anteriores:

| ID | Given / When / Then verificable |
|---|---|
| AC-13 | Dado CHECK válido completado, cuando se cierra, entonces emite CHECK_COMPLETED y ningún VisitaCerrada, consumo inventario, reset cadencia ni conteo mantenimiento. |
| AC-14 | Dado daily generado en jornada, incluso completado/cancelado, cuando runner/retry vuelve a generar, entonces no duplica; ledger unit+operational_date durable y active manual respetado. |
| AC-15 | Dado daily firmado válido operable, cuando hay varias CHECK_OUT misma jornada, entonces se reutiliza; siguiente jornada/invalidación no autoriza reutilización y se requiere CHECK válido nuevo. |
| AC-16 | Dadas condiciones configuradas sin anomalía/no bloqueante/hard blocker, cuando review/close/override, entonces backend deriva FIT/FIT_WITH_OBSERVATION/UNFIT y rechaza downgrade de hard blocker operable. |
| AC-17 | Dado finding REQUIRES_WORK, cuando se prepara/cierra/reintenta, entonces no exige confirmación adicional, no crea antes de cierre y crea una correctiva atómicamente por derivación, sin diagnóstico/partes/asignado/horario inventados. |
| AC-18 | Dado signed CHECK y causa autorizada D05, cuando se invalida, entonces nuevo evento/idempotency source y signed snapshot intacto; fin de jornada expira sin invalidation event. |
| AC-19 | Dada firma production, cuando authenticating/signing, entonces actor server-trusted y snapshot nombre/subject; production+stub y headers falsos no firman ni autorizan salida production. |
| AC-20 | Dados Logistics/Admin scope y mechanics elegibles, cuando asignan/claim concurrente, entonces autorización y un ganador; otro mecánico no escribe CHECK asignado ajeno. |
| AC-21 | Dada póliza faltante/hoy/ayer, cuando nuevas salidas por cualquiera de los gateways, entonces hard block; mañana es válida documentalmente, fuente unavailable falla cerrada y retorno permanece posible. |
| AC-22 | Dada Torre, cuando compone unidades, entonces state/readiness/check/urgency independientes; EN_TALLER sólo fuente explícita, Corrective no implica taller o bloqueo. |
| AC-23 | Dadas causas activas, cuando se evalúa urgency, entonces máximo CRITICAL>ATTENTION>NORMAL según D11; umbrales configurados y KPI distinto por unidad/cause, no screenshot constants. |
| AC-24 | Dada evidencia/firma, cuando upload/register/read, entonces storage S3 privado, metadata MIME/bytes/hash/time/actor/tags y objeto de scope; ningún blob CHECK principal ni key ajena. |
| AC-25 | Dado signed CHECK, cuando API/SQL/cascade/storage cleanup intentan alterar/eliminar, entonces se rechaza o no se borra; sólo temporary uploads sin referencia pueden limpiarse. |
| AC-26 | Dados writers simultáneos editar/firmar/quinta-sexta evidencia/dobleclose, cuando corren, entonces version/locks y constraints impiden overwrite firmado, seis fotos y correctivas duplicadas; rollback SQL integral. |
| AC-27 | Dados legacy datos/clients y migration versionada, cuando backfill/adapters se aplican, entonces IDs/children conservados, tipos/status mapping explícito, slot legacy201/200 intacto y N maintenance nueva+CHECK único; ambiguos se reportan sin reparación automática. |
| AC-28 | Dado historial mixto CHECK+maintenance, cuando hub/cadencia/stock/Andon/Salud consultan o consumen, entonces CHECK nunca cuenta como maintenance ni cambia envelope/efectos de VisitaCerrada. |
| AC-29 | Dados ambos loops, cuando departure/return, entonces CHECK validation server port y CHOFER/AVAL conservados en patio, sin sincronización implícita ni nuevo rechazo de retorno por vencimiento documental. |
| AC-30 | Dado normal path mobile, cuando completa CHECK, entonces cuatro pasos, explícita condición, normales compactos/anomalías expandidas, dictamen visible confirmado por canvas/firma, sin confirmación redundante ni migración DS global. |
| AC-31 | Dada cola/modal/Torre con mismos filtros/scope, cuando se consultan, entonces conteos/progreso coherentes, activo409 deep link autorizado, y referencia real/id/startedAt; nunca 4 activas con 3 por hardcode. |
| AC-32 | Dado CHECK event committed y fallo/replay de consumer, cuando delivery reintenta, entonces eventId dedupe sin pérdida/duplicación de OT, audiencia autorizada de notificaciones, y no I/O externo en cierre SQL. |
| AC-33 | Dado facility calendario y límite de jornada/DST, cuando calcula validez, entonces operational_date/end correctos y no TTL24h; sin timezone/config válida no habilita generación/salida. |
| AC-34 | Dado PSI por posición, cuando valida/review, entonces rango/policy unit/type versión correcta, sin configuración required no conformidad automática y signed PSI/config snapshot no cambian por futura config. |
| AC-35 | Dada UI/network o edición posterior a review, cuando vuelve a firmar, entonces error/loading/empty/conflict accesibles, retry idempotente, review stale/hash rechazado; Logistics sólo lectura técnica. |
| AC-36 | Dada salida concurrente con invalidación/documento/bloqueo/expiry, cuando commits, entonces revalidación/coordination server impide autorizar por snapshot stale o UI manipulada. |

# 26. Política de validez e invalidación del CHECK completado

COMPLETED no implica operable; firmado UNFIT es válido como registro técnico pero bloquea salida. La validez temporal acaba al fin de operational day. Invalidation event append-only referencia inspección, source/actor/motivo/time y no modifica contenido original.

Causas D05: incidente/daño reportado; nueva anomalía seguridad; invalidación explícita autorizada MECANICO/LOGISTICA con razón; work/completion maintenance explícitamente marcado requires_reinspection. No ampliar estas causas a cambio documental/config o cualquier correctiva por defecto. Policy scope/source produce los eventos idempotentes definidos en contrato.

# 27. Slice 0 y activación

Sólo documentación; no production feature code ni migrations ejecutadas. Paquete Slice0 aprobado; EWO015 Ready técnicamente, sin ejecución autorizada. EWOs016–022 conservan gates por dependencias, sin reabrir owner D01–D14/R01–R05. Inputs numéricos/datos/runtime no se presumen configurados; no son nuevas decisiones de owner.

# 28. Políticas V1 adoptadas y pruebas de borde

## R01–R05 adoptadas — owner, 2026-10-01

El owner aprobó el paquete Slice0 y estas políticas; son target aprobado, no configuración desplegada ni permiso para producción. D01–D14 permanecen sin cambios.

| ID | Política V1 adoptada |
|---|---|
| R01 | Facility configurable por vehículo; despliegue inicial puede usar un facility Team Mex. Timezone America/Mexico_City. Día operacional calendario local 00:00–23:59, implementado como intervalo [00:00, 00:00 del día siguiente) para incluir segundos/fracciones del último minuto. DAILY_AUTOMATIC sólo vehículo ACTIVA, físico EN_PATIO/disponible para preparación y sin CHECK activo. No auto generar EN_RUTA, EN_TALLER o INACTIVA. |
| R02 | Hard blockers: aceite motor crítico, refrigerante crítico, fuga visible severa, llanta severa/ponchadura y PSI fuera de límites críticos configurados. No crítico→FIT_WITH_OBSERVATION; hard→UNFIT, sin override operable. Rangos normales/críticos por posición son configuración de vehículo/tipo, no screenshots. |
| R03 | MECANICO puede claim CHECK no asignado en facility autorizado. Logistics/Admin asignan dentro de ese facility. Invalidation explícita MECANICO por hallazgos técnicos, LOGISTICA por incidentes/eventos operativos; ambos con motivo. Scope/actor no demostrable→deny. |
| R04 | Flota/Patio posee physical state EN_PATIO/EN_RUTA/EN_TALLER/INACTIVA. EN_TALLER sólo transición operacional explícita registrada, no existencia de Corrective. Divergencia journey/patio se expone como inconsistencia; jamás reconciliación silenciosa. |
| R05 | Defaults de urgencia de retorno configurables: retraso positivo <=2h ATTENTION; >2h CRITICAL. Hard operational blocker, UNFIT o documentación requerida inválida→CRITICAL. CHECK requerido/en progreso o FIT_WITH_OBSERVATION→ATTENTION. Sin causa activa→NORMAL. Thresholds en configuración persistida/versionada, no constantes hard-coded de dominio. |

Los valores numéricos PSI, listado real de vehículos/facilities, hora de invocación del scheduler y credenciales/provider son inputs de configuración de ejecución. No son nuevas OWNER_DECISION_REQUIRED: contratos config/validación/fail-closed definidos. No inventar PSI ni tomar las 2h del mock: las 2h están autorizadas aquí por owner.

AC33 además prueba 23:59:59.999 local válido y siguiente00:00 expirado, timezone distinta del host y elegibilidad excluyendo EN_RUTA/EN_TALLER/INACTIVA. AC16/34 cubren los cinco hard blockers y rangos PSI normales/críticos inclusivos anidados (criticalMin<=normalMin<=normalMax<=criticalMax): dentro critical/fuera normal→observación y fuera critical→UNFIT; fixture explícita, no seeds productivos. AC20/18 cubren scope facility y categorías técnico/operacional. AC22 exige fuente Flota y inconsistencia expuesta. AC23 exige zero/no-overdue, justo2h ATTENTION y >2h CRITICAL desde baseline due instant configurado.
