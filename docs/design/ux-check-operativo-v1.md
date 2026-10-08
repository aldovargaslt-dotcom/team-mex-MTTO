# UX-CHK-001 — Chequeo operativo V1

## Status / sources

Approved — paquete Slice0 aprobado por owner 2026-10-01. Ajustes de layout y navegación del flujo mecánico implementados y revisados con click-through visual; las capturas están en [screenshots](../screenshots/). La aprobación visual independiente sigue pendiente. [SPEC](../specs/SPEC-CHK-001.md), [contrato](../contracts/CHK-001-contract.md), owner D14; hierarchy de siete pantallas adjuntas.

## Actors / navigation

MECANICO: Mi trabajo → CHECK → cuatro pasos. Mantener SUPERVISOR maintenance A–E y sus rutas; no renombrar su rol. LOGISTICA: /logistica dashboard/Torre, solicitud/progreso/resultados sólo lectura técnica. /flota movimientos y firmas patio. Admin asigna/configura/audita dentro de scope, no altera firmados.

Rutas contractuales aprobadas: /mi-trabajo, /checks/[id] con modo edit/read derivado de permiso; retorno interno seguro. La aprobación no cambia navegación actual hasta futura ejecución autorizada.

## Hierarchy / reuse

Primitivas existentes shadcn/Field/Button/Dialog/Sheet/DataTable, Roboto/tokens repo. Navy shell, canvas gris, superficies blancas/bordes, warning pairs desaturados y una acción primaria naranja. No Inter migration/global restyle, sombras decorativas, badges naranja sólido ni copias de folios/PSI/mock.

Queue: counts server-side mismo scope, Chequeos vs Mantenimiento, cards mobile y split desk desktop. Highlight unidad/placas/folio/status+nextAction, nombre asignado sólo real, startedAt para elapsed. Pending tomable sólo con policy de autorización; claim no inicia automáticamente sin acción explícita. La implementación actual sólo dispone de CHECK en la cola del mecánico; no debe inventar una cola de mantenimiento sin endpoint.

Exactly 4 visible steps:
1. Condición: A fluidos/fugas; B llantas/PSI. Todo conforme y sin daños requieren acción, no checkbox inicial. Expand sólo ítems anómalos. PSI por posiciones configuradas; backend devuelve range/result.
2. Evidencia: cámara/uploader reusado, 2–5 y tres coberturas por unión tags. Preview/retake/count y requisitos visibles; no OCR obligatorio. Upload en progreso no cuenta READY.
3. Hallazgos: derivados del paso1, sin volver a escribir problema; classify OBSERVATION/FIXED_DURING_CHECK/REQUIRES_WORK. Selected REQUIRES_WORK muestra preparada y contexto heredado; no checkbox extra, folio final ni diagnóstico.
4. Revisión y firma: normales resumidos, excepciones abiertas, Ver detalles; dictamen propuesto backend y Cambiar sólo si policy permite, sin botón confirmar extra. Mostrar canvas táctil no vacío y una acción Firmar y concluir; signature confirma revisión/hash visible.

Editar antes de cierre invalida review/sign candidate; firmado elimina controles de edición. Invalidación crea evento separado con motivo, conserva resumen firmado en lectura.

## Active modal / Tower

Solicitud duplicada409 abre CHECK activo con id/status/step/actor/elapsed/anomalySummary+deep link lectura autorizado, no disabled form. Desktop dialog/mobile sheet con foco y close.
Torre physical/readiness/check/urgency independientes, EN_TALLER por explicit source; reason details y asOf/stale. En ruta Despachada sin borrar causas críticas. KPI maintenance bloqueante sólo blocks_operation. No cambios implícitos de loops.

## State / accessibility matrix

| State | Behavior |
|---|---|
| Loading | Mantener layout y anunciar carga; no falsa cola vacía ni campos preconfirmados |
| Empty | Scope/filtros claros, CTA sólo si autorizado |
| Error/source stale | Retry explícito y asOf; no status “En línea”/“Lista” sin fuente |
| Validation | Mensajes por campo+resumen/foco; avanzar no guarda un paso inválido como done |
| Upload/claim/close pending | Prevent duplicate action, retry key estable; no optimistic signed state |
| Version conflict | Mostrar conflicto y reload/review; conservar edición local hasta decisión del usuario, no overwrite |
| Permission denied | No datos ajenos ni formulario técnico Logística; backend también valida |
| Signed/expired/invalidated | Readonly snapshot+estado de validez separado; referencia correctiva real |

No offline persistence prometida. Readiness en UI no autoriza nuevas salidas.

## Responsive / proof plan

390×844 una columna con targets>=44px, safe-area sticky y espacio para último control/canvas; tablet1024×768 dos columnas posibles; desktop1440×900 cola380+detalle o tabla dentro de max1040. Teclado/foco/labels y estados no sólo color; canvas touch/mouse sin scroll accidental. Stepper recibe completion real, no asume pasos previos done sólo por navegar. En el flujo mecánico, encabezado del activo/folio y stepper quedan visibles; un footer fijo mantiene Atrás + el CTA del paso actual. El paso y los campos de Condición se rehidratan desde el estado guardado del servidor.
Proof UI click-through+PNG completado sin Playwright: `check_mi-trabajo_m390.png`, `check_condicion_anomalia_m390.png`, `check_evidencia_vacia_m390.png`, `check_hallazgos_clasificado_m390.png` y `check_firma_m390.png`; también se capturó la cola desktop en `check_mi-trabajo_d1440.png`. La revisión visual independiente ux-auditor sigue pendiente. Futuros tests manuales AC-30/31/35; resultados no ejecutados en Slice0.

## Impact / dependencies

R01–R05 ya adoptadas en [review](../engineering-work-orders/CHK-001-slice-0-review.md); datos reales de configuración se provisionan en slices dependientes. EWOs Draft de cada UI planean state coverage; EWO-014 Proposed no se considera implementado ni aprobado por este feature.


## R01–R05 — comportamiento aprobado

Facility del vehículo es explícito y scope de actor mostrado cuando corresponda; no claim/assign fuera de facility. Mecánico invalida con motivo técnico, Logística con incidente/evento operacional; scope desconocido deniega y ofrece error de permiso. Invalidación append-only, sin editar contenido firmado.

R02 muestra como hard blockers aceite/refrigerante críticos, fuga severa, llanta severa/ponchadura y PSI fuera límites críticos configurados; review UNFIT no ofrece downgrade a apto. PSI normales/críticos vienen del backend/version.

Validez termina medianoche local America/Mexico_City, no24h; no presentar autoqueue para EN_RUTA/EN_TALLER/INACTIVA o físico no demostrado. Physical state fuente Flota explícita; conflicto journey/patio visible como inconsistencia, sin toggle que reconcilie silenciosamente. Null knowledge no es quinto estado físico. Urgency a exactamente2h de retraso sigue ATTENTION, después CRITICAL; texto indica retraso desde due instant configurado, no tiempo bruto desde salida. No causa NORMAL, hard/UNFIT/docinvalid CRITICAL, CHECKrequired/inprogress/observation ATTENTION.
