# Plan de implementación — Revamp Supervisor mobile-first v0

## Estado y objetivo

**Plan de ejecución propuesto; no inicia implementación por sí mismo.** Reorganizar la experiencia `SUPERVISOR` para que sus cuatro vistas operativas sean **Inicio**, **Órdenes**, **Unidades** e **Inventario**, todas mobile-first. La meta es que el Supervisor identifique la siguiente condición abierta, entre a trabajar una orden y conserve el contexto de la unidad sin asumir tareas administrativas.

Fuentes canónicas: [SPEC Supervisor](../../docs/specs/supervisor-experience-v0.md), [UX Supervisor](../../docs/design-system/ux-supervisor-experience-v0.md) y [EWO-010](../../docs/engineering-work-orders/EWO-010.md). La [referencia visual](supervisor-inicio-mobile-reference.html) fija jerarquía y tono, no es una copia literal de UI ni un contrato de componentes.

## Secuencia

### Fase 0 — Preparación y caracterización

1. Leer `AGENTS.md`, ICM y las fuentes canónicas, además de los contextos de Mantenimiento, Notifications, Salud e Inventario necesarios para las rutas tocadas.
2. Revisar el árbol de trabajo y preservar cambios ajenos.
3. Levantar el entorno semilla y caracterizar, antes de editar, el flujo Supervisor a 390 px y escritorio: Inicio, Órdenes, Unidad/hub, wizard, Inventario y campana.
4. Confirmar qué lecturas existentes entregan las condiciones abiertas de Andon, Inventario, evidencia pendiente y Salud. Si una condición no es leíble sin un endpoint/contrato nuevo, detener ese subalcance y escalar; no inventar agregaciones ni joins cruzados.

### Fase 1 — Navegación y estructura mobile-first

1. Hacer que la navegación operativa visible del Supervisor tenga solo Inicio, Órdenes, Unidades e Inventario. En móvil, usar navegación inferior de cuatro destinos con etiqueta e icono; en escritorio, conservar una navegación equivalente y compacta.
2. Mantener Alertas/Andon, notificaciones, fichas y wizard como destinos contextuales mediante enlaces profundos. Configuración queda secundaria: no se elimina una capacidad existente sin una ruta alternativa visible.
3. Comprobar que cada destino se puede completar a 390 px en una columna, sin hover obligatorio, desbordamiento horizontal ni controles relevantes menores de 44 px.

### Fase 2 — Inicio: dirección, no segundo panel de órdenes

1. Componer Inicio con condiciones **abiertas** de sus fuentes autorizadas: mantenimiento, inventario/evidencia pendiente y Salud, más conteo de visitas `BORRADOR`.
2. Cada fila identifica fuente, sujeto y consecuencia, y navega a la superficie donde vive la acción. El resumen de órdenes solo enlaza a `/ordenes`; no lista borradores ni abre la ficha dentro de Inicio.
3. Marcar una notificación como vista nunca debe ocultar la condición mientras la fuente siga abierta. No cambiar la regla de cierre de Andon, Inventario o Salud.
4. Implementar loading, vacío y error por fuente para que una fuente fallida no borre las demás.

### Fase 3 — Órdenes y continuidad de Unidad

1. En `/ordenes`, expresar solo `Borrador` y `Cerrada`; eliminar de la presentación estados inexistentes (`Pausada`, `En progreso`, `Hecha`) y usar `Continuar` de forma consistente.
2. Mantener Órdenes como el único panel de trabajo: lista y ficha pueden coexistir en escritorio, pero en móvil se resuelven como lista y detalle navegable, no como tabla comprimida.
3. Preservar búsqueda/filtros de `/unidades` mediante query serializada o `returnTo` interno validado al entrar y volver del hub/wizard. Back/forward debe conservar el contexto y nunca redirigir fuera del catálogo.

### Fase 4 — Inventario dentro del trabajo del Supervisor

1. Conservar Inventario como la cuarta vista operativa: refacciones, existencias, movimientos, consumo y pendientes son subdestinos, no un nuevo tablero de KPIs.
2. Dar prioridad visual a agotado, bajo mínimo y evidencia pendiente de compra externa; usar el lenguaje existente, no llamar “Orden de Compra” a un concepto no modelado.
3. No crear máximos, costos, precios, una cola de excepciones financiera ni permisos nuevos en este revamp. El flujo de costos acordado queda como corte posterior y administrativo.

### Fase 5 — Validación y entrega

1. Ejecutar `npm run lint` y `npm run build` en `web`.
2. Si se toca API con autorización explícita, ejecutar sus pruebas focales, `npm test` y `npm run test:e2e`; no ejecutar autofixes globales.
3. Hacer prueba click-through como Supervisor con semilla en 390 px y 1440 px. Guardar las pruebas requeridas por UX: Inicio, continuar borrador, retorno de Unidades e Inventario/Pendientes en móvil; Inicio, Órdenes y retorno de Unidades en escritorio.
4. Verificar permisos, loading, error, vacío, focus visible, objetivos táctiles y ausencia de overflow horizontal.
5. Entregar archivos cambiados, comandos/resultados y cualquier excepción/escalación de dominio.

## Límites no negociables

- No `Flota`/`Logística` en el flujo Supervisor.
- No ownership, prioridad, SLA, vencimiento, kanban, usuarios ni nuevos estados de visita.
- No cambios de schema, joins entre módulos ni endpoint de cola nuevo sin shaping/SPEC/ADR adicional.
- No cambio de regla: solo `SUPERVISOR` sobre unidad `ACTIVA` crea una visita.
- `Enterado` no resuelve Andon; ver una alerta no la resuelve ni la expira.
- No exponer precios ni tareas de conciliación administrativa al Supervisor.

## Riesgos y puntos de decisión durante ejecución

| Señal | Respuesta requerida |
|---|---|
| Hace falta una API para contar/leer condiciones abiertas | Documentar el gap y escalar; no construir un agregado ad hoc. |
| Cambiar lectura N+1 de Órdenes | Separar como mejora de arquitectura con contrato, shaping y ADR. |
| Un componente compartido afecta Logística/Admin | Mantener compatibilidad o acotar el cambio; no usar el revamp para un rediseño global. |
| Se solicita costo, máximo de stock o nueva aprobación | Sacarlo a un EWO/SPEC financiero separado. |

## Definición de terminado

Las AC-01 a AC-10 de la SPEC se demuestran con pruebas y las cuatro vistas se pueden usar de punta a punta a 390 px. No hay regresión de los flujos vigentes de creación/cierre de visita ni capacidades administrativas existentes que hayan quedado sin destino.
