# UX spec — Ficha individual de unidad / Resumen v0

Estado: **este corte**. Visual + integración con datos existentes. **Sin** `api/src`.

Complementa el spec funcional de ficha Resumen. Plantilla: [UX_SPEC_TEMPLATE.md](../design/UX_SPEC_TEMPLATE.md). Patrón base: hub / ficha ([PAGE_PATTERNS.md](../design/PAGE_PATTERNS.md) §5), con riel **Acciones** local a esta pantalla.

## Screen purpose

El supervisor abre una unidad y diagnostica en segundos: qué unidad es, qué Health tiene, qué requiere atención (mantenimiento / alerta) y qué acción tomar.

## Primary user

`SUPERVISOR` (desktop, ficha MTTO). `ADMIN_DIRECTIVO` consulta y edita catálogo; no crea visitas. No `LOGISTICA` (Health y hub MTTO fuera de v0 para ese rol).

## Mapping diseño → existente

No se inventan métricas, estados, alertas, km, operadores ni Health.

| Diseño solicitado | Campo / flujo existente | Este corte |
|-------------------|-------------------------|------------|
| Identidad (núm. interno, estado, marca/modelo/año, tipo) | `GET /unidades/:id/hub` → `fichaCorta` | Mostrar |
| Descripción secundaria | `GET /unidades/:id` → `tipo.descripcion` | Si viene |
| Icono / foto | No hay fotos de unidad. `tipo.icono` + `UnidadTipoMark` | Placeholder de tipo; no fotos fake |
| Placas, VIN | `fichaCorta` | Mostrar. Sin copy-to-clipboard (no hay patrón) |
| No. económico | = `numeroInterno` | No duplicar en metadatos |
| Sucursal / ubicación | Flota `sitioNombre` (otro BC) | **Omitir** |
| Asignada a / chofer actual | Flota `choferActualNombre` (otro BC) | **Omitir** |
| Última actualización | `Unidad.updatedAt` en `GET /unidades/:id` | Si viene |
| Health | `GET /unidades/:id/health` + `getHealthSemantic` | Consumir; no recalcular |
| Click Health | `Sheet` existente | Conservar; breakdown del DTO |
| Próximo mantenimiento | Aviso Andon no resuelto + `health.drivers` `MAINTENANCE_*` + `GET /andon/umbrales` + última visita cerrada | Copy operacional; sin progreso inventado si no hay aviso |
| Últimas alertas | `GET /andon/avisos?unidadId=` (no resueltos) | Una alerta; empty dedicado |
| Marcar como enterado | `POST /andon/avisos/:id/enterado` (solo Supervisor) | Mismo verbo; ACK ≠ resuelto |
| Estado administrativo | `fichaCorta.estado` ACTIVA/INACTIVA | Mostrar |
| Situación operacional (en ruta, etc.) | Patio / Flota, no el hub MTTO | **Omitir** (sí anotar Envío especial) |
| Último kilometraje | `fichaCorta.ultimoKm` + `historialCerrado[0].cerradoAt` | Copy “Último kilometraje” |
| Color, capacidad, documentos, mapa | No existen en dominio v0 | **Omitir** |
| Inventario asignado, Costos, Reportes, Notas | No hay secciones de producto | **No** en el riel |
| Sidebar Acciones | Hoy `.subnav` Resumen / Técnica / Mantenimiento / Historial | Mismas 4 vistas; riel “Acciones” |
| Editar | `/unidades/:id/editar` (Admin) | Reusar página |
| Registrar mantenimiento | `POST /unidades/:id/visitas` (“Nueva visita”) | Unificar nombre en el hub |
| Continuar visita | Borrador existente | Primario naranja si hay borrador |
| Más acciones | Solo si hay una acción real de más (p. ej. registrar con borrador ya abierto) | No inventar Eliminar / inspección / asignación |
| Volver a unidades | `/unidades` | Copy “Volver a unidades”. Sin persistir filtros (hoy no están en URL) |
| Permisos | `puedeCrearVisita`, RoleGate, `enterado` Supervisor, PATCH unidad Admin | Ocultar en UI; auth sigue en API |

