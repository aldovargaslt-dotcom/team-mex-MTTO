# SPEC-UNIDADES-READINESS-001 — Unidades como revisión de preparación de flota

## Status

**Approved for bounded implementation — EWO-056, 2026-10-17.** El usuario indicó
“Go ahead and build it” tras revisar la SPEC/UX. Se adoptan las decisiones de
calendario, permisos y contratos descritas en
[UNIDADES-READINESS-001](../contracts/UNIDADES-READINESS-001-contract.md).
La dirección proviene del [GrillMe confirmado](../../domain/mantenimiento/unidades-readiness-grillme-2026-10-17.md).
Implementación y evidencia: [EWO-056](../engineering-work-orders/EWO-056.md).
La aprobación de build no autoriza deploy ni ejecución de migraciones externas.

Este incremento consume operabilidad, órdenes y uso existentes y añade programación,
retenciones ligadas a OT y verificación personal firmada. El ledger de downtime,
reportes de utilización y el programa completo ABC/UTIL conservan su propio alcance;
no se declaran implementados por esta vista. Sus gates de seguridad se preservan.

## Problem

Unidades no permite identificar rápidamente qué requiere atención al iniciar
turno. Ficha concentra información sin jerarquía suficiente y sus acciones no
siempre son reconocibles. El rediseño debe explicar situación, razón y siguiente
acción antes de exigir exploración del expediente.

## Context

Inspección dirigida de fuente local, 2026-10-17; no prueba de despliegue:

| Evidencia | Situación observada |
|---|---|
| `web/src/app/unidades/page.tsx` | Acceso Supervisor/Admin; catálogo, tipos, Andon y filtros URL q/tipo/estado/atencion. No se verificó un contrato agregado de readiness. |
| `web/src/app/unidades/[id]/page.tsx` | Lecturas hub y health separadas; varias órdenes, navegación de ficha e historial existente. |
| `api/src/unidades/unidades.controller.ts` | Lecturas catálogo, hub y health. No asumir que esas lecturas ya contienen todas las fuentes aquí requeridas. |
| ADR016/017/020/025 y SPEC ABC/UTIL | Revisión separada de mantenimiento, día operativo ABC y apertura explícita con downtime; contradicciones con parte del GrillMe requieren resolución explícita. |

## Goals

- Revisar Daily al inicio del turno y detectar también problemas críticos de Stock.
- Distinguir operabilidad, vigencia ABC, uso actual, mantenimiento y seguridad.
- Abrir evidencia y actuar desde el contexto de la unidad sin duplicar órdenes.
- Conservar expediente técnico e histórico y permisos existentes.

## Non-goals

Nuevo score de Salud, productividad del mecánico, GPS, timeline global de módulos,
reasignación real de choferes, nuevo reporte de fallas/control tower, rediseño del
ABC clínico, costos adicionales o dashboard de utilización. Los requisitos de
chofer quedan conservados en la referencia de dominio, fuera de este incremento.

## Actors

| Actor | Capacidad en este incremento |
|---|---|
| SUPERVISOR | Revisión de flota/ficha, gate de órdenes y acciones de mantenimiento autorizadas. Asignación de mantenimiento con candidatos activos publicados por Auth, sin exponer administración de accesos. |
| ADMIN_DIRECTIVO | Lectura y funciones de catálogo existentes. Configura periodicidad/uso dentro de su facility; no obtiene firma técnica por ello. |
| MECANICO autorizado/asignado | Inspección y firma personal, cierre solo conforme a permisos existentes, liberación técnica de bloqueos elegibles. No inferir acceso general a /unidades. |
| LOGISTICA / control tower | Retención de seguridad según capacidad a especificar; conserva sus superficies y permisos. No obtiene escritura de mantenimiento por ver estado compartido. |

## Functional Behavior

### F1 — Lista de preparación

`/unidades` pasa a ser lista operativa para Supervisor; acceso Admin conservado.
Default Daily, con Stock y Todas disponibles. La clasificación de uso es
independiente de ACTIVA/INACTIVA y no se deriva de un viaje abierto. No excluir
unidades indisponibles dentro del alcance. Unidades sin clasificación aparecen
en Todas y se informa su cantidad; no clasificarlas silenciosamente como Daily.

