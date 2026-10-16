# SPEC-INV-ALERT-001 — Configuración compacta de alertas de inventario

## Status

Proposed, 2026-10-16. Alcance de producto confirmado mediante GrillMe Q1–Q14 y «i approve, go ahead with the spec». Esta entrega especifica el comportamiento; no afirma implementación ni verificación de runtime. [Shaping aprobado](../../workspace/shaping/inventario-alertas-modal-grillme.md).

## Problem

El modal de Existencias dedica una tarjeta alta a cada producto y repite instrucciones. Con 25+ productos cuesta localizar, comparar y ajustar mínimos. El guardado secuencial puede persistir algunas filas antes de fallar sin identificar cuáles, dificultando reintentos.

## Context

La ruta `/inventario/stock` ya obtiene stock completo, con nombre, SKU, unidad, activo, minQty, criticalQty y existencias. El modal actual no hereda los filtros de la página. SALIDA_OT permite obtener una referencia histórica de salidas, que no equivale a consumo neto. ADR007 y su ampliación ADR022 siguen rigiendo las alertas.

## Goals

- Localizar y editar pocos productos rápidamente en un catálogo de aproximadamente 100.
- Aplicar mínimos en lote y quitar alertas sin perder borradores al filtrar.
- Mostrar salidas del mes calendario anterior como referencia informativa.
- Hacer visible el resultado por fila y recuperar guardados parciales.

## Non-goals

Sugerir mínimos, calcular consumo neto/frecuencia, compras o reposición automática, multi-almacén, modificar permisos o reglas de severidad, editar criticalQty directamente, cambiar el editor de Configuración → Alertas, introducir un guardado masivo atómico, nuevos esquemas/migraciones o rediseñar la página de Existencias.

## Actors

`SUPERVISOR` y `ADMIN_DIRECTIVO`. Conservar restricciones existentes; `LOGISTICA` no obtiene acceso.

## Functional Behavior

### F1 — Apertura, búsqueda y filtros

«Configurar alertas» abre un modal amplio con su propia búsqueda por nombre/SKU, insensible a mayúsculas, y filtros «Todos», «Con alerta», «Sin alerta». Se usa todo el conjunto de stock, incluidos inactivos como actualmente; identificarlos con texto «Inactivo». No heredar la búsqueda/filtro de la página. Orden estable por nombre y SKU, sin reordenar durante edición. Sin paginación ni virtualización obligatorias para 100 filas.

Filtros y sus contadores se basan en mínimos confirmados: minQty no null = con alerta, incluido cero. Los borradores no hacen desaparecer filas al editarlas. Tras confirmar guardados se actualiza esa base. La búsqueda se combina con el filtro; contadores reflejan el conjunto antes de buscar.

### F2 — Borradores y selección

Cada fila presenta producto/SKU, existencias con unidad, salidas mensuales con unidad y entrada de mínimo. Una única ayuda explica «Deja el mínimo vacío para desactivar la alerta». Selección y borradores se identifican por itemId, nunca por índice visible.

Buscar/filtrar conserva selección y borradores. El checkbox de encabezado selecciona/deselecciona solo filas visibles; tiene estado mixto. Mostrar cantidad seleccionada y oculta, más «Limpiar selección». No eliminar selección al aplicar un lote.

«Establecer mínimo…» solicita entero >= 0 y muestra número de productos afectados y mínimos distintos que reemplazará. Aplica a la selección completa, incluidas filas ocultas, únicamente si comparten uom. Con unidades mixtas, pedir elegir uno de los grupos de unidad y mostrar su cantidad; nunca aplicar una cifra silenciosamente a todos los grupos. «Quitar alertas» admite unidades mixtas y pone null en los borradores seleccionados. Ambas acciones informan el alcance antes de aplicar y no persisten todavía.

### F3 — Referencia del mes anterior

