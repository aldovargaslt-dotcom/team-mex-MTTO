# UI — CRM elevation v0

Estado: **Slice 1 LOCKED** (visual only). Spec de ingeniería: [docs/design/](../design/).

**Color lock:** orange `#EA7515` = ONE primary CTA per view; gray/outline = secondary; green/amber/red = badges ONLY. Soft Entrada optional `#FFF7ED`/`#FDBA74`/`#C2410C`. Danger soft rose for Inactivar. OUT: blue underlined link-as-row-action; icon-only without label on mobile.

## Slice 1 MUST (Unidades + Stock desktop)

### List chrome

- Toolbar: title + count (`N unidades` / stock count) + ONE orange CTA
- Full-row open → ficha/record
- Hover row quiet `#F8FAFC` + pointer
- Trailing › or ⋯ overflow for secondary row actions
- Filter chips segmented (Stock: Todos|Bajo|Agotado); active = underline/quiet fill, NOT solid orange

### Affordances

- Primary orange `#EA7515` one per view
- Secondary outline or quiet fill `#EEF2F6` + border; ≥36 desktop
- Soft Entrada optional; danger soft rose Inactivar
- OUT: blue underline links as actions

### Shell

- Cambiar rol + sub-nav quiet/ghost (not CTA)
- `focus-visible` rings on nav, chips, buttons, rows

### Don’t

- Mobile card-row (Slice 2)
- Hub header polish
- Visitas / WO / taller Mode A restyle
- BrandPlate / logo / `api/src`

## Proof

Before:

- `docs/screenshots/crm_elev_unidades_list_desktop_before_d1440.png`
- `docs/screenshots/crm_elev_stock_list_desktop_before_d1440.png`

After:

- `docs/screenshots/crm_elev_unidades_list_desktop_d1440.png`
- `docs/screenshots/crm_elev_stock_list_desktop_d1440.png`

Hold SD / visual OK. No merge.
