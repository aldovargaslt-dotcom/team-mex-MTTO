# Unidades — referencia de producto del GrillMe

Seguimiento 2026-10-17: [SPEC](../../docs/specs/SPEC-UNIDADES-READINESS-001.md),
[UX](../../docs/design-system/unidades-readiness-v1.md) y
[ADR028](../../docs/adr/028-configurable-abc-validity.md). Durante especificación
el usuario confirmó reemplazar vigencia diaria universal por intervalo configurable.
Ese principio ya está resuelto; otros detalles/conflictos anotados abajo conservan
su carácter pendiente. Esta nota mantiene el registro de la sesión original.

## Estado y procedencia

Fecha: 2026-10-17 (fecha del cliente). Fuente: sesión GrillMe de este chat,
respuestas Q1–Q26 y confirmación final del resumen por el usuario. El usuario
solicitó conservar los acuerdos en el dominio para referencia futura.

Dirección de producto confirmada para un rediseño futuro; no describe capacidades
verificadas del sistema actual. No es una SPEC, ADR ni autorización de ejecución.
Las diferencias con decisiones existentes se registran abajo sin modificar esas
fuentes. Área principal: Mantenimiento; relaciones con Kernel (identidad y
choferes), Flota/Logística (uso, viajes y control tower) y Salud (referencia).
No se declara un nuevo Bounded Context.

## Problema y propósito

El supervisor abre Unidades al inicio del turno para revisar la preparación de
la flota. Hoy percibe información importante escondida dentro de ficha,
jerarquía confusa y botones cuya interacción no resulta evidente.

**Unidades debe explicar qué unidades necesitan atención y por qué; ficha
debe aportar la evidencia y las acciones para resolverlo.** El supervisor debe
poder determinar qué atender primero y si una unidad puede operar, sin buscar
primero en su expediente. Una actualización visual por sí sola no resuelve esto.

## Lenguaje acordado para esta dirección

| Concepto | Significado |
|---|---|
| Daily | Unidad destinada al uso habitual; alcance inicial de la revisión del supervisor. |
| Stock | Unidad que no se usa diariamente; posible reemplazo que también requiere visibilidad de problemas críticos. No es stock de refacciones. |
| Operabilidad | Dictamen técnico del mecánico mediante revisión ABC; distinto de estar físicamente en uso. |
| Vigencia de revisión | Si el resultado de la última revisión sigue dentro de su intervalo configurado. |
| Atención de mantenimiento | Problemas, órdenes o vencimientos que requieren acción; no equivale por sí sola a un dictamen técnico. |
| Retención de seguridad | Bloqueo explícito que persiste hasta liberación técnica autorizada. |

Daily/Stock expresan uso, no una periodicidad fija. Su mapeo al catálogo actual
de tipos/categorías requiere especificación; no se introduce un enum nuevo aquí.

## Acuerdos de experiencia y operación

### Vista general de Unidades

- Tabla legible, priorizada por necesidad de atención, con búsqueda y filtros.
- Abrir por defecto en Daily; permitir consultar Stock y mantener visibles sus
  problemas críticos sin ocultar posibles unidades de reemplazo.
- Cada fila muestra identidad, Daily/Stock, operabilidad/retención, uso actual,
  última revisión y próximo vencimiento, principal problema y cantidad de órdenes
  abiertas. Las fuentes desconocidas no deben aparentar disponibilidad confirmada.
- Acciones explícitas: ver ficha, revisar órdenes e iniciar revisión, según permisos.
- El chofer no se presenta como responsable del trabajo de mantenimiento.

### Revisión ABC y periodicidad

- El mecánico realiza la rutina ABC y determina operabilidad.
- Configuración diaria, semanal, mensual o personalizada para todas las unidades.
- Precedencia acordada: configuración de flota → categoría → excepción de unidad.
  Mostrar intervalo efectivo y su origen.
- Un resultado satisfactorio permanece vigente hasta su siguiente vencimiento;
  no es obligatorio revisarlo hoy si su intervalo todavía no vence.
- Al vencer: indicar revisión requerida/vencida y operabilidad sin reconfirmar,
  conservando el último dictamen y su fecha.
- Si vence durante un viaje, mantener el hecho de que la unidad está en uso y
  advertir el vencimiento. No terminar el viaje ni generar downtime o una orden
  correctiva automáticamente por ese vencimiento. Requerir revisión vigente antes
  del siguiente despacho. Un defecto crítico sigue su proceso independiente.

### Órdenes, seguridad y utilización

- Supervisor puede crear y asignar órdenes. El detalle de asignación de trabajo
  aún requiere contrato; no se presume que exista responsable individual actual.
- Antes de crear, mostrar órdenes abiertas con problema, estado y fecha. Permitir
  abrir una existente o continuar explícitamente para un problema diferente.
  Una orden ajena al problema no debe bloquear por sí sola la creación necesaria.
