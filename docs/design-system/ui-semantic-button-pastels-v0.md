# UI — semantic pastel buttons v0

Estado: aceptado (visual only). **Este texto sustituye el mapa previo pastel-on-verbs** (mint Entrada / ámbar Ajuste / sky Detalle-Vincular).

Problema: verbos de fila con fill mint/ámbar/sky se leen como estado, no como acción. En mobile la columna de botones recorta SKU/Nombre.

Meta: naranja sólido **un CTA por vista**. Secundarios = gris/outline navy. Pasteles de color **solo en badges de estado**. Primer corte: Inventario Stock, ficha ítem, inbox.

Stack: CSS vars + variantes shadcn (`Button`). Dominio / Inventario apply / Andon / BrandPlate / ADR-000 / ADR-002 sin cambios.

## Tokens (botón)

| Token | Fill | Texto | Borde | Uso |
|-------|------|-------|-------|-----|
| Primary | `#EA7515` | blanco | — | **un** CTA sólido por vista (Registrar entrada, Nuevo ítem) |
| `btn-entrada` (opcional) | `#FFF7ED` | `#C2410C` | `#FDBA74` | fila Entrada (tinte naranja suave, no sólido) |
| `btn-quiet` | `#EEF2F6` | `#334155` | `#CBD5E1` | Marcar todas leídas |
| `btn-danger-soft` | `#FDE2E1` | `#8B1E1E` | `#F5B5B3` | Inactivar |
| Outline / secondary | blanco / card | navy `#24284D` | navy o `#E4E5EC` | Ajuste, Detalle, Guardar mínimo, Vincular, Activar |

Variantes shadcn: `entrada` | `quiet` | `dangerSoft` + `outline` / `secondary`. **No** hay `positive` / `adjust` / `linkish` en verbos.

## Pasteles = badges, no verbos

Verde / ámbar / rojo / sky **solo** en status badges (BAJO / AGOTADO / OK / Activo). Nunca fill mint `#D8F3DC`, ámbar `#FFF3CD` ni sky `#D6EAF8` en botones de acción.

## Apply first

- **Stock:** header Registrar entrada → primary. Fila Entrada → `btn-entrada`. Fila Ajuste → `outline` navy.
- **Ítems lista:** Detalle → `outline` (texto navy, sin sky). Inactivar → `btn-danger-soft`. Activar → `outline`.
- **Ficha ítem:** Guardar mínimo y Vincular → `outline` / secondary. Nuevo ítem = único naranja sólido.
- **Inbox:** Marcar todas leídas → `btn-quiet` (gris, no sky).
- **Mobile `<768` / 390:** filas card. Identidad (SKU + Nombre) completa primero; acciones **debajo**, sin recortar la columna de botones.

## Must

1. Un naranja sólido `#EA7515` por vista.
2. Verbos secundarios = outline/gris; Entrada puede tinte `#FFF7ED` / `#C2410C`.
3. Inactivar = rose danger-soft. Detalle = outline navy, no sky fill.
4. Hit ≥44 en viewport `<768`.
5. Mobile Stock (e Ítems): no clip SKU/Nombre; stack actions under identity.

## Evidencia

- `docs/screenshots/pasteles_stock_lista.png`
- `docs/screenshots/pasteles_stock_items.png`
- `docs/screenshots/pasteles_stock_ficha.png`
- `docs/screenshots/pasteles_inbox_unread.png`
- `docs/screenshots/pasteles_stock_mobile.png`
- `docs/screenshots/pasteles_stock_items_mobile.png`
- `docs/screenshots/pasteles_inbox_mobile.png`

## Don’t

Dos naranjas sólidos; mint/ámbar/sky en verbos; neón / gradientes; blanco sobre pastel de badge usado como botón; recortar SKU/Nombre en 390; tocar BrandPlate/logo o dominio Andon.