Fuera de Stock, mostrar un aviso compacto con cantidad y enlace a sus problemas
críticos, conservando el alcance principal. Error en esa fuente se informa como
Stock sin confirmar; nunca como cero problemas.

Cada fila: identificación/número/placas, Daily/Stock, dictamen técnico y fecha,
retención/bloqueos, uso actual con fuente/fecha, vigencia y próxima revisión,
problema principal, conteo de órdenes abiertas y acceso a ficha. No equiparar
ACTIVA con operable ni chofer con responsable de mantenimiento.

Propuesta de orden estable: bloqueos de seguridad/no apta; evidencia requerida
desconocida o revisión vencida; otros problemas de mantenimiento; sin pendientes
conocidos. Mostrar todas las razones al abrir la ficha. Dentro del nivel, ordenar
por vencimiento aplicable más antiguo, número interno e ID estable. No inventar
severidad para una orden que no la aporta. Salud no decide el orden.

Buscar por número interno/placas; filtrar uso, tipo, operabilidad, revisión y
órdenes abiertas. Mantener filtros, orden, posición/página y retorno al abrir ficha.
Preservar URLs existentes q/tipo/estado/atencion mediante compatibilidad explícita;
estado sigue siendo administrativo, no se redefine como operabilidad.

### F2 — Readiness explicable

Presentar hechos separados, con referencias y fecha de fuente:

| Dimensión | Comportamiento |
|---|---|
| Dictamen | Último ABC firmado y dictamen efectivo de su política. Sin firma/evidencia no inferir aptitud. FIT_WITH_OBSERVATION no autoriza inventar restricciones de ruta. |
| Vigencia | Vigente, por vencer si existe umbral aprobado, vencida, sin revisión o sin confirmar. Mostrar última y próxima fecha; no inventar umbral de por vencer. |
| Seguridad | Retenciones persistentes, hallazgos/rechecks pendientes y motivo. Cierre de orden no elimina bloqueos ajenos. |
| Operación | En uso/viaje y fuente operacional; sin fuente confiable, Sin confirmar. No fabricar retorno ni ubicación física. |
| Mantenimiento | Órdenes preparadas/abiertas, problemas y vencimientos según sus dueños. |

Solo comunicar disponibilidad técnica confirmada cuando todos los requisitos
técnicos aplicables estén satisfechos y vigentes. Eso no equivale a autorización
de salida: seguro, elegibilidad administrativa, inspecciones requeridas y gates
de Logística/Flota siguen aplicando en servidor.

### F3 — Periodicidad configurable (principio aceptado en ADR028; detalle G2)

Dirección confirmada: diaria, semanal, mensual o personalizada; todos los usos
pueden usar cualquier intervalo. Herencia flota → categoría → unidad; mostrar
valor efectivo, origen y excepción. Quitar excepción recupera herencia.
Esta cadencia es de revisión ABC, no el umbral de mantenimiento Andon.

Calendario adoptado en el contrato de ejecución: zona operacional
America/Mexico_City existente; diaria hasta el inicio del siguiente día local,
semanal/mensual desde la firma usando calendario local (mes corto se ajusta al
último día), personalizada como duración positiva con unidad explícita. Vigencia
en intervalo semiabierto: al alcanzar dueAt ya está vencida. Mostrar fecha/hora y
zona; no usar zona del navegador para cambiar decisiones. Custom usa horas enteras 1–8760. El contrato versiona política y deadline al review; firma revalida cambios y vencimiento.

Cambiar periodicidad nunca reescribe firmas ni renueva automáticamente un dictamen
vencido/no apto. La nueva política rige futuras revisiones; las ya
firmadas retienen versión/dueAt. Auditar actor, antes/después y fecha efectiva.
Un mismo cambio administrativo no elimina retenciones.

