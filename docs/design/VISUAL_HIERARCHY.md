# Visual hierarchy — P0 a P3

Toda pantalla operacional debe poder leerse en **menos de cinco segundos** en el orden de las cinco preguntas ([UX_PRINCIPLES.md](UX_PRINCIPLES.md)).

No toda la información pesa igual. Si todo es badge + bold + naranja, nada es P0.

---

## Escala

| Nivel | Pregunta | Qué es | Cómo se ve |
|-------|----------|--------|------------|
| **P0** | ¿Qué hay mal? / ¿cuál es el objeto? | Objeto + excepción que bloquea o vence | H1 (`U-101`, título de módulo); `Note warn`; badge critical/warning **solo** si aplica ahora; 1 CTA naranja |
| **P1** | ¿Debo actuar? | Atención accionable | Fila de cola (Inicio), “Registrar entrada”, Enterado, Continuar sticky, magnitud `2 pza · mínimo 5 · faltan 3` |
| **P2** | ¿Estado / contexto actual? | Hechos de ahora | Lede, columna Viaje, chofer, km, filtros activos, badge Activa (si no es la historia) |
| **P3** | ¿Apoyo / historia? | Detalle, historial, hints | `.muted` 12px, historial de visitas, movimientos, `Hint`, VIN, timestamps |

Si una pieza P3 usa el mismo tamaño, peso y color que P0, bájala: muted, 12px, sin badge, sin card extra.

---

## Codificar jerarquía (sin decoración)

Orden de herramientas, de más a menos legítimo:

1. **Posición** — P0 arriba (header + primera región). Historial abajo.
2. **Peso y tamaño** — H1 20 / sección 13 / cuerpo 14 / meta 12. Un solo 600 fuerte por bloque.
3. **Contraste** — navy vs muted. Unread = fondo `#FFF7F0`, no un icono extra.
4. **Color semántico** — warning/critical/success. Máximo dos a la vez además de navy/gris.
5. **Superficie emphasized** — `Note warn`, `.row-warn`, unread. Una por vista salvo que haya dos excepciones reales.
6. **CTA** — un naranja. El resto outline/secondary.

No usar: gradiente, sombra, icono grande, segunda H1, card solo para “destacar”.

---

## Presupuesto de complejidad (por viewport)

Tomado de pantallas que ya funcionan (Inicio, Existencias, Flota, WO).

| Cupo | Límite |
|------|--------|
| Señal dominante | 1 (el H1 **o** la excepción **o** el CTA, según la pantalla) |
| Regiones de alto énfasis | 2–3 (ej. header + tabla + un warn) |
| Primary sólido | 1 por vista (0 en Inicio) |
| Colores semánticos vivos | ≤2 |
| Cards / paneles bordeados | Los justificados en [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md); no “una por heading” |
| Iconos Lucide | Chrome + identificador de fuente; no por fila |

Si el diseño se pasa, **simplificar** (quitar contenedor, badge o botón) antes de añadir jerarquía extra.

---

## Ejemplos del producto (no rediseñar aquí)

**Inicio.** P0 = saludo + “Requiere atención”. P1 = filas de cola. Sin P0 naranja. Vacío = P2 de una línea.

**Existencias.** P0 = título + CTA Registrar entrada. P1 = filas BAJO/AGOTADO (badge + magnitud). P2 = cantidades OK. P3 = categoría, mínimo “Sin mínimo”. Filtros = P2 (chips, no naranja).

**Flota tablero.** P0 = título Flota. P1 = columna Atención (ámbar solo si falta entrada). P2 = Viaje + Chofer. Estado ACTIVA/INACTIVA = P3 muted. Sin KPI.

**Hub unidad.** P0 = `U-101` + badge estado + Andon si ABIERTO. P1 = Nueva visita / Continuar (**un** naranja; hoy hay deuda: dos CTAs). P2 = ficha corta. P3 = historial y refacciones.

**Wizard WO.** P0 = id unidad + Borrador. P1 = Continuar sticky. P2 = paso actual. P3 = stepper desktop. Warn de choferes = P0 temporal.

**Detalle visita cerrada.** Debería ser P2 documento (secciones). Hoy cada bloque es card (P1 falso) — refactor posterior.

---

## Checklist rápido (implementer)

- [ ] El H1 nombra el objeto, no la feature.
- [ ] Lo malo se ve sin scroll en desktop 1440 (o en el primer paso del WO).
- [ ] Un naranja, o ninguno.
- [ ] Historial/meta no tienen el mismo peso que la excepción.
- [ ] Puedo responder las cinco preguntas en voz alta mirando el screenshot.
