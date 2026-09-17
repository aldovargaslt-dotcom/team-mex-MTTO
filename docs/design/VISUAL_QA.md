# Visual QA

Crítica del **UI renderizado**, no del spec. Primer pase **solo lectura**: no parchear `web/src`.

Quién: subagente `ux-auditor`. No el mismo razonamiento que implementó. Tras 3–5 hallazgos acordados, el **implementer** corrige y vuelve a capturar.

---

## Entrada

- Spec UX (plantilla o Must del corte).
- Briefs: anti-generic, pasteles, nav, 44px, UX operacional o tablero Flota — **abrir**, no recitar de memoria.
- [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md), [UI_ANTI_PATTERNS.md](UI_ANTI_PATTERNS.md), [VISUAL_HIERARCHY.md](VISUAL_HIERARCHY.md).
- Screenshots click-through ([SCREENSHOT_WORKFLOW.md](SCREENSHOT_WORKFLOW.md)): rol desde `/`, sin chrome DevTools.
- Diff `web/src` (¿visual only tocó `api/src`? → fallar alcance, pasar a `sd-scope`).

Sin PNG del flujo: **no OK**. Una captura estática de ruta profunda no basta.

---

## Orden de impacto (arreglar en este orden)

1. **Jerarquía** — no se entiende objeto / excepción / acción en 5 s. P3 compitiendo con P0.
2. **Acciones** — dos naranjas; primario débil; destructiva como CTA; verbos pastel.
3. **Contenedores** — cards de más, vacío, doble borde (card + tabla).
4. **Densidad y ritmo** — marketing whitespace **o** tipo &lt;12px.
5. **Semántica de color** — naranja decorativo; filtros pintados; semáforo en filas sanas.
6. **Alineación / grid** — acciones que bailan, thead vs celdas, sheet vs página.
7. **Consistencia** — un listado con chips y el gemelo con card+select; `.btn` nuevo vs `Button`.
8. **Estados** — empty mudo, loading ausente, error genérico, warning que parece banner de marketing.
9. **Tipografía** — H1 &gt;22px, todo bold, mezcla de escalas.
10. **Decoración** — iconos de más, pills, sombras, radio 16.

Preferir **quitar** (card, badge, icono, botón) antes que añadir peso visual.

---

## Barra (pass / fail)

Fail inmediato:

- No se responde “qué es” + “qué está mal o qué sigue” en 5 s.
- Más de un fill naranja sólido, o naranja en filtro.
- Screenshot con DevTools / device-toolbar, o sin role picker cuando el rol importa.
- Copy en inglés de chrome (`Choose File`) o jerga SQL.
- Cortes visual only con diff en `api/src`.
- Hits &lt;44px en WO `<768` (brief 44px).
- Inicio/Flota con KPIs o gráficas.

El resto: hallazgos priorizados, no un wall of nits.

---

## Salida (obligatoria)

```text
Veredicto: OK | no OK

Hallazgos (3–5, mayor impacto primero)
1. [P0|P1|P2] archivo / pantalla — problema — por qué (brief o doc citado) — arreglo mínimo
2. …
```

- Citar Must/Don’t o sección de `docs/design/*`.
- Paths de shots revisados.
- No rediseñar el módulo. No proponer tokens nuevos. No unificar notify.

Si OK: una línea (“jerarquía y un CTA se sostienen; shots X, Y”).

---

## Después del OK

Hold de merge hasta **SD / visual OK** (plantilla de PR). Correcciones → nuevos PNG de las pantallas tocadas, no un essay.