Una consulta compartida de movimientos para el rango mensual, tipo SALIDA_OT, seguida de agregación por itemId; no consultas por fila. Sumar qty positiva de salidas. Excluir ENTRADA, AJUSTE y compras externas. No restar devoluciones ni inferir uso frecuente. La métrica usa createdAt del movimiento, como el endpoint actual, no fecha de apertura de visita.

Periodo fijado al abrir: mes calendario anterior en UTC, coherente con consultas existentes; en enero usar diciembre del año previo. Mostrar mes/año y aclarar UTC en la ayuda del periodo. Esta es una convención técnica de compatibilidad, no una nueva política de calendario para otros módulos. Ejemplo al abrir en octubre de 2026: 1–30 septiembre 2026 UTC. Nueva apertura recalcula el periodo.

Copy: «Salidas mes anterior», periodo «sep. 2026» y ayuda «No descuenta devoluciones ni incluye compras externas». Solo tras respuesta válida completa, productos sin movimientos muestran 0 con su unidad. Durante carga: «Cargando…»; ante fallo: «No disponible» y un reintento compartido. La referencia no bloquea ni modifica mínimos.

### F4 — Reglas y límite crítico

Mantener null = sin alerta y entero >= 0 válido; cero es distinto de vacío. Rechazar negativos, decimales y texto inválido, identificando la fila incluso si está oculta. Validar todos los pendientes antes de enviar cualquier escritura.

Conservar comparación inclusiva qty <= minQty y evaluación de severidad por Inventario. Bajar minQty por debajo de criticalQty ajusta este último conforme al dueño; antes de guardar mostrar en fila «El límite crítico también bajará de 5 a 3». Quitar mínimo no implica poner criticalQty a cero. El aviso es informativo sobre la regla existente, no un nuevo motor de severidad en JSX. No enviar valores de criticalQty calculados desde una instantánea antigua para sobrescribirlos.

### F5 — Guardado y recuperación

«Guardar cambios» usa todos los borradores modificados, incluidos ocultos; deshabilitado sin cambios. Al guardar, congelar edición, acciones en lote y cierre; anunciar «Guardando cambios…». Mantener la secuencia PATCH individual existente, solo con minQty. No prometer atomicidad del conjunto.

Por cada respuesta confirmada, registrar éxito y actualizar la base de comparación de esa fila; un fallo de otra fila no revierte éxitos. Errores específicos por fila permiten continuar con otros productos; ante fallo global de autenticación/conectividad, detener y dejar los restantes pendientes. Mostrar resumen «Se guardaron X productos; quedan Y pendientes» y acceso a filas pendientes aunque estén fuera del filtro. No cerrar con errores o estado incierto.

Tras éxito parcial, conservar valores y distinguir fallidos de no enviados. «Reintentar pendientes» envía únicamente modificaciones sin confirmar. Un error de lectura de referencia nunca se presenta como error de guardado.

Si una respuesta se pierde, no asumir que la escritura falló: volver a leer el stock. Si el valor persistido coincide con el solicitado, marcar confirmado; de lo contrario mantener el borrador y señalar pendiente. Si también falla la lectura, mostrar «No se pudo confirmar el guardado» y requerir comprobar estado antes de reenviar esa fila. No implementar reintento ciego ni afirmar garantía de exactamente una vez. Las escrituras siguen la concurrencia actual del endpoint; no introducir control de versiones en este corte.

Todos confirmados: actualizar Existencias, avisar al inbox mediante el mecanismo existente y cerrar. Si falla solo la recarga, conservar los éxitos confirmados y ofrecer reintentar la lectura, sin repetir PATCH. Tras éxito parcial notificar también el cambio al inbox por los éxitos. Un fallo global no debe borrar borradores.

### F6 — Salida

