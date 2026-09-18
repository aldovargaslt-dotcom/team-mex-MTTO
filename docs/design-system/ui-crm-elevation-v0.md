# UI — CRM elevation v0

Estado: **Slice 1 en vuelo** (visual only). Spec de ingeniería: [docs/design/](../design/).

Problema: listados Admin (Despacho) se leen como plantilla: KPI tiles, `Ver ficha` navy, dos naranjas, vacío sparse.

Meta: **Mode B Despacho** — listado → registro denso. Un naranja por vista. Filas que se sienten registros.

**Color lock (do not break):** orange `#EA7515` = ONE primary CTA per view; gray/outline = secondary; green/amber/red = badges ONLY. Soft Entrada optional `#FFF7ED`/`#FDBA74`/`#C2410C`. Danger soft rose for Inactivar. OUT: blue underlined link-as-row-action; icon-only without label on mobile.

## UI modes (Aldo lock)

| Mode | Superficies | Este PR |
|------|-------------|---------|
| **B Despacho** | Unidades list, Stock/Existencias list | **Apply** |
| **A Field-service** | Visitas, WO wizard, taller hub/ficha flows | **Do not restyle.** No convertir en tablas CRM. |

## Slice 1 — Mode B only

Unidades + Stock, desktop.

### Must

1. Toolbar: **title + count + ONE primary CTA** (filters in the same band).
2. Full-row open + hover + trailing ›. Unidades: fila abre ficha (no `Ver ficha` navy). Stock: fila abre refacción.
3. Filter chips: tipos (Unidades) / alerta stock (Existencias). No card around a filter.
4. Dense CRM: page pad 12–16; rows ~40–44; border > shadow; radius 6–8; matar whitespace muerto.
5. Quiet secondaries + `focus-visible`. Stock: un naranja = **Registrar entrada**; **Configurar alertas** = quiet/outline NEVER orange.
6. Empty Stock: one-liner denso + CTA opcional quiet (`Ver refacciones`). Sin vacío de marketing.
7. Affordance on Mode B verbs: quiet-fill `#EEF2F6` + border + hover. Cambiar rol (shell) = ghost, never orange.

### Don’t

- Mode A: Visitas / WO / taller hub chrome pass. No `Nueva visita` restyle in this PR.
- Mobile card-row WO-style (Slice 2).
- Ítems / Inbox list chrome (Slice 2).
- BrandPlate / logo / `api/src` / Inventario domain.

## Slice 2 (diferido)

Mobile card-row. Ítems + Inbox. Hub header polish. Mode A stays field-service.

## Pattern

[PAGE_PATTERNS](../design/PAGE_PATTERNS.md) 3 y 4. No patrón 6 (WO).

## Proof

- `docs/screenshots/crm_elev_unidades_list_desktop_d1440.png`
- `docs/screenshots/crm_elev_stock_list_desktop_d1440.png`

Hold SD / visual OK. No merge.
