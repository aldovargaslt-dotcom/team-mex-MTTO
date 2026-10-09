# UX principles — software operacional

Team Mex es taller + patio, no un SaaS de analytics. El usuario no “explora”: llega, ve qué está mal, actúa, se va.

Complementa [anti-generic](../design-system/ui-polish-anti-generic-v0.md). No lo sustituye.

---

## Audiencia

| Rol | Superficie típica | Cómo trabaja |
|-----|-------------------|--------------|
| Supervisor | Mobile + wizard WO, Inicio, Existencias, Andon | En el piso; una mano, prisa, 44px |
| Admin directivo | Desktop listado → ficha | Denso, Salesforce liviano |
| Logística | `/flota` (home) | Viaje: quién, a dónde, falta entrada |

Copy en **español de taller/patio**. Nunca `t_km`, `min_qty`, “umbral”, “regla”, chrome en inglés (“Choose File”).

---

## Cada pantalla responde, en este orden

1. **¿Qué estoy viendo?** Título = objeto operacional (`U-101`, Existencias, Flota), no un slogan.
2. **¿Hay algo mal?** Andon abierto, stock bajo/agotado, salida sin entrada, error de carga. Visible en &lt;5 s.
3. **¿Tengo que actuar?** Un CTA primario o filas que *son* la acción (Inicio, inbox).
4. **¿Cuál es el estado ahora?** Badge / columna Viaje / lede. Estado ≠ atención (Flota).
5. **¿Qué apoyo hay?** Historial, movimientos, hints. P3: no pelea con 2 ni 3.

Jerarquía visual: [VISUAL_HIERARCHY.md](VISUAL_HIERARCHY.md).

---

## Principios (accionables)

**Operacional, no genérico.** Densidad de patio. Bordes, no sombras. Radio 6–8. H1 ≤ 20–22px.

**Información desigual.** P0 no comparte peso con metadatos. Color = semántica.

**Consulta ≠ edición.** Listas para escanear; editar en ficha, dialog o sheet (Existencias, Flota tablero).

**Una pregunta por control.** Subrayado = dónde estoy. Chip = filtro. Botón = acción. Inicio ≠ campanita.

**Excepciones, no dashboards.** Inicio y Flota no llevan KPIs ni “Próximamente”.

**Estados de verdad.** Loading de una línea, empty que explica por qué, error que se puede reler, warning que no parece marketing.

**Desktop-first, excepto WO.** Admin/Flota se diseñan a 1440. El wizard se prueba a 390.

**Un módulo, un patrón.** No inventar un layout “especial” si [PAGE_PATTERNS.md](PAGE_PATTERNS.md) ya cubre listado, ficha, wizard, cola o form.

**No ampliar v0 por estética.** Multi-almacén, GPS, kardex, OC, etc. siguen fuera. Cortes visual only no tocan `api/src`.

**Craft de tarea.** Controles con hover/focus/disabled; overlays por portal; motion 150–250 ms solo de estado. Detalle: [OPERATE_CRAFT.md](OPERATE_CRAFT.md). No instalar skills de landing.

---

## Densidad

- Escanear filas, no admirar whitespace.
- No subir densidad achicando tipo bajo 12px.
- No bajar densidad con cards, héroes o `space-y-8` de landing.

---

## Acciones

- Primaria: naranja, una por vista (Inicio no lleva naranja: las filas navegan).
- Destructiva: rosa suave, nunca naranja.
- “Configurar alertas” y “Volver” son secondary.
- Verbos de fila: outline/quiet, o desaparecen si la fila es clickeable.

---

## Consistencia entre módulos

Mismo shell, mismos botones, mismas tablas, misma gramática de filtros. Flota reusa `.list-filter` y `DataTable`; no kanban ni cards por unidad. Inventario no se “ve Andon”; Andon no muestra stock.