Cancelar, X, Escape y cierre por overlay usan el mismo guard. Con cambios pendientes: «¿Descartar cambios pendientes?» / «Descartar cambios» / «Seguir editando». Descartar tras éxito parcial solo abandona lo pendiente; no deshace éxitos. Durante guardado no se cierra. Al reabrir, reconstruir borradores desde stock actualizado, sin selección residual. La protección comprende el modal; no añade persistencia de borradores entre navegación o cierre del navegador.

## Business Rules / Domain Implications

Inventario conserva stock, mínimos y límites críticos; Notifications recibe eventos por el puerto existente. Sin escrituras a Andon ni redefinición de bounded contexts. No alterar la auditoría/transacciones del editor de catálogo de ADR022; este corte conserva la ruta existente de edición de ítems.

## State Transitions

`sin cambios → editando → validando → guardando → confirmado / parcial / no confirmado`.
`parcial → editar o reintentar pendientes → guardando`.
`no confirmado → comprobar stock → confirmado o pendiente`.
La referencia tiene estado independiente `cargando → disponible / error → reintento`.

## Constraints

- Arquitectura/API: reutilizar GET `/inventario/stock`, GET `/inventario/movimientos?tipo=SALIDA_OT&from=…&to=…` y PATCH `/inventario/items/:id` `{ minQty }`. Sin contrato nuevo previsto.
- Compatibilidad: no cambiar semántica de null/cero, inactive, umbrales, permisos o eventos. No depender de proveedores/tipos de vehículo para abrir este editor si stock está disponible.
- Seguridad: usar autenticación/roles existentes; no conceder LOGISTICA ni permisos nuevos.
- Rendimiento: filtrado local de ~100 productos; una lectura mensual compartida. El volumen de movimientos puede superar 100: no truncar silenciosamente; consulta fallida muestra no disponible.
- UX: cumplir [spec UX](../design-system/ux-inventario-alertas-modal-v1.md), tokens y controles existentes; sin reproducir shell/fotografías decorativas del mockup generado.

## Failure Behavior / Edge Cases

Stock no disponible: error y reintento, sin editor vacío engañoso. Catálogo vacío: explicación sin Guardar activo. Sin resultados: limpiar búsqueda/filtros sin perder cambios. Una selección vacía deshabilita acciones en lote. Un lote que deja el valor igual no agrega cambios. Volver al valor confirmado quita la marca pendiente. Registros SALIDA_OT decimales se muestran sin redondearlos a enteros; la restricción entera corresponde al mínimo. Un producto eliminado o no autorizable durante edición conserva error específico, sin anunciar éxito.

## Acceptance Criteria

| ID | Dado / Cuando | Resultado verificable |
|---|---|---|
| AC-01 | Catálogo de 100 productos; abrir, buscar nombre/SKU y filtrar | Se localiza por ambas claves; filtros y conteos siguen F1; no se heredan filtros de página. |
| AC-02 | Cambios y selección, luego ocultar filas | Borradores/selección persisten; cantidad oculta correcta; encabezado opera solo sobre visibles. |
| AC-03 | Lote de una unidad con mínimos existentes | Muestra alcance/reemplazos; aplicar cambia borradores, no servidor; guardar incluye ocultos. |
| AC-04 | Selección de unidades mixtas o vacía | Mínimo requiere grupo de unidad; quitar alertas admite mixtas; vacía no ejecuta acciones. |
| AC-05 | Entrada vacía, cero, negativo, decimal o texto | Null y cero distintos; inválidos identificados antes de cualquier PATCH. |
| AC-06 | Mes previo con salidas, devoluciones, externas y producto sin movimientos | Solo suma SALIDA_OT por itemId; cero confirmado; mes/año/UTC explícitos; enero y límites incluidos correctos. |
| AC-07 | Referencia cargando o fallida | Estados distintos de cero; reintento compartido; configurar/guardar sigue disponible. |
| AC-08 | Mínimo menor al crítico / mínimo eliminado | Se anuncia ajuste existente antes de guardar; no cambia regla ni pone crítico a cero al desactivar. |
| AC-09 | Sin cambios / valores vueltos al original | Guardar deshabilitado; no se envían PATCH redundantes. |
| AC-10 | Guardado con éxito, fallo de fila y otra fila pendiente | Éxitos confirmados actualizan base; fallos/no enviados conservan borrador; reintento excluye éxitos; errores accesibles fuera de filtro. |
| AC-11 | Respuesta perdida o recarga fallida después de escribir | Reconciliar lectura antes de reenviar ambiguos; no repetir éxitos ni perder borradores al fallar lectura. |
| AC-12 | Cierre con cambios / guardado en curso / parcial | Confirmación de descarte; bloqueo durante envío; descarte no promete deshacer persistidos. |
| AC-13 | Guardado total o parcial confirmado | Existencias/inbox se actualizan por mecanismo existente; cierre solo tras resolver pendientes. |
| AC-14 | Supervisor/Admin/Logística | Solo primeros dos conservan acceso; la disponibilidad de proveedores no bloquea este editor. |
| AC-15 | Desktop/móvil/teclado | Encabezado/pie accesibles, lista desplazable, foco y errores asociados; sin overflow horizontal de página. |

