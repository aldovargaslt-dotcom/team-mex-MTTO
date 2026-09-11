# UI — semantic pastel buttons v0

Estado: aceptado (visual only)

Problema: secundarios blancos/outline no distinguen la acción (entrada vs ajuste vs vínculo vs silencio). El naranja sólido se duplica en la misma vista (ficha: Nuevo ítem + Vincular).

Meta: tokens de botón semánticos (pastel fill + texto oscuro + borde). Primario naranja **uno por vista**. Primer corte: Inventario Stock, ficha ítem, inbox de Notificaciones.

Stack: CSS vars + variantes shadcn (`Button`). Dominio / Inventario apply / Andon / BrandPlate / ADR-000 / ADR-002 sin cambios.

## Tokens

| Token | Fill | Texto | Borde | Uso |
|-------|------|-------|-------|-----|
| `btn-positive` | `#D8F3DC` | `#1B5E20` | `#A5D6A7` | Entrada / confirmar stock |
| `btn-adjust` | `#FFF3CD` | `#8A6D1D` | `#FFE082` | Ajuste / Guardar mínimo |
| `btn-linkish` | `#D6EAF8` | `#1A5276` | `#AED6F1` | Vincular |
| `btn-quiet` | `#EEF2F6` | `#334155` | `#CBD5E1` | Marcar todas leídas |
| `btn-danger-soft` | `#FDE2E1` | `#8B1E1E` | `#F5B5B3` | destructivo suave (token; no en este corte) |
| Primary | `#EA7515` | blanco | — | **un** CTA sólido por vista |

Hover: fill un tono más cerrado, sin neón ni gradiente. Disabled: gris existente (`#d8d8de`).

Variantes shadcn: `positive` | `adjust` | `linkish` | `quiet` | `dangerSoft`. Clases CSS: `.btn-positive` … `.btn-danger-soft`.

## Apply first

- **Stock:** header Registrar entrada → primary. Fila Entrada → `btn-positive`. Fila Ajuste → `btn-adjust`.
- **Ficha ítem:** Guardar mínimo → `btn-adjust`. Vincular → `btn-linkish`. Nuevo ítem sigue siendo el único naranja.
- **Inbox:** Marcar todas leídas → `btn-quiet`.

## Must

1. Un naranja sólido por vista. Secundarios = pasteles, no segundo primary.
2. Texto oscuro sobre pastel (nunca blanco sobre pastel).
3. Hit ≥44 en viewport `<768` (compact mobile ya 44; no bajar).
4. Bordes 1px, radio 6, sin sombra, sin gradiente. Anti-generic Team Mex.

## Evidencia

- `docs/screenshots/pasteles_stock_lista.png`
- `docs/screenshots/pasteles_stock_ficha.png`
- `docs/screenshots/pasteles_stock_ficha_mobile.png`
- `docs/screenshots/pasteles_stock_mobile.png`
- `docs/screenshots/pasteles_inbox_unread.png`
- `docs/screenshots/pasteles_inbox_mobile.png`

## Don’t

Dos naranjas sólidos; neón / gradientes; blanco sobre pastel; tocar BrandPlate/logo o dominio Andon.
