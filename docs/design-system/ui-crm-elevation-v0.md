# UI — CRM elevation v0

Estado: **Mantenimiento Supervisor REVERTIDO** (visual only). Spec de ingeniería: [docs/design/](../design/).

Slice 1 (#62) put Mode B Despacho list chrome on Mantenimiento Unidades + Existencias. Aldo quiere de nuevo el listado Supervisor **KPI + lista** (pre-#62). El catálogo demo no se toca: tipos `STOCK | RUTAS | CAMIONES 3 Y MEDIA`, 13 unidades, 7 choferes.

**Color lock:** orange `#EA7515` = ONE primary CTA per view; gray/outline = secondary; green/amber/red = badges ONLY. Soft Entrada optional `#FFF7ED`/`#FDBA74`/`#C2410C`. Danger soft rose for Inactivar.

## Mantenimiento Supervisor (este corte)

Restore pre-#62 chrome on `/unidades` and `/inventario/stock` only.

### Unidades

- Hero + lede + aside “Flota de mantenimiento”
- KPI cards: Total / Activas / Inactivas / Alertas (filtran la lista)
- Búsqueda + Estado + Limpiar / Buscar
- Tipo chips disconnected con conteo; activo = fill navy (no segmented, no underline)
- Tabla: Unidad (interno P0) · Tipo · Placas · Estado · Alerta · Ver ficha
- Default sort interno; page size 5 + pager
- Consejo de búsqueda

### Existencias

- `PageHeader` + Configurar alertas (secondary) + Registrar entrada (naranja)
- Chips Todos|Bajo|Agotado disconnected; activo = muted fill, sin subrayado
- Fila abre ficha; sin chevron Mode B

### Don’t

- Quitar seed / catálogo / tipos (`api/src`)
- Restyle Visitas / WO / taller
- Logística Flota / tablero viaje / assign desk (otro PR)
- ADR-009 `icono` de tipo
- BrandPlate / logo

## Fuera

Mode B Despacho en Flota. Slice 2 mobile card-row. Hub header polish.

## Proof

Post-revert Supervisor (VM viewport 1280×800; `d1440` not available in this agent):

- `docs/screenshots/mtto_revert_unidades_list_desktop_d1280.png`
- `docs/screenshots/mtto_revert_stock_list_desktop_d1280.png`

Hold SD / visual OK. No merge.