## Dependencies / Related ADRs

[Inventario](../../domain/inventario/CONTEXT.md), [ADR002](../adr/002-schema-per-module.md), [ADR003](../adr/003-shadcn-tailwind.md), [ADR007](../adr/007-inventario-stock-bajo.md), [ADR022](../adr/022-alert-attention-priority.md). Sin ADR nuevo: no hay cambio de ownership, esquema ni reglas.

## Open Questions

Sin decisiones materiales de producto pendientes para esta propuesta. Convención UTC y semántica de salidas explicitadas como compatibilidad con las lecturas actuales. No se atribuye aprobación de detalles técnicos ni ejecución al consentimiento de shaping.

## Traceability and impact

PRD separado no aplica: mejora acotada de superficie existente. Decisiones Q1–Q14 en shaping; F1–F6 detallan comportamiento. Evidencia actual: `web/src/app/inventario/stock/page.tsx`, `web/src/lib/consumo-totales.ts`, `api/src/inventario/inventario.service.ts`, `api/src/inventario/dto/filtrar-movimientos.dto.ts`. Datos/migración: ninguno. API: reutilización sin extensión prevista. UI: editor de alertas en Existencias; [UX](../design-system/ux-inventario-alertas-modal-v1.md).

## AC-to-test plan

| AC | Plan de verificación (pendiente de ejecución) |
|---|---|
| 01–04,09 | Pruebas de estado/selección/lotes y click-through con ~100 productos, incluidos ocultos e inactivos. |
| 05,08,14 | Regresión de validación/roles/reglas existentes y click-through del aviso crítico. |
| 06–07 | Prueba significativa de agregación: límites de mes/año UTC, decimales, devoluciones, externas, cero y fallo. |
| 10–13 | Simulación de éxitos/fallos intercalados, desconexión, respuesta perdida, lectura fallida y reintento; comprobar solicitudes y datos persistidos. |
| 15 | proof-ui a 1440/1024/390, ambos roles, teclado y revisión independiente ux-auditor. |

Evidencia tras ejecutar: todavía no disponible. Implementación: lint/build web, pruebas afectadas y verificación API apropiada si se modifica API, según estrategia del repositorio. Sin Playwright nuevo. No tratar este plan como resultados PASS.

## Risks and assumptions

Movimientos del mes sin paginación pueden ser numerosos; no confundir tamaño del catálogo con tamaño del historial. La referencia es bruta y por fecha de registro. Las escrituras individuales pueden confirmar parcialmente y siguen el control de concurrencia existente; la UI no puede garantizar atomicidad ni bloquear otros editores. Un aviso de ajuste crítico es una instantánea, no una reserva. Si la implementación exige contrato nuevo o cambia reglas de dominio, volver a especificación antes de ampliar alcance.
