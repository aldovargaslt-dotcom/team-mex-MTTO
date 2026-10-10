# SPEC-SUPERVISOR-DOMAIN-002 — Atención de mantenimiento por rol

## Estado

**Proposed.** Regla de producto indicada por el owner el 2026-10-10: cada rol ve lo relevante de su dominio operativo. Para Supervisor, el ámbito de trabajo comprende mantenimiento vencido, órdenes de trabajo, stock bajo, comprobantes de compras externas y salud de unidad. Este documento especifica los dos huecos detectados: audiencia del inbox y resumen de órdenes abiertas en Inicio. No autoriza implementación ni despliegue por sí solo.

## Problema y contexto

1. `GET /notifications`, su badge y las acciones de lectura usan `userId`, pero no el rol. La campanita de Supervisor puede incluir `LOGISTICA` y enlazar a Flota. El catálogo de tipos sí filtra por familia; ese filtro no protege el inbox.
2. Inicio muestra condiciones abiertas de Andon, Inventario, compras externas y Salud, pero omite el resumen de órdenes `BORRADOR` aprobado en [SPEC-SUPERVISOR-EXPERIENCE-001](supervisor-experience-v0.md) AC-01. [EWO-010](../engineering-work-orders/EWO-010.md) lo dejó pendiente porque la lectura por unidad produciría N+1 solicitudes.

El producto agrupa estas tareas en la **experiencia de mantenimiento del Supervisor**. Andon, Inventario, Salud, Mantenimiento y Notifications conservan sus dueños, reglas y persistencia. No se declara un nuevo bounded context.

## Objetivos

- Mostrar y contar en el inbox solo notificaciones del ámbito visible para el rol activo, con autorización en servidor.
- Dar al Supervisor, desde Inicio, un conteo accionable de órdenes de mantenimiento en borrador sin duplicar el panel de Órdenes.
- Conservar las acciones existentes: revisar Andon, trabajar una OT, atender stock, adjuntar ticket y consultar Health.

## Fuera de alcance

- Crear eventos de inbox para una OT abierta o un ticket pendiente; ambos son tareas visibles en Inicio y en sus pantallas dueñas.
- Unificar schemas, productores, umbrales o ciclos de vida de Andon, Inventario, Salud, Flota y Notifications.
- Inventar prioridades, SLA, vencimiento de OT, asignación individual, estados nuevos o una bandeja de técnicos.
- Cambiar CHECK, permisos por patio, WhatsApp, `NotifyPort`, o el catálogo de tipos de alerta.
- Sustituir el panel `/ordenes` por un listado dentro de Inicio.

## Actores y audiencia

| Rol activo verificado | Fuentes visibles en campanita / inbox | Resumen de borradores en Inicio |
|---|---|---|
| `SUPERVISOR` | `ANDON`, `INVENTARIO`, `SALUD` | Sí |
| `LOGISTICA` | `LOGISTICA` | No |
| `ADMIN_DIRECTIVO` | Todas las fuentes actuales | No; su vista de Órdenes continúa mostrando solo cerradas |
| `MECANICO` | Sin acceso al inbox actual | No |

`sourceModule` identifica los productores actuales; esta tabla no asigna ownership nuevo. Una fuente futura requiere una decisión explícita de audiencia antes de hacerse visible a Supervisor o Logística. Una fuente desconocida no se entrega por defecto a esos roles. El rol activo debe estar entre los concedidos al actor autenticado; el encabezado del navegador no concede permisos.

## Comportamiento funcional

### Inbox y campanita

1. `GET /notifications` aplica audiencia por rol **antes de devolver** filas, tanto con el filtro por defecto (`unread`) como con `filter=all`. Conserva el filtro de vigencia y el orden actual.
2. `GET /notifications/badge` cuenta solo notificaciones vigentes, no leídas y visibles para el rol activo. El número coincide con la lista `unread` de ese rol.
3. `POST /notifications/:id/read` solo puede marcar un ítem visible para el rol activo. Para un ítem existente pero fuera de audiencia, responde `404` sin revelar su contenido ni cambiar su lectura.
4. `POST /notifications/read-all` afecta solo los ítems no leídos y visibles para el rol activo. Cambiar de rol no marca ni borra ítems de otro ámbito.
5. El estado de lectura permanece **por usuario e ítem**. Un mismo ítem visible para Supervisor y Admin no obtiene estados de lectura separados por rol. Marcarlo leído no resuelve la condición fuente ni altera su vigencia.
6. La interfaz no ofrece a Supervisor enlaces de notificación a `/flota`. Inicio continúa leyendo Andon y stock desde sus APIs dueñas, pendientes desde Inventario y alertas de Salud desde el inbox; las filas de Salud en Inicio no dependen del estado leído.

