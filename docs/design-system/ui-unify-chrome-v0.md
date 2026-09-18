# Unify chrome — corte visual v0

Estado: **propuesto** (este PR). Visual only: no `api/src`. No rediseña tokens (ADR-003). No instala skills de landing.

Paga deuda de [UI_AUDIT.md](../design/UI_AUDIT.md) § refactor 1–4 y cierra el contrato de **primer pase** ([ui-implementer](../../.cursor/skills/ui-implementer/SKILL.md)): clonar el patrón/hermano antes de JSX.

Hub tabs (`HubFichaNav`) **ya shipped** — no tocar IA. Salud (ADR-010) se queda en el header. No duplicar Andon / salud / actividad. Flota, GPS, KPI, dual-stack notify: fuera.

---

## Screen purpose

Una ficha de unidad se lee como excepción + acción, no como dos cards del mismo atraso. Una visita cerrada se lee como documento. Choferes filtra como Andon. El chrome de página es `PageHeader` + `Button`.

## Primary user

Supervisor (hub + WO) y Admin (ficha, Choferes, catálogo). Desktop 1440; WO empty/closed también `d1440`; shell mobile `m390` en hub.

## Questions the screen must answer

1. ¿Qué estoy viendo? — `U-101` / Choferes / visita cerrada.
2. ¿Hay algo mal? — un panel Andon (causa una vez) o nada.
3. ¿Debo actuar? — un naranja por vista (Nueva visita o Continuar).
4. ¿Cuál es el estado ahora? — Salud en header; dl Estado y operación.
5. ¿Qué apoyo hay? — último mantenimiento / borrador; historial en su tab.

## Primary action

| Vista | Label | Variant |
|-------|--------|---------|
| Hub Resumen (vencido + puedeCrear) | Nueva visita | `default` |
| Hub Resumen (sin vencido) | — (cero naranja; Volver secondary) | |
| Hub Mantenimiento (hay borrador) | Continuar (primer borrador) | `default`; Nueva visita `outline` |
| Hub Mantenimiento (sin borrador) | Nueva visita | `default` |
| Choferes | Agregar chofer | `default` |
| Visita cerrada | — | Volver `secondary` |
| Categorías / Proveedores | Agregar … | `default` |

## Secondary actions

Enterado `outline`. Volver / Editar unidad `secondary`. Eliminar borrador `destructive`. Inactivar categoría/proveedor `secondary`.

## Information hierarchy

P0: H1 objeto + un panel de excepción (Andon) o el documento de visita.
P1: un CTA naranja.
P2: Estado y operación; chips ListFilter; Salud widget.
P3: actividad (último cierre + borrador); secciones del documento; catálogo.

Qué se calla: segunda card “Últimas alertas”; km/fecha otra vez en Andon; “Última alerta” en actividad; “Última visita” si no hay borrador; copy `Puede registrar una nueva visita…` si ya hay CTA; `.btn` junto a `Button`.

## Pattern

- Hub: [PAGE_PATTERNS](../design/PAGE_PATTERNS.md) **5** (ficha). Clone: Inicio `PageHeader`; Andon un panel de causa (no dos columnas).
- Visita cerrada: patrón **6** documento. Clone: un `Card` de paso WO, no siete.
- Choferes: patrón **3**. Clone: Andon `ListFilter`.
- Catálogo: patrón **9** + `Button`/`Field`. Clone: Existencias header.

## States

- loading: `Cargando ficha de la unidad…` / `Cargando…` en el panel Andon.
- empty: unidad/visita 404 con `Button` outline Volver; Choferes empty de filtro (ya existe).
- error: `FormAlert`.
- warning: `Note warn` (inactiva, sin choferes, admin no crea visitas).
- critical: Andon vencido — un panel, no la página en rojo.
- normal: sin aviso; panel “Sin servicio vencido.” + hint de salud si viene en DTO.

## Interaction notes

- Tabs: `HubFichaNav` intacto (Resumen / Información técnica / Mantenimiento / Historial).
- Nueva visita en Resumen solo si aviso Andon + `puedeCrearVisita`. Crear visita sin vencido: tab Mantenimiento.
- Overlay: Sheet de Salud ya porta; no tocar.
- Control nuevo: chips Choferes — mismos hover/focus/disabled que Andon.

## Mobile / responsive

- Desktop 1440: hub una columna de excepción (no `hub-ops-grid` 1fr 1fr).
- 1024: igual; no reintroducir dos columnas de Andon.
- 390: hits 44px en Continuar / Nueva visita / Enterado / Volver.

## Fuera / Don’t

- `api/src`, dual-stack notify, GPS, KPI, Flota.
- Quitar o añadir tabs. Meter Andon como quinto tab.
- Duplicar Salud o actividad con el panel Andon.
- Skills de landing. Playwright. `work-orders/`.
- Wizard en borrador: sigue un Card por paso.

## Proof

Click-through desde `/` (Supervisor y un pase Admin). PNG:

- `unify_hub_resumen_vencido_d1440.png` — un panel, un naranja, sin “Última alerta”
- `unify_hub_resumen_vencido_m390.png`
- `unify_hub_mantenimiento_borrador_d1440.png` — Continuar naranja, Nueva visita outline
- `unify_visita_cerrada_documento_d1440.png`
- `unify_choferes_chips_d1440.png` — Activos / Todos
- `unify_catalogo_categorias_d1440.png` — `Button`, no `.btn`

Skill `proof-ui`. Visual QA: `ux-auditor` (otro pase).