Scheduler no debe crear revisiones duplicadas ni generar mantenimiento/downtime
por vencimiento. Su elegibilidad y nuevas claves de período requieren extensión
explícita de ADR020/contrato CHECK; no reutilizar sin más unit+operational_date
para prometer intervalos arbitrarios.

### F4 — Vencimiento durante viaje y downtime

Si vence en viaje: conservar viaje/uso, último dictamen y evidencia; mostrar
Revisión vencida. No generar retorno, fin de viaje, downtime o correctivo por
vencimiento. Bloquear siguiente despacho hasta satisfacer revisión y demás gates;
el vencimiento solo no registra una avería. Una falla crítica real es independiente.

Compatibilidad preservada con ADR025: crear borrador, preparar correctivo y
realizar CHECK no inicia downtime. **Abrir explícitamente Preventivo/Correctivo
sí confirma retiro e inicia/se suma a downtime.** Si sucede en viaje, conservar
el viaje y confirmar indisponibilidad actual. No inferir downtime de simple
conteo/tipo/existencia de orden. No recalcular históricos con la UI nueva.

### F5 — Gate de órdenes existentes

Antes de confirmar nueva orden cargar órdenes autorizadas no terminales de la
unidad, con identificador, tipo, problema, estado y fecha. Ofrecer Abrir orden y
Crear otra orden. Continuar para problema distinto es explícito; no fusionar ni
cancelar automáticamente. Gate aplica a todos los puntos de creación que atienda
este incremento y respeta exclusividad de CHECK y restricciones vigentes.

Si falla la lectura, no representar lista vacía ni continuar silenciosamente.
Servidor revalida restricciones y estado ante carreras; devuelve conflicto
accionable con referencias permitidas. El aviso de posibles duplicados no crea
una prohibición global de múltiples mantenimientos. Retry con resultado incierto
reconcilia por identidad de comando antes de crear de nuevo; contrato requerido.

### F6 — Ficha y acciones

Conservar rutas, IDs, enlaces profundos y cuatro secciones: Resumen, Ficha técnica,
Mantenimiento, Historial. Abrir por defecto Resumen. Orden de lectura:
operabilidad/ABC y bloqueos; problemas/órdenes; acceso a historia y datos técnicos.
Las órdenes activas son visibles en resumen, detalle en Mantenimiento. Historia
de revisiones y mantenimiento identifica tipo, fecha, dictamen/cierre y evidencia,
sin transformar CHECK en mantenimiento ni duplicar eventos. Conservar funciones
históricas/costos existentes de SPEC-MTTO-UX-002; no ampliar su alcance financiero.

Acción principal contextual: Verificar reparación para mecánico asignado cuando
corresponde; Ver revisión/Iniciar revisión si tiene permiso y es el siguiente paso;
Abrir orden si hay una pertinente; Revisar órdenes si hay varias; Nueva orden
para Supervisor autorizado sin siguiente trabajo existente. Etiquetas definitivas
y precedencia UX abajo; si no puede escribir, ofrecer lectura y explicar motivo.
No añadir al Supervisor facultad de firmar ABC por presentar un botón.

### F7 — Cierre y liberación en misma superficie

Detalle de orden permite terminar trabajo y, al mecánico autorizado, verificar
reparación/liberar bloqueos técnicos elegibles en la misma pantalla. Mostrar
hallazgos nombrados, evidencia requerida, firma propia y otros bloqueos antes de
confirmar. No añadir un checkbox Liberar que eluda el recheck firmado.

Una experiencia guiada puede enlazar comandos/registros distintos: cierre,
verificación y nueva revisión si corresponde. Conservar ABC original, fuentes,
firmas y resultados. Cerrar puede tener éxito y liberación fallar; mostrar ambos
resultados y conservar retención. No afirmar éxito global con persistencia parcial.
El mecánico no resuelve motivos operacionales ajenos. El usuario acordó liberar
solo sin bloqueos restantes; verificar elegibles no autoriza salida por sí mismo.

## Business Rules / State Transitions

