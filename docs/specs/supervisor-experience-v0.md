# SPEC-SUPERVISOR-EXPERIENCE-001 — Entrada y continuidad del Supervisor

## Estado

**Aprobada por producto el 2026-09-29 en la sesión de Codex.** Basada en [auditoría Supervisor](../../workspace/discovery/auditoria-supervisor-experiencia-v0.md). La aprobación cubre AC-01 a AC-10; las desviaciones y bloqueos se registran en EWO-010.

## Objetivo

Dar al Supervisor una dirección operativa desde Inicio —alertas abiertas y resumen de órdenes abiertas—, preservar la orientación entre Órdenes y Unidades, y mantener alertas visibles mientras su condición de dominio esté abierta, sin crear ownership individual, prioridades, vencimientos ni estados nuevos.

## Alcance propuesto

- Inicio muestra un resumen de órdenes abiertas (borradores) que enlaza a `/ordenes`, sin duplicar lista, ficha ni acciones de la cola.
- Inicio muestra evidencia pendiente de compra externa como responsabilidad de Inventario y dirige a Pendientes; no la llama Orden de Compra mientras ese concepto no exista en dominio.
- Unidades conserva el contexto de búsqueda/filtros al regresar desde su hub.
- La bandeja conserva alertas de condición abierta aunque hayan sido vistas; el copy diferencia visto, enterado y resuelto según el dominio existente.
- La ficha de Orden expresa únicamente los estados existentes y usa el verbo consistente para retomar el wizard.
- La navegación operativa del Supervisor se limita a Inicio, Órdenes, Unidades e Inventario; Alertas, notificaciones, fichas y wizard son destinos contextuales, no vistas principales adicionales.

## Fuera de alcance

- Asignación de órdenes, técnicos, SLA, vencimientos, prioridades, kanban o estados adicionales.
- Cambiar schemas de Andon, Notifications, Inventario o Salud.
- Navegación Supervisor a `/flota` o capacidades de Logística.
- Cambiar la regla `SUPERVISOR` + unidad `ACTIVA` para crear visita.

## Criterios de aceptación canónicos

- **AC-01:** Inicio muestra alertas abiertas y el conteo de órdenes en `Borrador` que dirige a `/ordenes`; no replica la lista, ficha ni acciones del panel de órdenes.
- **AC-02:** Inicio no llama a la lista exclusiva de Logística ni muestra estados operativos de Flota.
- **AC-02a:** Dada una compra externa pendiente de comprobante, Inicio muestra la evidencia pendiente y dirige a Pendientes. Si no hay pendientes, no muestra ese resumen.
- **AC-03:** Dado que un Supervisor filtró/buscó Unidades y abre una ficha, al usar «Volver a unidades» recupera esa búsqueda/filtros y no pierde la lista.
- **AC-04:** Back/forward conserva de forma coherente el contexto de Unidades y no permite rutas de retorno externas.
- **AC-05:** Una alerta sigue disponible mientras la condición fuente permanezca abierta; marcarla vista no la expira, oculta ni resuelve.
- **AC-06:** Andon distingue visible y textualmente `Enterado` de `Resuelto`; no declara que Enterado cierre el aviso.
- **AC-07:** Alertas de Salud e Inventario no exponen un CTA de resolución inexistente; guían a la superficie que contiene la acción real.
- **AC-08:** Toda superficie disponible al Supervisor se diseña mobile-first y funciona a 390 px sin overflow horizontal ni controles relevantes menores de 44 px; escritorio amplía esa misma jerarquía, no la reemplaza.
- **AC-09:** La implementación preserva permisos actuales y no añade estados, campos ni contratos de dominio; los ciclos de vida de alerta permanecen en las APIs dueñas de Andon, Inventario y Salud.
- **AC-10:** La ficha de una orden muestra únicamente `Borrador` o `Cerrada`, no presenta Pausada, En progreso o Hecha como estados del ciclo de vida y usa `Continuar` para abrir un borrador.

## Contexto de producto recibido

Inicio se mantiene como cola de excepciones y Órdenes como único panel de trabajo. El resumen de abiertas cuenta borradores. La navegación operativa se reduce a Inicio, Órdenes, Unidades e Inventario y se diseña mobile-first. No se añaden prioridad, vencimiento ni ownership hasta una futura creación de usuarios. La visibilidad de una alerta depende de que su condición fuente siga abierta, no de que haya sido vista; sus reglas de cierre viven en las APIs dueñas. Inventario no incorpora máximos en este corte. Producto aprobó este alcance el 2026-09-29; la ejecución y sus excepciones se trazan en EWO-010.

Si la mejora de rendimiento de Órdenes requiere una lectura backend dedicada, definir orden/paginación/contrato mediante shaping y ADR antes de ejecutar.
