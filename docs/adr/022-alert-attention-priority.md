# ADR-022 — Prioridad de alertas y lectura operacional de Inicio

Estado: aceptado en el alcance autorizado por el usuario el 2026-10-11;
ver [SPEC](../specs/alert-attention-v1.md), decisiones Q1–Q10.

## Decisión

Conservar dueños y puertos de ADR-002/005/006/007/013. Andon guarda márgenes
críticos por tipo en `andon.umbrales`; Inventario guarda límite crítico por artículo
en `inventario.stock`. Defaults adicionales 30 días/1.000 km/0 piezas, sin modificar
intervalos o mínimos ya configurados. No añadir un motor compartido de evaluación.

La façade existente del catálogo expone una lectura operacional compuesta
`GET /configuracion/alertas/activas` exclusivamente Supervisor/Admin. Solicita
DTOs a servicios dueños, sin JOINs cruzados. Aísla fallos por fuente. No evalúa
reglas de severidad en JSX. El catálogo ofrece preview por tipo y audita los
guardados de sus editores en `alert_catalog.threshold_change`, con IDs opacos,
instantáneas de valores y transacción compartida mediante métodos de los dueños.

Supersession acotada: ADR-005/006 permiten además retirar un aviso cuando la
condición deja de cumplirse por nueva configuración. Se conserva RESUELTO con
visitaResolutoriaId null para ajuste; auditoría distingue el cambio de una visita.
No modificar lastClosed, consumos ni emitir VisitaCerrada. ENTERADO no cierra.
ADR-007 conserva opt-in/comparador inclusivo y añade límite crítico configurable;
el productor entrega severidad por el envelope a Notifications (fallback0 para
productores previos). Andon entrega también severidad calculada por su dueño.

La campanita sigue contando avisos sin leer; Inicio cuenta condiciones activas.
No se igualan esos números ni se fusiona su ciclo de vida. Salud/Logística quedan
fuera de Inicio de mantenimiento pero conservan sus pantallas e inbox existentes.

Migración independiente de CHECK/Auth, manual, aditiva; no ejecutar en producción
en este trabajo. Tests únicamente en base local descartable.

## Alternativas consideradas y consecuencias

- Calcular prioridad sólo en Inicio: descartado porque configuración, preview e
  inbox podrían discrepar sobre el mismo problema.
- Guardar todas las reglas en el catálogo: descartado por ownership existente;
  Inventario y Andon siguen evaluando sus propios valores.
- Convertir «visto» en cierre o añadir En atención: descartado por decisión Q6;
  el trabajo actual sólo cambia al corregir el dato fuente.

La façade evita lecturas N+1 desde JSX y conserva fallos por fuente, a cambio de
coordinar servicios ya existentes. Guardado de configuración y auditoría es
transaccional; las proyecciones inbox se reconcilian después de confirmar, por sus
puertos existentes. Un fallo de reconciliación posterior requiere reintento; el
ajuste y su auditoría no se pierden. El preview es una instantánea, no una reserva
ni promesa de que no cambiarán existencias entre revisar y confirmar.

## Ownership

Fecha: 2026-10-11. Owner: usuario de esta conversación de Codex.
Aprobación: decisiones Q1–Q10 y autorización de usar defaults para construir.
Ejecución: [EWO-034](../engineering-work-orders/EWO-034.md).