## Questions the screen must answer

1. ¿Qué unidad estoy viendo?
2. ¿Hay algo mal? (Health + alerta Andon + vencimiento)
3. ¿Debo actuar? (Registrar / Continuar / Enterado / Editar)
4. ¿Cuál es el estado ahora? (Activa/Inactiva, km, último servicio)
5. ¿Qué apoyo hay? (ficha técnica corta, actividad reciente → Historial)

## Primary action

Una por vista, naranja:

- Supervisor con borrador: **Continuar**
- Supervisor sin borrador y `puedeCrearVisita`: **Registrar mantenimiento**
- Admin: ninguna naranja (Editar = `secondary`)

## Secondary actions

- **Editar** — `secondary`, solo Admin
- **Marcar como enterado** — `outline`, Supervisor, aviso `ABIERTO`
- **Más acciones ▼** — `secondary`, solo si hay ítem real
- **Volver a unidades** — enlace, no CTA

## Information hierarchy

P0: Health en header; **Próximo mantenimiento** y **Últimas alertas** (bloques dominantes).

P1: Identidad; CTA; estado administrativo; último kilometraje.

P2: Información técnica resumida; actividad reciente (3–5).

P3: VIN, timestamps, mensajes de permiso.

Qué se calla: mapa, documentos, sucursal, chofer de patio, módulos ficticios, KPI, fotos inventadas, recálculo de Health, “En ruta”.

## Pattern

Hub / ficha (5), no dashboard 1280. Contenido en `.main` 1040px. Cards solo para las secciones de ficha (ops, estado, técnica, historial). Un naranja. Semántica de Health vía `getHealthSemantic`. Andon copy de taller (`explicacionAlertaAndon`).

## States

- loading (página): `Cargando ficha de la unidad…`
- loading (Health): `Cargando salud…` — nunca `0%`
- Health `available: false`: label del backend (`No disponible`) + mensaje del backend
- Health error de red: `Health no disponible`; el resto de la ficha sigue
- empty alertas: `Sin alertas activas` / `La unidad no requiere atención actualmente.`
- empty mantenimiento: `Sin mantenimiento programado` (sin visita cerrada ni aviso)
- warning: Andon vencido / `MAINTENANCE_DUE` — color en título, dato, borde suave
- critical: aviso abierto o Health CRITICAL — no teñir toda la página
- ACK: `Enterado` + fecha; la alerta sigue activa hasta visita cerrada

## Interaction notes

- Health → Sheet de breakdown (solo DTO).
- Card mantenimiento / chevron → `?vista=mantenimiento`.
- Chevron alertas → `/andon`.
- Enterado no navega.
- Riel Acciones conserva el header de identidad.
- Desktop: riel izquierdo. `≤800px`: riel horizontal scrollable.

## Mobile / responsive

- Desktop 1440: identidad + Health; dos cards P0; hechos; técnica | actividad.
- 1024: mismo grid; riel ~160px.
- 800: una columna; orden Identidad → Health → Mantenimiento → Alertas → Estado → Técnica → Actividad.
- 390: hits 44px en el riel y CTAs; no es WO.

## Fuera / Don’t

- `api/src`, ownership Inventario/Andon/Flota, dual-stack notify.
- GPS, mapa, documentos, ítem↔placa, inspección como BC.
- Recalcular Health o remaining km/días en el cliente.
- Tabs de expediente extra; módulos Costos / Reportes / Notas / Inventario asignado.
- Dos naranjas; sombras; radio 16; KPIs.

## Proof

Click-through desde `/` (rol Supervisor y Admin):

- `ficha_resumen_critica_d1440.png`
- `ficha_health_sheet_d1440.png`
- `ficha_resumen_acciones_d1440.png`
- `ficha_tecnica_d1440.png`
- `ficha_mantenimiento_d1440.png`
- `ficha_resumen_m390.png` (riel horizontal / stack)
