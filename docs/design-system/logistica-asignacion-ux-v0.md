# UX spec — Logística asignación v0

Complementa [brief-logistica-asignacion-v0](brief-logistica-asignacion-v0.md) y [ADR-008](../adr/008-flota-schema.md). Plantilla: [UX_SPEC_TEMPLATE](../design/UX_SPEC_TEMPLATE.md).

## Screen purpose

Despacho asigna o quita un chofer ACTIVO a una unidad libre (1:0..1).

## Primary user

`LOGISTICA` (desktop Mode B). Espejo `ADMIN_DIRECTIVO`. No Supervisor. No wizard WO.

## Questions the screen must answer

1. ¿Qué estoy viendo? — Choferes activos de despacho, no el catálogo admin ni la bitácora de patio.
2. ¿Hay algo mal? — Nadie disponible, o el chofer ya tiene unidad.
3. ¿Debo actuar? — Asignar a unidad (CTA) o abrir la fila.
4. ¿Cuál es el estado ahora? — En ruta / Disponible + placas si hay unidad.
5. ¿Qué apoyo hay? — Sheet de asignar/quitar. Sin ficha navy.

## Primary action

`Asignar a unidad` — `Button` `default` (naranja). Una por vista.

## Secondary actions

- Chips Disponibles | En ruta | Todos — `ListFilter` segmented.
- Quitar de la unidad — `outline` o `dangerSoft` en el sheet (no segundo naranja).
- Cancelar — `secondary`.
- Cambiar rol — quiet/ghost del shell.

## Information hierarchy

P0: H1 Logística + count + CTA Asignar a unidad.  
P1: KPI En ruta / Disponibles / Total (ACTIVO); fila clicable.  
P2: chips, búsqueda, badge ops, placas.  
P3: nada (sin VIN, sin Ver ficha, sin historial).

Qué se calla: tipos STOCK|RUTAS, tip banner, alta chofer, bitácora SALIDA/ENTRADA, Health, Andon.

## Pattern

[PAGE_PATTERNS](../design/PAGE_PATTERNS.md) **3** (listado denso + filtro) + sheet patrón **7**. KPI strip quieto (tres celdas borde, sin iconos pastel, sin segundo naranja). Chrome Mode B: `ListChrome` + `DataTable` `rowAffordance`.

## States

- loading: `Cargando choferes…`
- empty Disponibles: `No hay choferes disponibles. Todos están en ruta.`
- empty En ruta: `Nadie en ruta. Asigne un chofer a una unidad.`
- empty Todos: `No hay choferes activos.`
- empty búsqueda: `Nadie coincide con la búsqueda.`
- error: `FormAlert` con el mensaje de la API.
- normal: tabla densa, hover `#F8FAFC`, › al final.
- warning: badge En ruta (ámbar de estado, no CTA).

## Interaction notes

- Fila o › abre sheet del chofer (asignar si Disponible; quitar si En ruta).
- CTA abre sheet con chofer disponible + unidad libre.
- Filtros en URL `?chip=&q=`.
- Unidades libres = `GET /unidades` con `choferId` vacío.
- No “Ver ficha”. No overwrite: unidad ocupada exige quitar primero.

## Mobile / responsive

- Desktop 1440: toolbar + KPI + tabla.
- 1024: KPI a 3 columnas apretadas; tabla con scroll.
- 390: hits 44px en CTA y chips; sheet full height. No card-row (Mode B desktop-first).

## Fuera / Don’t

Geo/rutas, multi-asignación, nav Supervisor, tip banner, Ver ficha navy, chips de tipo de unidad, alta chofer, `api` de Flota/Inventario/Andon, segundo naranja, KPI tiles con icono azul/verde/rojo.

## Proof

- `docs/screenshots/logistica_asignacion_disponibles_d1440.png`
- `docs/screenshots/logistica_asignacion_en_ruta_d1440.png`
- `docs/screenshots/logistica_asignacion_sheet_d1440.png`
