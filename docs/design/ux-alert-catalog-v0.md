# UX spec — Configuración → Alertas (catálogo v0)

Companion to [SPEC-ALERT-CATALOG-v0](../specs/alert-catalog-v0.md) and [ADR-013](../adr/013-alert-catalog-ownership.md). Experience: [configuracion-alertas-v0](../experience/configuracion-alertas-v0.md). Tokens: [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md). Must/Don’t of taller copy: [ui-alertas-copy-botones-v0](../design-system/ui-alertas-copy-botones-v0.md).

**Hierarchy redesign v0.1:** PROPOSAL (Option B — 2026-09-22) — awaiting SD Accepted with Experience Context before UI EWO.

---

## Screen purpose

Ver los **tipos de alerta** que este rol puede configurar, ver de un vistazo **cuándo avisa** cada uno, y entrar a editar — sin un segundo modelo en `/flota/alertas`.

## Primary user

`SUPERVISOR` | `ADMIN_DIRECTIVO` | `LOGISTICA` — desktop (Admin / Flota density). Supervisor also on ~390 for the MTTO list + dialog (hits 44px).

## Questions the screen must answer

1. ¿Qué estoy viendo? — Catálogo de **Alertas** (tipos) bajo **Configuración**, no el tablero Andon (**Alerta** en nav) ni la campanita.
2. ¿Hay algo mal? — Tipo inactivo (solo Admin, muted **Inactiva**); error de carga. No pintar verde **Activa** en cada fila. Umbrales “raros” se juzgan al leer **Cuándo avisa**, no hace falta abrir todo.
3. ¿Debo actuar? — Admin: **Nueva alerta**. El resto: la fila abre el editor.
4. ¿Cuál es el estado ahora? — Nombre de producto + resumen **Cuándo avisa**; grupos Mantenimiento / Flota cuando el rol ve ambas áreas.
5. ¿Qué apoyo hay? — Subnav Configuración → Alertas; lede de tarea: ajustar cuándo avisa / tocar una fila.

## Primary action

Admin: **Nueva alerta** (`Button` `default`). Supervisor / Logística: **las filas son la acción** (cero naranja).

## Secondary actions

- **Desactivar** / **Reactivar** (solo Admin): `dangerSoft` / `outline` en el diálogo del tipo, nunca el CTA de la vista.
- **Guardar** en el diálogo del tipo: `outline` (tertiary) si ya hay un naranja de alta; si no hay alta en la vista, **Guardar** puede ser el único `default`.
- **Cancelar**: `secondary`.
- Sin “Detalle”. Sin “Configurar alertas” naranja.

## Information hierarchy (v0.1 PROPOSAL)

P0: H1 **Alertas** (navy 20/600) + nombre de producto en cada fila.  
P1: columna **Cuándo avisa** (resumen en español de taller, derivado de umbrales vivos) + Admin **Nueva alerta**.  
P2: encabezados de grupo **Mantenimiento** | **Flota** (solo si el rol ve más de un área); lede de tarea.  
P3: código estable solo en diálogo Admin (muted 12px `font-mono`); etiqueta Dueño solo en diálogo Admin si hace falta. **Inactiva** muted solo Admin cuando aplica.

### List layout (Option B)

```
Configuración · Alertas

Alertas                                          [Nueva alerta]  ← Admin only
Ajusta cuándo avisa cada tipo. Lo que llega a la campanita.
Toca una fila para editar.

Mantenimiento
  Alerta                    Cuándo avisa                         ›
  Mantenimiento vencido     5 000 km o 90 días sin visita        ›
  Stock bajo                Según mínimo en existencias          ›
  Salud de unidad           Bajo 60 · recupera 65                ›

Flota
  Sin regreso               Local 8 h · Foránea 24 h             ›
```

Números del wireframe = ejemplo; en implementación salen del payload real (no inventar en docs).

Qué se calla en el listado: columna Dueño; columna “dónde se edita”; badge verde **Activa**; códigos; `notifications`, `min_qty`, `t_km`, `t_días`, umbral, “regla”, dual-stack, WhatsApp, JSON de envelope.

Si Supervisor o Logística solo ven un área: un solo grupo o sin chrome de grupo vacío (no teatro).

## Pattern

[PAGE_PATTERNS.md](PAGE_PATTERNS.md) **3** (listado denso) + secciones agrupadas cuando hay multi-área + **7** (diálogo corto para alta y para avisos). Ubicación: chrome `.subnav` ya existente (como Inventario/Flota) con **Configuración** muted + **Alertas** activo. No es un quinto patrón. No es sidebar de settings SaaS.

No patrón 1 (home). No dashboard de KPIs. v0: una sola página bajo Configuración; el ítem de nav **Configuración** entra directo aquí. Top-nav **Alerta** sigue siendo el tablero Andon.