| Evento | Cambia | Conserva |
|---|---|---|
| ABC firmado apto | Dictamen/vigencia según política y revisión efectiva | Retenciones independientes, viaje y downtime |
| Se alcanza dueAt | Vigencia a vencida | Dictamen histórico, viaje, ubicación y ledger |
| Retención reportada por actor autorizado | Bloqueo técnico/seguridad trazable | Evidencia original y otros motivos |
| Orden completada | Su trabajo/motivo elegible | Otros motivos, verificación pendiente, gates de salida |
| Verificación firmada válida | Solo obligaciones técnicas elegibles verificadas | Bloqueos ajenos y ABC original |
| Cambio de programación | Política para revisiones futuras, propuesta G2 | Historial firmado, holds y viajes |

No introducir un único enum editable que colapse esas dimensiones. Operabilidad
efectiva y urgencia se derivan en servidor de hechos y políticas versionadas.

## Domain Implications / Constraints

Mantenimiento conserva revisiones, trabajo técnico y downtime; Kernel identidad;
Flota movimientos; Logística viajes/razones operativas; Salud su score. Lecturas
por puertos autorizados con IDs opacos, sin JOIN/FK o escrituras cruzadas nuevas.
Sin nuevo Bounded Context. No modificar VisitaCerrada, consumidores, inventario o
cadencia de mantenimiento por completar un CHECK.

Lectura agregada paginada debe evitar un request hub/health por unidad. Contrato
pendiente: filtro/orden/paginación estable, scope/facility, snapshots y freshness,
fuentes fallidas y referencias de evidencia; servidor calcula prioridad global
antes de paginar. Conteos usan el mismo alcance/revisión, no tamaño de página.
Datos obsoletos quedan identificados y nunca autorizan comandos. Writers revalidan
gates bajo concurrencia. API aplica identidad confiable, rol y facility; UI no es
barrera de seguridad. No filtrar por omisión datos que el actor no puede leer.

Presupuesto cuantitativo de rendimiento se fija con volumen real antes del EWO;
verificar número acotado de consultas por página, no crecimiento por fila.
Modelo/migraciones, backfill Daily/Stock y nuevas políticas aún no aprobados.

## Failure Behavior / Edge Cases

Fuente caída o contradictoria: conservar hechos conocidos, marcar Sin confirmar
en la dimensión afectada y ofrecer Reintentar. Sin revisión no significa apta;
sin órdenes no significa lista. Política ausente/ambigua no fabrica dueAt.
No clasificar usando coincidencias del nombre STOCK. Múltiples categorías sin
precedencia rechazan configuración hasta resolver; no escoger arbitrariamente.
Resultados cambiados mientras se firma invalidan revisión/confirmación y muestran
estado vigente. Reintentos no duplican órdenes, firmas o liberaciones. Sin historial
mostrar vacío honesto. Cambio de mes, hora límite, custom inválido, deep links,
roles sin capacidad, orden cerrada y retención concurrente tienen casos negativos.

## Acceptance Criteria

AC canónicos para este incremento; **planificados**, no verificados.