### Órdenes abiertas en Inicio

7. Mantenimiento proporciona una lectura agregada autorizada para Supervisor con un entero no negativo `openDraftCount`: número de órdenes de mantenimiento `BORRADOR` visibles en `/ordenes`. Excluye cerradas, CHECK y filas que el panel de Órdenes no presenta al Supervisor. Debe reflejar el mismo criterio de visibilidad que esa cola.
8. Si `openDraftCount > 0`, Inicio muestra **Órdenes abiertas: N** y un enlace a `/ordenes?cola=abiertas`. No duplica filas, acciones ni detalles de la orden. Si vale cero, omite ese resumen.
9. Al volver a Inicio después de crear, cerrar o eliminar una OT, se vuelve a consultar el conteo. No se presenta un valor cacheado como actual.
10. Si falla la lectura del conteo, Inicio muestra un error específico de Órdenes y conserva las otras fuentes de atención; no convierte el fallo en cero ni oculta la cola existente.

## Reglas de negocio y fronteras

- La condición que abre o cierra cada alerta sigue bajo su módulo dueño. `Enterado` en Andon y `readAt` en Notifications no resuelven una alerta.
- Inventario conserva `min_qty`, stock, consumo y comprobantes; un ticket pendiente es trabajo operativo, no un evento nuevo del inbox en este corte.
- Mantenimiento posee el agregado de órdenes. La lectura de conteo no crea, cierra, reasigna ni modifica una visita.
- Salud mantiene su score y alerta derivada; el inbox no calcula Health.
- La segregación de audiencia se aplica en la API, incluida la lectura directa sin la UI web. El filtro visual por sí solo no satisface este SPEC.

## Contratos y decisiones arquitectónicas pendientes

- Se requiere un **contrato agregado de lectura de Mantenimiento** para `openDraftCount`. La ruta HTTP, el propietario del read model y su relación con la API legacy/canónica de órdenes se fijarán en ADR/contrato antes del EWO de implementación. La operación debe evitar consultar `/unidades/:id/visitas` por cada unidad desde Inicio.
- La audiencia del inbox necesita un addendum o ADR sucesor a [ADR-006](../adr/006-notifications-schema.md), que declara un inbox compartido para Supervisor y Admin, y debe reconciliar la extensión de Flota. No se modifica el texto histórico aceptado en silencio.
- No se prevé migración de datos para la audiencia: las filas existentes permanecen y cambian solo las lecturas y acciones autorizadas. Si el ADR decide persistir audiencia por ítem, deberá actualizar este SPEC antes de implementar.

## Estados de UI y fallos

- **Carga:** Inicio distingue carga de excepciones y carga del resumen de OT; la campanita no bloquea la navegación.
- **Vacío:** cero borradores omite el resumen; una lista visible vacía muestra `Sin alertas` y badge sin número.
- **Error parcial:** fallar el agregado de OT no es `0`; fallar una fuente de alertas no borra las demás.
- **Permiso:** un rol no autorizado recibe `403`; un ID de inbox fuera de su audiencia responde `404` en la acción por ID.
- **Éxito:** badge, lista y `read-all` comparten el mismo conjunto visible; el enlace de Inicio abre la cola `abiertas`.
- El layout de Inicio conserva la jerarquía mobile-first ya aprobada en [UX Supervisor](../design-system/ux-supervisor-experience-v0.md); no se añade dashboard ni CTA principal nuevo.

## Criterios de aceptación

