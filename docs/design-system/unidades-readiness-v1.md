# UX — Unidades y ficha orientadas a preparación de flota

## Estado, propósito y usuario

Approved for EWO-056, 2026-10-17. Complementa [SPEC-UNIDADES-READINESS-001](../specs/SPEC-UNIDADES-READINESS-001.md);
sus UR-* son los AC canónicos. Build autorizado por el usuario; prueba visual y límites en la evidencia EWO-056. Supervisor revisa preparación al inicio del turno; Admin conserva
catálogo; mecánico/control tower usan capacidades autorizadas en sus superficies.

## Preguntas que debe responder

1. ¿Qué unidades estoy revisando? Alcance Daily/Stock y filtros visibles.
2. ¿Hay algo mal? Motivo concreto y prioridad, sin interpretar cuadrados sueltos.
3. ¿Debo actuar? Siguiente acción con verbo y destino.
4. ¿Cuál es el estado ahora? Operabilidad, revisión, uso y bloqueos diferenciados.
5. ¿Qué lo respalda? Fecha, origen y enlace a revisión/orden/evidencia.

## Patrón y clone

Lista: patrón 3 de [PAGE_PATTERNS](../design/PAGE_PATTERNS.md), con alcance y filtros;
conservar agrupación por tipo como filtro, sin anteponer catálogo a prioridad.
Clone chrome de Andon (`PageHeader`, `ListFilter`, tabla y estados) y acciones
administrativas de Unidades. Esto propone sustituir la agrupación visual inicial
del patrón 4 solo para la revisión operativa de Supervisor, no el catálogo Admin.
Ficha: patrón 5 y componentes existentes `HubIdentityHeader`/`HubFichaNav`.
Orden/cierre: wizard existente, sin reconstruir ABC ni inventar otro shell.
Reutilizar Team Mex, shadcn, tokens y [Operate craft](../design/OPERATE_CRAFT.md).

## Jerarquía de información

- P0: bloqueo crítico o fuente necesaria sin confirmar, con motivo.
- P1: unidad, operabilidad, siguiente acción y vigencia ABC.
- P2: uso, problemas/órdenes y programación efectiva con su origen.
- P3: evidencia, historial, técnica y Salud existente como referencia secundaria.

Sin hero, nuevos KPI decorativos, gráficas de health ni cards por cada dato.
No convertir ACTIVA, ausencia de órdenes o Salud en autorización operativa.

## Lista /unidades

Cabecera: **Unidades**, descripción **Revise qué unidades necesitan atención antes de operar.**
Supervisor sin alta administrativa principal; las filas son acceso principal.
Admin conserva Nueva unidad y menú de catálogo, sin elevarlos sobre incidencias.

Alcance visible **Daily · Stock · Todas**, con conteos del alcance autorizado.
Filtros independientes por tipo, operabilidad, revisión y órdenes; búsqueda
**Buscar por número o placas**. Aviso Stock crítico separado de las filas Daily:
**Hay {n} unidades Stock con bloqueos críticos.** Acción **Revisar Stock**.

Columnas de escritorio: Unidad; Operabilidad; Revisión; Uso actual;
Atención / órdenes; Abrir ficha. Fecha/hora de fuente accesible junto al dato;
problema principal escrito, no solo icono. No etiquetar como disponible lo que
solo tiene dictamen histórico apto. Orden predeterminado por atención según F1.

Fila con enlace real a ficha y foco visible; acciones internas separadas no
disparan navegación de fila. **Ver revisión**, **Revisar órdenes** son enlaces
secundarios contextuales. No repetir un CTA naranja por fila.
URL conserva filtros y navegación; retorno no reinicia la revisión de turno.

## Ficha /unidades/:id

Cabecera compacta con identidad/foto y Volver a Unidades; resumen operativo al
abrir. Cuatro destinos: **Resumen · Ficha técnica · Mantenimiento · Historial**.
Conservar parámetros/enlaces previos mediante alias de presentación si cambia copy.

Resumen comienza con dictamen efectivo, revisión/fecha/dueAt y bloqueos. Debajo,
problema y órdenes activas; enlaces a evidencia y detalle. Mantenimiento contiene
trabajo activo y programación, distinguiendo periodicidad ABC de mantenimiento
Andon. Historial conserva órdenes/revisiones identificadas y capacidades previas;
técnica concentra identidad/especificaciones/documentos. No quinto tab Andon.