| ID | Given / when / then |
|---|---|
| UR-01 | Supervisor abre Unidades sin filtros: ve Daily, incluidos sus bloqueos, y acceso a Stock/Todas; desconocidos de clasificación no se inventan Daily. |
| UR-02 | Hay Stock crítico fuera de filtro: muestra cantidad/enlace; fuente caída informa Sin confirmar en lugar de cero. |
| UR-03 | Una fila muestra identidad, uso, dictamen/fecha, vigencia/dueAt, bloqueos, problema y conteo de órdenes con fuentes; ACTIVA o cero órdenes no produce Lista. |
| UR-04 | Prioridades mezcladas/paginadas: orden global estable por F1; razones visibles; score de Salud no determina prioridad. |
| UR-05 | Buscar/filtrar/abrir ficha/volver conserva alcance, filtros y navegación; URLs históricas siguen significando lo mismo. |
| UR-06 | Política heredada/excepción: calcula flota→categoría→unidad, muestra origen; quitar excepción recupera herencia; ambigüedad no se resuelve arbitrariamente. |
| UR-07 | Revisión apta válida: permanece vigente sin revisión hoy si la política aprobada lo permite; en dueAt pasa a vencida; cubre zona, borde, mes corto y custom. ADR028 y contrato de ejecución definen el cálculo. |
| UR-08 | Vence revisión durante viaje: viaje y dictamen histórico permanecen, hay advertencia y siguiente despacho falla hasta cumplir gates; no crea downtime/correctivo/retorno. |
| UR-09 | Crear borrador/CHECK no inicia downtime; apertura explícita de mantenimiento sigue la política resuelta G4 y conserva viaje/ubicación; apertura en ruta comunica efecto. |
| UR-10 | Nueva orden con otras abiertas: gate lista contexto y permite abrir existente o continuar explícitamente para otro problema; no merge automático. |
| UR-11 | Gate con error, doble submit o creación concurrente: no informa vacío ni duplica; servidor aplica invariantes y entrega conflicto/reconciliación accionable. |
| UR-12 | Ficha abre Resumen con ABC/bloqueos y trabajo activo primero; cuatro secciones accesibles y enlaces a evidencia, historial y técnica conservados. |
| UR-13 | Actor sin permiso o fuera de facility no ejecuta configuración, inspección, retención, cierre/liberación ni ve datos protegidos; deep link no evade API. |
| UR-14 | Mecánico/control tower autorizado retiene: bloqueo persiste al cerrar orden; solo mecánico autorizado verifica/libera los técnicos elegibles. |
| UR-15 | Cierre y verificación comparten pantalla; firma personal sobre hallazgos actuales, preserva ABC; cierre exitoso/liberación fallida se muestran separados. |
| UR-16 | Otra retención/recheck/razón activa o concurrente permanece: no muestra unidad liberada ni habilita salida por cerrar/verificar una orden. |
| UR-17 | Cambio de periodicidad no cambia firma histórica ni quita hold; auditoría y efecto temporal siguen G2; permisos siguen G3. |
| UR-18 | Fallo parcial/unknown/stale: muestra dimensión y fecha afectada, conserva hechos buenos; reintentar no finge actualización completa. |
| UR-19 | Historial mixto CHECK/maintenance conserva identidad, evidencia y vistas previas; CHECK no emite mantenimiento realizado ni modifica stock/cadencia. |
| UR-20 | En 390/1024/1440 y teclado: información crítica y acciones alcanzables, foco visible, objetivos 44px, sin color como única señal ni overflow de página. |
| UR-21 | Página con varias unidades usa lectura paginada agregada y conteos consistentes; no hace hub/health por fila. |
| UR-22 | Salud es secundaria y no recalculada por este incremento; chofer/asignación futura no condiciona readiness ni crea responsable ficticio. |

## Dependencies / Related ADRs

- [PRD](../prds/unidades-readiness-v1.md), [UX](../design-system/unidades-readiness-v1.md).
- [SPEC ficha existente](SPEC-MTTO-UX-002.md), [ABC](ABC-daily-release-spec-and-gap-analysis.md), [UTIL](SPEC-UTIL-INPUTS-001.md).
- [ADR016](../adr/016-visita-check-evolution.md), [ADR017](../adr/017-check-movement-seam.md), [ADR018](../adr/018-mecanico-auth-signature-identity.md), [ADR020](../adr/020-check-storage-migrations-scheduler.md), [ADR025](../adr/025-abc-utilization-downtime.md).
- [ADR028](../adr/028-configurable-abc-validity.md): aceptación explícita de vigencia configurable, enmienda acotada al día universal; calendario detallado en el contrato de ejecución EWO-056.
- Contratos CHECK/ABC-UTIL y safety matrix vigentes: no sustituirlos desde UI.

## Resolución de gates para este incremento