- **AC-01 — Lista por rol.** Dado un inbox con ítems activos de `ANDON`, `INVENTARIO`, `SALUD` y `LOGISTICA`, Supervisor recibe solo los tres primeros, Logística solo el último y Admin los cuatro, tanto en `unread` como en `all`.
- **AC-02 — Badge coherente.** Para cada rol, el badge coincide con la cantidad visible no leída; un ítem de otro ámbito nunca incrementa el badge.
- **AC-03 — Acciones seguras.** Supervisor no puede leer por ID ni marcar por `read-all` un ítem de Logística; Logística no puede hacerlo con un ítem MTTO. La acción por ID responde `404` y no muta `readAt`.
- **AC-04 — Actor multirrol.** Cambiar entre Supervisor y Admin con una cuenta que posee ambos roles cambia el conjunto visible sin ampliar los permisos concedidos. Un encabezado falsificado con rol no concedido no permite ver ni marcar ítems de ese rol.
- **AC-05 — Vigencia y lectura.** Un ítem visible ya leído aparece con `filter=all` mientras su condición siga activa; un ítem expirado no aparece ni cuenta. Marcar leído no resuelve la fuente.
- **AC-06 — Conteo de OT.** Con cero, una y varias OT `BORRADOR` visibles, Inicio omite, muestra `1` o muestra el número correspondiente; nunca cuenta cerradas ni CHECK. El número coincide con la cola de Órdenes.
- **AC-07 — Navegación de OT.** El resumen enlaza a `/ordenes?cola=abiertas` y no replica lista ni acciones. Al volver a Inicio tras crear, cerrar o eliminar, el conteo refleja el estado vigente.
- **AC-08 — Fallo aislado.** Si falla la lectura agregada, se informa el error de Órdenes sin mostrar `0` ficticio y Andon, stock, pendientes y Salud siguen visibles cuando sus lecturas funcionan.
- **AC-09 — Desempeño.** La carga de Inicio realiza una lectura agregada acotada para el conteo, sin una petición de visitas por unidad ni una carga de todos los detalles de OT.
- **AC-10 — Encapsulación UI/API.** Con rol Supervisor no se entrega un deeplink de inbox a `/flota`; acceso directo a endpoints de Flota sigue denegado. Configuración → Alertas mantiene su filtro MTTO actual.

## Dependencias y trazabilidad

- Producto: regla de encapsulación por roles dada por el owner en esta conversación; [SPEC Supervisor](supervisor-experience-v0.md) AC-01/02/05/07 y [SPEC Alert Catalog](alert-catalog-v0.md) BR-02/03/06.
- Áreas: [Mantenimiento](../../domain/mantenimiento/CONTEXT.md), [Notifications](../../domain/notifications/CONTEXT.md), [Inventario](../../domain/inventario/CONTEXT.md), [Andon](../../domain/andon/CONTEXT.md), [Salud](../../domain/salud/CONTEXT.md). Flota/Logística solo como límite de audiencia, sin cambiar sus productores.
- Estado actual: `web/src/app/inicio/page.tsx`, `api/src/notifications/notifications.controller.ts`, `api/src/notifications/inbox-engine.ts`, `api/src/visitas/visitas.service.ts` y [EWO-010](../engineering-work-orders/EWO-010.md).
- Datos/migración: ninguna prevista según la solución descrita; sujeto al ADR de audiencia.
- API: cambia la semántica de los cuatro endpoints de Notifications según rol; agrega una lectura agregada de Mantenimiento cuyo path se decidirá en ADR/contrato.
- UI: añade solo el resumen/enlace de OT aprobado; la lista y la campanita conservan sus controles.

## Plan de verificación (sin resultados aún)

| AC | Comprobación prevista |
|---|---|
| 01–05, 10 | Unit tests de audiencia + HTTP e2e de lista, badge y acciones con cuatro fuentes, tres roles y actor multirrol |
| 06–07 | Integración del agregado contra OT abiertas/cerradas/CHECK; recorrido de Inicio → Órdenes → regreso |
| 08 | Error parcial simulado de la lectura agregada en Inicio |
| 09 | Prueba de contrato/consulta que demuestre una lectura agregada sin N+1 |
| UI | Proof mobile 390 y desktop 1440 de Inicio con cero/varias OT y campanita por rol; revisión visual independiente |

## Riesgos y supuestos

- **Confirmado:** el inbox actual no recibe rol al listar, contar o marcar leído; el resumen de borradores sigue bloqueado en EWO-010.
- **Supuesto de este SPEC:** Admin conserva visibilidad de todas las fuentes actuales; Logística solo Flota; Supervisor solo fuentes MTTO actuales. Esto sigue el filtro del catálogo y la regla expresada por el owner, pero requiere reconciliar ADR-006.
- **Pendiente antes de implementación:** ADR de audiencia y contrato agregado; definir allí la ruta y el criterio técnico de conteo compatible con el adapter legacy y las órdenes canónicas. Ningún EWO de ejecución se considera aprobado por este documento.
