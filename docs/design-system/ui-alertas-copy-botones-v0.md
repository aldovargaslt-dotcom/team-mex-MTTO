# UI — Configurar alertas (copy taller) v0

Estado: aceptado (visual only). **Sin** `api/src`, ADR nuevo, prefs por usuario ni umbral por unidad.

Problema: el taller ve `t_km`, `t_días`, `min_qty`, “umbral” y “regla”. Las cifras viven en Unidades e Inventario; la campanita solo recibe el aviso.

Meta: dueño del número junto al dato. Un botón secundario **Configurar alertas** en Unidades (Admin) y Stock (Supervisor + Admin). Naranja sigue en Nueva unidad / Nueva familia o Registrar entrada.

## Copy

| Superficie | Título / CTA | Cuerpo o resumen |
|------------|--------------|------------------|
| Unidades (Admin) | Configurar alertas → Alertas de mantenimiento | Te avisamos en la campanita cuando una unidad recorra demasiados kilómetros o pase demasiado tiempo sin visita. Basta con que se cumpla una de las dos. |
| Familia | Kilómetros / Días sin visita | Resumen: `Avisa a los 10,000 km o a los 90 días` |
| Stock | Configurar alertas → Alertas de inventario | Te avisamos en la campanita cuando un producto se esté acabando. Campo: Avisar cuando queden. Columna y ficha: Avisar si quedan. Vacío = no avisar. |
| Andon Admin | Configurar alertas | Enlace a Unidades. Hub y columna Km / días usan el mismo resumen, no “umbral”. |

Nueva / Editar familia: solo nombre y descripción. El alta envía 10,000 km y 90 días en silencio (`PATCH /andon/umbrales/:id`). Stock guarda el mismo `minQty` (blur en tabla, Guardar en el diálogo).

JSON de API sigue `tKm` / `tDias` / `minQty`. Notifications sigue siendo inbox (ADR-006).

## Must

1. Un naranja sólido por vista (ADR-003 / pasteles). Configurar alertas = `secondary`.
2. Copy en español de taller. Nunca `t_km`, `t_tiempo`, `t_días`, `min_qty`, “umbral”, “regla”.
3. Admin configura mantenimiento en Unidades. Supervisor y Admin, inventario en Stock. Nada de esto en `/notificaciones`.
4. Familia separada de alertas. Andon Admin: CTA a Unidades, no “Reglas por tipo”.
5. Click-through `proof-ui` a 390×844, sin Playwright ni chrome DevTools.

## Don’t

Prefs por usuario; umbral por placa; tercer servicio de notify; tocar `api/src`; unificar fábricas WhatsApp (dual-stack, default `noop`); `work-orders/`; multi-almacén / OC / kardex.

## Proof

- `docs/screenshots/alertas_unidades_dialog.png` — Admin, Unidades → Configurar alertas (Camión / Van).
- `docs/screenshots/alertas_familia_sin_tkm.png` — Nueva/Editar familia sin campos t_km.
- `docs/screenshots/alertas_stock_dialog.png` — Supervisor, Stock → Configurar alertas.
- `docs/screenshots/alertas_andon_cta.png` — Andon Admin, CTA Configurar alertas.