| Gate | Resolución |
|---|---|
| G1 · Vigencia | Usuario confirmó sustituir día universal por intervalo configurable; ADR028. |
| G2 · Calendario | America/Mexico_City; diaria al siguiente día, semanal/mensual calendario local con clamp, custom 1–8760 horas. Captura al review y revalidación al firmar; cambios no renuevan firmas previas. Scheduler serializado por unidad y ledger por período debido, admite varios períodos en un día sin duplicar CHECK activo. |
| G3 · Permisos | Admin configura su facility; Supervisor asigna a mecánicos activos del directorio autorizado. Mecánico/control tower retienen contra OT; mecánico firma verificación propia. No nuevos poderes de cierre ni liberación operacional. |
| G4 · Apertura | Se conserva el significado de apertura de ADR025. Crear borrador/CHECK no retira; apertura explícita bloquea operación. Este incremento no implementa el ledger/reportes UTIL ni fabrica downtime al vencer. |
| G5 · Contratos/datos | Contrato de ejecución, lectura por lotes, clasificación explícita heredada sin heurísticas, versiones esperadas, claves idempotentes y migración aditiva controlada. Histórico sin política conserva su deadline. |
| G6 · Integración | EWO-056 autorizado; verificación en evidencia. El programa mayor ABC/UTIL/safety matrix conserva sus dependencias; este corte no afirma completarlo. |

## Traceability and impact

PRD anterior explica alcance. [Mantenimiento](../../domain/mantenimiento/CONTEXT.md)
es punto de entrada; no cambia ownership. Fuente de requisitos: GrillMe Q1–8/20
→ F1/F2; Q9/12/13/15 → F3/F4; Q10/16 → F4/F5; Q14/17/18/21/22 → F6/F7;
Q11 → F6; Q19/23–26 → diferidos. No se promete disponibilidad actual.

Cambios previstos: UI lista/ficha/gate/cierre; contrato agregado; configuración
versionada y posible backfill/migración sujeto a diseño; no endpoint exacto ni
schema elegidos aquí. Conservar historial, rutas y permisos del incremento previo.

## AC-to-test plan

| AC | Plan de validación | Evidencia |
|---|---|---|
| UR-01–05 | Integración API de scope/orden/filtros/páginas + tarea UI Daily/Stock/back | Pendiente |
| UR-06–09,17 | Unit tests de policy/calendario + integración PostgreSQL/cambios y viaje | Resultados en evidencia EWO-056 |
| UR-10–11 | Integración creación/gate, permisos, fallos y carrera con dos comandos | Pendiente |
| UR-12,19,22 | Lecturas mixtas + regresión de historial/efectos CHECK + revisión UI | Pendiente |
| UR-13–16 | Integración de roles/facility, firmas obsoletas, retención concurrente y fallo parcial | Resultados en evidencia EWO-056 |
| UR-18,21 | Fallo de cada fuente, freshness/snapshot y consultas por página | Pendiente; contrato |
| UR-20 | Click-through sin Playwright, teclado y screenshots 390/1024/1440 + Visual QA independiente | Pendiente |

## Entrega futura / riesgos

Cortes candidatos, no EWOs aprobados: A lectura agregada + overview/ficha;
B programación y compatibilidad ABC; C gate/acciones y cierre-verificación.
A debe mostrar política actual y estados honestos mientras B no esté entregado;
no simular campos con defaults. Dependencias exactas se fijan por contratos.

Riesgos: prolongar aptitud indebidamente por calendario; ocultar Stock crítico;
atribuir downtime a un check; liberar con otro bloqueo; perder funciones de ficha
previas; asumir responsables/choferes actuales inexistentes. Los contratos y pruebas negativas delimitan el incremento; resultados y límites constan en evidencia EWO-056. No ejecutar migraciones, cambios de permisos ni deploy aquí.

## Enmienda vigente — 2026-10-18 / EWO-060

Pedido explícito del usuario sustituye clasificación Daily/Stock e intervalos
configurables por chequeo diario universal. ADR029/contrato actualizado gobiernan
UR06–09/17 y presentación de alcance: una lista, sin selector uso ni programación.
Historia de configuración y firmas se conserva; elegibilidad y no duplicación
CHECK no cambian. Worker diario con reintentos conectado a lifecycle API. Vigencia
operativa diaria sin actualizar evidencia histórica. Demás AC se conservan.
