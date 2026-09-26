# UX spec — Logística Flota visual v0

> Alcance histórico: tablero detallado `/flota`. Para el dashboard `/logistica`, la fuente de verdad es [ux-logistica-dashboard-v0](../design/ux-logistica-dashboard-v0.md) bajo EWO-008. No aplicar a `/logistica` las acciones o jerarquía reemplazadas por esa spec.

Complementa [brief-logistica-flota-visual-v0](brief-logistica-flota-visual-v0.md) (rev 19e) y [ADR-010](../../architecture/ADR-010-flota-sin-regreso-alertas-v0.md). Plantilla: [UX_SPEC_TEMPLATE](../design/UX_SPEC_TEMPLATE.md).

## Screen purpose

Ver qué unidades están en ruta, quién rebasó el umbral de regreso, y registrar el regreso (Kernel `opsEstado` + `salida_at`).

## Primary user

`LOGISTICA` (desktop). Espejo `ADMIN_DIRECTIVO`. No wizard WO. No catálogo Mantenimiento.

## Questions the screen must answer

1. ¿Qué estoy viendo? — Flota operativa (placas), no visitas ni assign-chofer. Default **Todos**.
2. ¿Hay algo mal? — Umbral sin regreso (alerta), no solo “en ruta”.
3. ¿Debo actuar? — Registrar regreso.
4. ¿Cuál es el estado ahora? — En ruta / Disponible + Foráneo|Local + destino.
5. ¿Qué apoyo hay? — Sheet de regreso. Config alertas (horas). Campanita. Sin ficha navy.

## Primary action

`Registrar regreso` — `Button` `default` (naranja). Una por vista.

## Secondary actions

- KPI En ruta | Disponibles | Total | **Sin regreso** — filtros (look pre-#62 `unidades-kpis`).
- Chips **Local | Foráneo** — filter-bar; ninguno pre-seleccionado.
- Config alertas — `quiet` / `secondary`. No naranja.
- Cancelar — `secondary`.
- Cambiar rol — quiet/ghost.

## Information hierarchy

P0: H1 Flota + CTA Registrar regreso + KPI Sin regreso / En ruta.  
P1: fila (placas) + pill **Sin regreso**.  
P2: chofer, ubicación, destino, chips Local|Foráneo, búsqueda.  
P3: Config alertas. Ninguna (sin subnav Ciclos/Sitios).

Qué se calla: STOCK|RUTAS como ubicación, Ver ficha navy, assign chofer, GPS, Ciclos, Sitios, chip de filter-bar “Sin regreso”.

## Pattern

[PAGE_PATTERNS](../design/PAGE_PATTERNS.md) **3** + KPI strip pre-#62 (`unidades-kpis`) + `ListFilter` chips + sheet **7**. No ListChrome Mode B de #62 en este corte.

## States

- loading: `Cargando flota…`
- empty En ruta: `Nadie en ruta. El regreso se registra aquí.`
- empty Disponibles: `Nadie disponible.`
- empty Sin regreso: `Nadie sin regreso.`
- empty Local / Foráneo: `Nadie en esta ubicación.`
- empty búsqueda: `Nadie coincide con la búsqueda.`
- error: `FormAlert`
- warning: alerta `Sin regreso` (ámbar, no CTA)
- normal: tabla densa, hover `#F8FAFC`, ›

## Interaction notes

- Default URL vacía = Todos (ningún chip, ningún KPI de triage activo salvo Total como “todos”).
- KPI clicable filtra `?chip=` (ops) o `?alerta=SIN_REGRESO` (no chip de barra).
- Chips Local|Foráneo → `?ambito=`. Clic de nuevo deselecciona.
- CTA o fila En ruta abre sheet; POST regreso persiste Kernel y limpia campanita.
- Fila Disponible → ficha viaje `/flota/unidades/:id` (no `/unidades` MTTO).
- Búsqueda placas / nombre unidad.
- Campanita `FLOTA_SIN_REGRESO` → `/flota?alerta=SIN_REGRESO`.

## Mobile / responsive

- Desktop 1440: KPI + tabla.
- 1024: tabla con scroll.
- 390: hits 44px en CTA y KPI.

## Fuera / Don’t

Assign desk, geo, Ciclos/Sitios, segundo naranja, badge En ruta `#EA7515`, chip Sin regreso en la barra, tocar `web/src` Mantenimiento catálogo, unificar notify, escribir Andon.

## Proof

- `docs/screenshots/logistica_flota_visual_en_ruta_d1440.png`
- `docs/screenshots/logistica_flota_visual_sheet_d1440.png`
- `docs/screenshots/logistica_flota_visual_despues_d1440.png`
- `docs/screenshots/logistica_flota_visual_local_sin_regreso_d1440.png`
- `docs/screenshots/logistica_flota_chips_ambito_d1440.png`
- `docs/screenshots/logistica_flota_kpi_sin_regreso_d1440.png`
- `docs/screenshots/logistica_flota_config_alertas_d1440.png`
- `docs/screenshots/logistica_flota_campanita_sin_regreso_d1440.png`
- `docs/screenshots/logistica_flota_regreso_limpia_d1440.png`