Una acción primaria contextual dentro de los permisos y flujo existente:

| Condición | Acción |
|---|---|
| Mecánico asignado con verificación requerida y capacidad | Verificar reparación |
| Revisión pendiente/activa y actor autorizado | Continuar revisión; si no existe, Iniciar revisión |
| Trabajo pertinente único continuable para el actor | Abrir orden |
| Varios trabajos continuables | Revisar órdenes |
| Supervisor puede crear y no hay siguiente trabajo | Nueva orden (abre gate) |
| Solo lectura | Ver revisión o Revisar órdenes; sin controles de firma/cierre |

Mostrar razones de bloqueo aunque la siguiente acción sea de otro equipo. No
forzar creación de orden para resolver una revisión pendiente que el actor no puede
iniciar. Iniciar revisión respeta request/assignment del CHECK, no nuevo permiso.

## Gate antes de crear orden

Dialog corto escritorio / Sheet móvil, portal y foco controlado. Título
**Órdenes abiertas de esta unidad**; filas con número/tipo/problema/estado/fecha.
Acción por fila **Abrir orden**; alternativa **Crear otra orden**, con explicación
**Continúe si se trata de un problema diferente.** Cancelar vuelve al contexto.
Sin órdenes confirmadas, seguir creación normal sin confirmación vacía adicional.
Con error: **No pudimos comprobar las órdenes abiertas.** Acción Reintentar;
no simular cero. Con cambio concurrente, mostrar orden encontrada y opciones
permitidas por servidor; conservar datos ya capturados.

## Cierre y verificación

Misma pantalla de orden, dos efectos claramente identificados. Mantener cierre
con permisos existentes y ofrecer al mecánico autorizado **Verificar reparación**
con hallazgos/evidencia/firma; acción final de ese procedimiento **Firmar verificación**.
No checkbox automático de liberar. Si requiere ABC nuevo, guiar al registro
distinto sin copiar observaciones/firma histórica. Evitar reingresar unidad/orden.

Bloqueos restantes visibles antes y después: **La orden está cerrada. La unidad
sigue retenida por: {motivos}.** Si cierre persiste y firma falla: **Orden cerrada.
No se pudo completar la verificación.** Reintento retoma solo lo pendiente.
Sin bloqueos técnicos, decir **Verificación completada** y mostrar gates de salida
restantes; no afirmar salida autorizada por este acto.

## Configuración propuesta

Valor efectivo y origen **Flota / Categoría / Unidad**. Selector
**Diaria / Semanal / Mensual / Personalizada**, campo custom con unidad explícita,
preview de efecto y acción **Guardar programación**; **Usar configuración heredada**
como secundaria. Acceso/ubicación final sujetos a G3, sin ampliar permisos aquí.
Mostrar que no modifica revisiones ya firmadas, sujeto a G2. No reutilizar
formulario de umbrales Andon para mezclar dos políticas distintas.

## Estados y copy

| Estado | Presentación |
|---|---|
| Loading | Cargando situación de las unidades…; sin ceros ni disponibilidad provisional. |
| Catálogo vacío | No hay unidades registradas. Admin puede Nueva unidad; Supervisor sin alta ficticia. |
| Daily vacío | No hay unidades Daily en este alcance. Ofrecer Ver todas las unidades. |
| Filtros vacíos | No hay unidades que coincidan con los filtros. Acción Limpiar filtros. |
| Normal | Apta · revisión vigente hasta {fecha/hora}; uso mostrado aparte. |
| Vencimiento en viaje | En uso · revisión vencida. Requiere revisión antes del siguiente despacho. |
| Sin revisión | Sin revisión registrada. Operabilidad sin confirmar. |
| Unknown/fallo parcial | No se pudo confirmar {fuente}. Último dato: {fecha}. Reintentar solo lo fallido. |
| Crítico | No apta o Retenida por seguridad, con motivo y enlace a evidencia. |
| Error de guardado | No se pudo guardar. Se conservan tus datos. Detalle junto al campo/acción. |
| Resultado incierto | No pudimos confirmar el resultado. Consultar registro / Reintentar sin duplicar. |
| Saving | Guardando… / Firmando…; impedir doble envío, no bloquear navegación sin causa. |
| Sin permiso | Lectura y explicación contextual; no esconder la razón mediante botón inerte. |
| Sin historial | Aún no hay revisiones u órdenes registradas para esta unidad. |

