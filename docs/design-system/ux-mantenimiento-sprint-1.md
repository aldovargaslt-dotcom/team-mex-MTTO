# SPEC UX — Mantenimiento sprint 1

**Proposed; auditoría ef46c70 reconciliada; requiere aprobación de SPEC-MTTO-UX-001/EWO-029.**

## Screen purpose / Primary user

Encontrar y reconstruir órdenes con estados fiables; Supervisor captura, Supervisor/Admin consultan según permisos. Desktop y móvil. Criterios canónicos: [SPEC-MTTO-UX-001](../specs/SPEC-MTTO-UX-001.md).

## Questions the screen must answer

¿Qué orden/fuente veo? ¿Falló algo? ¿Qué puedo recuperar? ¿Qué datos están confirmados? ¿Dónde continúo/reviso? Mostrar contexto unidad/visita y relaciones sin inferir historia inexistente.

## Primary action / Secondary actions

Conservar acciones por pantalla: Inicio, filas abren listas, cero CTA naranja; Órdenes **Nueva orden** para Supervisor y **Continuar** en captura donde corresponda; wizard **Continuar / Cerrar visita**. No duplicar acciones primarias.

Recovery: **Reintentar** (`outline`) con contexto de recurso; piezas **Reintentar piezas** (`outline`); filtros **Quitar filtros** (`secondary`). Sin acciones de captura en Admin. D-FIRMA es propuesta aparte, ninguna acción nueva visible antes de aprobación.

## Information hierarchy

P0 identidad y error que impide avanzar; P1 siguiente acción autorizada; P2 datos confirmados y filtros; P3 metadata/origen técnico mínimo. No pintar counters globales a partir de resultado parcial, PII de diagnóstico, trazas SQL ni IDs como explicación de errores.

## Pattern / Clone

Inicio = patrón 2, hermano Inicio normal; fila de error propia, texto en columna flexible y botón de recovery, sin modificar fila normal `.inbox-row.unread`. Órdenes conserva lista/detalle ya existente, no sustituir layout. Existencias/Por recibir = patrón 3 (hermano lista actual). Documento cerrado = patrón 6, un documento; wizard mantiene siete pasos. No añadir cards para cada estado ni tabs nuevas.

## States — copy exacto propuesto

| Recurso | Carga | Vacío confirmado | Error / parcial |
|---|---|---|---|
| Inicio | Cargando lo que requiere atención… | Nada requiere atención (sólo 4 fuentes sanas) | No se pudo cargar {fuente}. / Se muestra lo disponible; falta cargar {fuente}. |
| Órdenes | Cargando órdenes… | No hay órdenes en borrador. / No hay órdenes cerradas. (en esa cola) | No se pudieron cargar las órdenes. / Se muestran las órdenes de las unidades disponibles; faltan {n} unidades. |
| Búsqueda/tipo | Conservar filtros; anunciar búsqueda local | Sin coincidencias con estos filtros. + Quitar filtros | No afirmar ausencia si consulta falló; recuperar fuente primero. |
| Detalle | Cargando la orden… | No aplica; un objeto ausente es indisponible | No se pudo abrir la orden. + Reintentar |
| Piezas | Cargando datos de las piezas… | Sin piezas en esta orden. (sólo líneas persistidas vacías) | No se pudieron cargar los nombres de las piezas. Se conservan cantidades y origen. + Reintentar piezas |
| Existencias | Cargando existencias… | Aún no hay existencias registradas. / Sin coincidencias con estos filtros. | No se pudieron cargar las existencias. |
| Consumo | Cargando consumo… | No hay consumo en este periodo. (sólo ambas fuentes sanas) | Consumo incompleto: falta {fuente}. Totales afectados no disponibles, nunca 0. |
| Movimientos | Cargando movimientos… | Aún no hay movimientos. (consulta completa sin filtros) | No se pudieron cargar los movimientos. |
| Andon | Cargando avisos… | No hay alertas pendientes. (éxito confirmado) | No se pudieron cargar los avisos. |
| Alertas/campanita | Cargando alertas… (badge sin cifra) | Sin alertas. / badge 0 (éxito confirmado) | Alertas no disponibles. (badge desconocido, no 0) |
| Nueva orden | Cargando unidades/choferes… | No hay unidades activas. / Sin coincidencias con estos filtros. (catálogo cargado) | No se pudieron cargar las unidades/choferes. Crear bloqueado hasta requisitos disponibles. |
| Unidades | Cargando unidades… | No hay unidades registradas. / Sin coincidencias con estos filtros. | No se pudieron cargar las unidades. |
| Por recibir | Cargando compras por recibir… | No hay compras pendientes de comprobante. (preservar significado) | No se pudieron cargar las compras por recibir. |
| Referencia H11 | Cargando referencia… | Sin referencia de visita (sólo ID nulo) | Referencia de visita no disponible para este acceso. (404 no prueba borrado) / No tienes acceso (403) / No se pudo consultar la referencia. (retry) |

