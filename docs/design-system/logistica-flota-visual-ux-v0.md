# UX spec — Logística Flota visual v0

Complementa [brief-logistica-flota-visual-v0](brief-logistica-flota-visual-v0.md) y [ADR-009](../../architecture/ADR-009-logistica-flota-ops-estado-v0.md). Plantilla: [UX_SPEC_TEMPLATE](../design/UX_SPEC_TEMPLATE.md).

## Screen purpose

Ver qué unidades están en ruta y registrar el regreso (Kernel `opsEstado`).

## Primary user

`LOGISTICA` (desktop). Espejo `ADMIN_DIRECTIVO`. No wizard WO. No catálogo Mantenimiento.

## Questions the screen must answer

1. ¿Qué estoy viendo? — Flota operativa (placas), no visitas ni assign-chofer.
2. ¿Hay algo mal? — En ruta sin regreso (alerta).
3. ¿Debo actuar? — Registrar regreso.
4. ¿Cuál es el estado ahora? — En ruta / Disponible + Foráneo|Local + destino.
5. ¿Qué apoyo hay? — Sheet de regreso. Sin ficha navy.

## Primary action

`Registrar regreso` — `Button` `default` (naranja). Una por vista.

## Secondary actions

- KPI En ruta | Disponibles | Total — filtros (look pre-#62 `unidades-kpis`).
- Cancelar — `secondary`.
- Cambiar rol — quiet/ghost.

## Information hierarchy

P0: H1 Flota + CTA Registrar regreso + KPI En ruta.  
P1: fila (placas) + alerta sin regreso.  
P2: chofer, ubicación, destino, búsqueda.  
P3: ninguna (sin subnav Ciclos/Sitios).

Qué se calla: STOCK|RUTAS como ubicación, Ver ficha navy, assign chofer, GPS, Ciclos, Sitios.

## Pattern

[PAGE_PATTERNS](../design/PAGE_PATTERNS.md) **3** + KPI strip pre-#62 (`unidades-kpis`) + sheet **7**. No ListChrome Mode B de #62 en este corte.

## States

- loading: `Cargando flota…`
- empty En ruta: `Nadie en ruta. El regreso se registra aquí.`
- empty Disponibles: `Nadie disponible.`
- empty búsqueda: `Nadie coincide con la búsqueda.`
- error: `FormAlert`
- warning: alerta `Sin regreso` (ámbar, no CTA)
- normal: tabla densa, hover `#F8FAFC`, ›

## Interaction notes

- KPI clicable filtra `?chip=`.
- CTA o fila En ruta abre sheet; POST regreso persiste Kernel.
- Fila Disponible → ficha viaje `/flota/unidades/:id` (no `/unidades` MTTO).
- Búsqueda placas / nombre unidad.

## Mobile / responsive

- Desktop 1440: KPI + tabla.
- 1024: tabla con scroll.
- 390: hits 44px en CTA y KPI.

## Fuera / Don’t

Assign desk, geo, Ciclos/Sitios, segundo naranja, badge En ruta `#EA7515`, tocar `web/src` Mantenimiento catálogo, unificar notify.

## Proof

- `docs/screenshots/logistica_flota_visual_en_ruta_d1440.png`
- `docs/screenshots/logistica_flota_visual_sheet_d1440.png`
- `docs/screenshots/logistica_flota_visual_despues_d1440.png`
- `docs/screenshots/logistica_flota_visual_local_sin_regreso_d1440.png`