## States

- loading: `Cargando alertas…`
- empty (filtros de rol, catálogo semilla siempre tiene filas): no aplica en seed v0. Si Admin desactivó todo lo visible para un no-admin: **No hay alertas para este rol.** / *Las alertas de otras áreas las ve administración. Las inactivas no se listan aquí.*
- error: `FormAlert` con el mensaje de API.
- normal: lista agrupada (card de sección) con filas densas.
- warning: tipo inactivo — badge `muted` **Inactiva** (solo Admin). Sin badge cuando está activa.
- critical: no rediseñar la página; errores de validación en el diálogo.

Copy de alta (Admin): título **Nueva alerta**. Campos: Código, Nombre, Área (Mantenimiento / Flota), Dueño, Se ajusta en (Unidades o existencias / Esta lista), Activa (default sí). Footer: **Cancelar** `secondary` + **Guardar** `outline` (Nueva alerta ya es el naranja de la vista).

Lede sugerido (tarea, no catálogo técnico):

- Admin: `Ajusta cuándo avisa cada tipo. Lo que llega a la campanita. Alta y baja solo en esta lista.`
- Supervisor: `Ajusta cuándo avisa cada tipo. Lo que llega a la campanita: mantenimiento, existencias y salud.`
- Logística: `Ajusta cuándo avisa cada tipo. Lo que llega a la campanita: unidad sin regreso.`

## Interaction notes

- Fila clickeable abre diálogo del tipo (cuándo avisa; si Admin, desactivar). Affordance: cursor pointer + `›` o hint en lede (“Toca una fila…”). Sin icono Lucide decorativo por fila.
- Tras Guardar, el resumen **Cuándo avisa** de esa fila debe refrescarse.
- URL: `/configuracion/alertas`. `?code=FLOTA_SIN_REGRESO` abre el diálogo de ese tipo (redirect desde `/flota/alertas`).
- Lista no se edita inline.
- No-admin no ve controles de alta ni desactivar.
- Logística no ve filas MTTO; Supervisor no ve filas Flota.
- Inventario: el diálogo `STOCK_BAJO` edita “Avisar si quedan” por ítem **y** Existencias sigue pudiendo hacerlo (dual editor). Resumen de lista puede ser `Según mínimo en existencias` si es multi-ítem.
- Andon: km / días por tipo de unidad — copy *Kilómetros* / *Días sin visita*; resumen de lista en lenguaje de taller.
- Salud: *Avisar bajo* / *Recuperar desde* (enteros 0–100) + interruptor de aviso.
- Sin regreso: *Local (horas)* / *Foránea (horas)*.
- Inbox `/notificaciones`: H1 **Alertas**. Campanita `aria-label` **Alertas**. Ruta interna sin cambio.

## Mobile / responsive

- Desktop 1440: grupos + filas + header acciones. Contenido 1040.
- 1024: filas apretadas; resumen **Cuándo avisa** puede ir a segunda línea bajo el nombre si aprieta.
- 390: H1 + lista; hits 44px; diálogo full-width `max-w-lg`; Continuar/Guardar visible.

## Fuera / Don’t

- No Playwright. No `api` lint `--fix`.
- No unificar fábricas WhatsApp. No mergear schemas.
- No mezclar con tablero viaje ni UX operacional A–E.
- No icono Lucide por fila. No card-grid por tipo. No card alrededor del H1. No ghost fuera del shell.
- No KPI strip / dashboard de monitoreo en esta pantalla.
- No sidebar de settings SaaS.
- Nav Andon sigue **Alerta** (tablero de avisos). No renombrar el wizard WO.
- No inventar números de umbral en docs; leerlos del API en implementación.

## Proof (post-EWO)

PNG en `docs/screenshots/alert-catalog/` (`d1440`; `m390` si se toca shell/dialog Supervisor):

| Archivo | Rol / estado |
|---------|----------------|
| `alert_catalog_supervisor_lista_d1440.png` | Supervisor — familia Mantenimiento (grupo único o sin chrome vacío) |
| `alert_catalog_logistica_lista_d1440.png` | Logística — solo Flota |
| `alert_catalog_admin_lista_d1440.png` | Admin — grupos Mantenimiento + Flota + **Nueva alerta** + columna Cuándo avisa |
| `alert_catalog_admin_alta_d1440.png` | Admin — diálogo alta |
| `alert_catalog_umbral_andon_d1440.png` | Supervisor o Admin — editor mantenimiento vencido |
| `alert_catalog_umbral_sin_regreso_d1440.png` | Logística — horas local/foránea |
| `alert_catalog_inbox_alertas_d1440.png` | Inbox/campanita rotulados Alertas |
| `alert_catalog_flota_redirect_d1440.png` | Tras `/flota/alertas` → esta pantalla (Flota type) |