Normal: filas originales y datos confirmados. Warning: parcial o datos anteriores sin actualizar, anunciado sin semáforo en filas sanas. Critical: fallo que bloquea cierre con recovery manual y valores retenidos. Error sólo `role=alert` cuando cambia; resultados/carga `role=status`, evitar alertas duplicadas.

## Interaction notes

Recovery sólo de lectura automático/manual según recurso; escrituras siempre reintento explícito y sin duplicación. Conservar q/tipo/cola en retry. Quitar filtros borra q/tipo, devuelve foco a búsqueda y anuncia cantidad cargada (si consulta completa); no cambia cola/rol. Cancelar resultados tardíos al cambiar orden/rol. Dialog/sheet siguen portal y restauran foco. No navegación nueva al Mecánico.

## Mobile / responsive

1440×900: lista/detalle actuales, errores caben y no alteran filas normales. 1024×768: verificar grid/tabla sin ocultar error/recovery. 390×844: texto se adapta, controles ≥44px, Continuar visible, teclado no pierde inputs ni foco. Mantener Roboto; si se usa fallback en entorno, declararlo y repetir comprobación con fuente real.

## Contraste y compatibilidad

Medición sRGB inicial: blanco/naranja #EA7515 = 2.977:1; navy/naranja = 4.748:1. Propuesta: texto navy en CTA, hover `#EA7515` (o un naranja más claro validado ≥4.5:1), conservar borde/foco navy visible. Navy sobre hover actual #D4670F = 3.868:1: cambiar sólo texto normal no basta. Usar outline navy y offset para foco si el naranja no alcanza contraste con la superficie. Revisar overrides `.ordenes-primary`, `.btn-primary` y consumidores pertinentes; no migración de tipografía ni kit. Cambio documentado y aprobado prevalece sobre par blanco/naranja anterior del brief.

## Fuera / Don’t / Proof

Sin CHECK, permisos, Logística, reglas RECIBIDA/ticket/preventivo, captura histórica, migraciones ni reconstrucción H11. No refactors generales, animaciones o skeletons. SAP/Fiori como referencia de patrones operativos, Carbon/Material complementarios, conservar primitivas Team Mex; Taste no bloquea.

PNG antes/después en `docs/screenshots/mtto-sprint-1/`, estado y viewport en nombre. Seguir [proof-ui](../../.cursor/skills/proof-ui/SKILL.md): entrar por picker, click-through, sin DevTools/Playwright. Pase independiente ux-auditor para revisión experta; usuarios se registran por separado, sin atribuir aceptación humana a ese pase.

## Alcance acotado de foco y jerarquía

Nueva orden devuelve foco al disparador al cerrar por Escape/Cancelar/Cerrar (B14); trap existente conservado. Adjuntar ticket usa variante secundaria para múltiples filas (B16d), manteniendo operación y estado. B15/campanita Mecánico queda fuera: aplicar estados de badge sólo donde el usuario ya está autorizado. Ticket, RECIBIDA y Servicio preventivo mantienen significado vigente.