## Responsive e interacción

- 1440: tabla completa, motivo legible, sin cards repetidas.
- 1024: reducir columnas secundarias/agrupaciones, conservar estado, revisión,
  problema y acción; detalle expandible etiquetado para fuente/fecha.
- 390: filas apiladas semánticas; identidad, motivo, operabilidad/vigencia y acción
  visibles; filtros en Sheet; navegación de ficha accesible sin tab oculto.
- Objetivos ≥44px, foco visible y orden lógico, texto/ícono además de color;
  links y botones nativos. No fila clickeable que bloquee selección de texto.
- Esc cierra overlay, foco vuelve al disparador; validación anuncia error;
  motion de estado 150–250ms y reduced-motion. Sin overflow horizontal de página.

## Fuera / Don’t

Sin health score nuevo, asignaciones de chofer, responsables ficticios, autoliberación,
retorno por vencimiento, downtime por CHECK, auto-merge de órdenes ni nuevas
facultades de Supervisor/Logística. No eliminar costos/historia previos ni unificar
ficha MTTO con tablero Flota. No mostrar fixtures como datos reales.

## Proof planificado

Click-through sin Playwright y Visual QA independiente después de build. Capturas
en `docs/screenshots/`: unidades_readiness_{390,1024,1440}.png;
unidades_stock_critical.png; ficha_readiness_{390,1440}.png;
unidades_existing_orders_gate.png; orden_closed_hold_remaining.png;
unidades_partial_source_failure.png. Comparar estados normal, vencido en viaje,
crítico, unknown y fallo parcial. Son nombres previstos, no evidencia existente.
Validar tarea de diez segundos, teclado y todos los UR-* aplicables.

## Enmienda visual autorizada — 2026-10-18 / EWO-057

Usuario solicita explícitamente sidebar y dirección visual nueva. Sustituir la
nav horizontal del shell compartido por riel persistente de aplicación ≥768;
menú móvil Sheet con destinos completos por rol. Cabecera contextual compacta,
sidebar con identidad y sesión; CHECK conserva su superficie concentrada.
Navy existente como azul de acción; naranja conserva marca, no filtros ni estado.
Esta autorización resuelve la nota histórica de shell pendiente en VISUAL_DIRECTION.
No concede nuevos permisos ni cambia flujos. Listado/ficha conservan el patrón de
objeto, con secciones/divisores y filtros avanzados progresivos; sin segunda sidebar.

## Amplificación visual — 2026-10-18 / EWO-058

Usuario pide “make it bolder”. Mantener EWO-057 y su sistema; amplificar solo
Unidades/ficha mediante posición (problema junto a identidad), dictamen prominente
20px, cabecera de tabla definida y ubicación activa navy/blanco. No ampliar
paleta/tipografía ni pintar filtros. No duplicar dictamen como badge y título.
Fuentes/fechas conservan contraste legible con menor peso. No cambia producto.

## Simplificación por feedback del usuario — EWO-059 / 2026-10-18

Sustituye tabla6 columnas y múltiples filas de chips de EWO058 por tabla3:
Unidad con foto real y número/placas/tipo, Situación con dictamen/motivo principal
y contexto en uso, enlace contextual. Fechas/fuentes y motivos adicionales
permanecen en ficha. Sin nuevos scores ni interpretación de ausencia de datos.
Toolbar único con búsqueda, selector de uso y Filtros con conteo activo; Sheet
uniforme escritorio/móvil, cuatro selectores etiquetados, resumen de filtros
activos y Limpiar. Aviso Stock crítico compacto. Identidad14px/500, foto80×56,
estados12px, metadatos12px; tres focos previsibles, sin bold múltiple por fila.
Fotos existentes de unidad, nunca visita/genérica; fallback icono si falta o falla.
Shell/sidebar preservados. Referencias y rationale en evidencia EWO059.

## Chequeo diario universal — EWO-060

Eliminar selector Daily/Stock/Todas, clasificación pendiente, aviso Stock y edición
Programación y uso. Lista muestra todas las unidades autorizadas con filtros de
situación/ABC/categoría/órdenes. URLs anteriores usage no reducen alcance; se
normalizan. Ficha muestra “Chequeo diario”, sin origen heredado ni grupo de uso.
Diseño minimalista EWO059 y sidebar se conservan; sin controles nuevos.