- Distinguir Revisión/CHECK de mantenimiento correctivo (y conservar Preventivo
  como tipo de mantenimiento existente). No confundir revisión con reparación.
- Intención de esta sesión: la mera existencia de una orden no acredita downtime;
  utilización debe apoyarse en hechos de operación e indisponibilidad. Véase la
  diferencia con apertura explícita en ADR025, registrada abajo.
- Actualmente, según el usuario, las fallas se reportan mediante órdenes. A futuro,
  control tower de Logística podría recibir reportes y asignarlos; flujo diferido.
- Mecánico y control tower pueden imponer retención de seguridad. Una orden
  ordinaria no debe interpretarse automáticamente como un reporte de inseguridad.
- Liberación técnica por mecánico con dictamen explícito. Cerrar una orden por sí
  solo no libera la unidad ni elimina otros bloqueos.
- Completar la orden y registrar la liberación en la misma pantalla, con estado de
  unidad y bloqueos restantes visibles. Permitir completar el trabajo propio, pero
  impedir liberación si permanece cualquier bloqueo de seguridad independiente.

### Ficha de unidad

Orden de lectura acordado:

1. **¿Puede operar?** Último ABC, hallazgos, restricciones, vigencia y fecha.
2. **¿Qué necesita acción?** Problemas sin resolver, órdenes activas y mantenimiento debido.
3. **Historial:** revisiones, fallas y órdenes en secuencia cronológica, con acceso a evidencia.
4. **Ficha técnica:** identificación, especificaciones y documentos de referencia.

Abrir la unidad en su resumen operativo. Historial y Ficha técnica tienen destinos
claros. Usar etiquetas de acción como Ver revisión, Abrir orden y Ver historial;
no depender de colores o cuadrados sin propósito claro. La ficha da contexto;
la captura y liberación se realizan en el detalle de orden correspondiente.

## Diferido y requisitos conservados

- **Salud:** referencia secundaria por ahora. Un cálculo robusto/granular no es
  prioridad de esta entrega. No eliminar ni redefinir el Health Score existente
  ni inventar uno nuevo para la vista de readiness.
- **Asignación de chofer:** diferida. Conservar asignaciones fechadas e historial
  completo; mostrar chofer actual o Sin asignar y el último asignado identificado
  como tal. Asociar cada orden con la asignación vigente al crearla, sin atribuir
  causalidad por esa coincidencia temporal.
- Mecánico podrá cambiar el chofer asociado **solo a esa orden**, sin alterar la
  asignación de la unidad. Conservar asociación original, reemplazo, autor,
  fecha y motivo obligatorio de la desviación.
- Recepción de fallas desde control tower: futura; no capacidad actual afirmada.

## Reconciliación necesaria antes de especificar o implementar

La sesión se realizó antes de inspeccionar el repositorio. Preservar sus acuerdos
no equivale a resolver silenciosamente estas diferencias:

| Tema | Referencia existente | Diferencia / trabajo pendiente |
|---|---|---|
| Apertura y downtime | [ADR025](../../docs/adr/025-abc-utilization-downtime.md), decisiones 1–3 | La apertura explícita de Preventivo/Correctivo retira la unidad e inicia/se suma a downtime; borrador y CHECK están excluidos. Esta sesión no distinguió completamente crear, existir y abrir. Conciliar antes de cambiar efectos. |
| Vigencia del ABC | ADR025, decisiones 8–10; [SPEC ABC](../../docs/specs/ABC-daily-release-spec-and-gap-analysis.md) | El target existente exige día operativo base, sin extensión por recheck. Los intervalos configurables acordados aquí necesitan enmienda explícita de las reglas canónicas. |
| Inspección y orden | [ADR016](../../docs/adr/016-visita-check-evolution.md), ADR025 | Revisión/CHECK tiene dictamen y evidencia propios; no tratarla como mantenimiento realizado ni alterar eventos por compartir una superficie de órdenes. |
| Ficha e historial | [SPEC-MTTO-UX-002](../../docs/specs/SPEC-MTTO-UX-002.md), [UX ficha](../../docs/design-system/ficha-unidad-v1.md) | Conciliar jerarquía y nuevos datos de readiness con los incrementos ya documentados. No añadir timeline global entre módulos ni nuevas autorizaciones por inferencia. |

Detalles todavía abiertos: categorías superpuestas y su precedencia; definición
exacta del intervalo personalizado, zona horaria y hora de vencimiento (no quedó
aclarado si la mención a 12:00 PM era mediodía o cambio de día); permisos de
configuración; fuente/contrato de uso actual, asignación de trabajo y bloqueos.
No inventar estos detalles durante implementación.

Siguiente uso de esta referencia: conciliar los puntos anteriores y promover el
alcance correspondiente a SPEC/UX y, donde cambien decisiones canónicas, ADR.
Esta nota conserva el resultado del GrillMe sin sustituir esos artefactos.
