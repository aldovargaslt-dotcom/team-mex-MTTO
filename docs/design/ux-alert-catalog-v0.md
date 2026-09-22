# UX spec — Configuración → Alertas (catálogo v0)

Companion to [SPEC-ALERT-CATALOG-v0](../specs/alert-catalog-v0.md) and [ADR-013](../adr/013-alert-catalog-ownership.md). Tokens: [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md). Must/Don’t of taller copy: [ui-alertas-copy-botones-v0](../design-system/ui-alertas-copy-botones-v0.md).

---

## Screen purpose

Ver los **tipos de alerta** que este rol puede configurar, y entrar a editar cuándo avisan — sin un segundo modelo en `/flota/alertas`.

## Primary user

`SUPERVISOR` | `ADMIN_DIRECTIVO` | `LOGISTICA` — desktop (Admin / Flota density). Supervisor also on ~390 for the MTTO list + dialog (hits 44px).

## Questions the screen must answer

1. ¿Qué estoy viendo? — Catálogo de **Alertas** (tipos) bajo **Configuración**, no el tablero Andon (**Alerta** en nav) ni la campanita.
2. ¿Hay algo mal? — Tipo inactivo (solo Admin, muted **Inactiva**); error de carga. No pintar verde **Activa** en cada fila.
3. ¿Debo actuar? — Admin: **Nueva alerta**. El resto: la fila abre el editor.
4. ¿Cuál es el estado ahora? — Nombre de producto; área Mantenimiento o Flota (P2 muted).
5. ¿Qué apoyo hay? — Subnav Configuración → Alertas; lede: tipos que configuras aquí / lo que llega a la campanita.

## Primary action

Admin: **Nueva alerta** (`Button` `default`). Supervisor / Logística: **las filas son la acción** (cero naranja).

## Secondary actions

- **Desactivar** / **Reactivar** (solo Admin): `dangerSoft` / `outline` en el diálogo del tipo, nunca el CTA de la vista.
- **Guardar** en el diálogo del tipo: `outline` (tertiary) si ya hay un naranja de alta; si no hay alta en la vista, **Guardar** puede ser el único `default`.
- **Cancelar**: `secondary`.
- Sin “Detalle”. Sin “Configurar alertas” naranja.

## Information hierarchy

P0: H1 **Alertas** (navy 20/600) + tabla de tipos visibles para el rol.  
P1: fila (nombre de producto) → diálogo de edición. Admin: **Nueva alerta**.  
P2: área (Mantenimiento | Flota) y dueño, muted 12px.  
P3: código estable (`MTTO_VENCIDO`, …) muted 12px `font-mono` **solo Admin** (y en el diálogo). **Inactiva** muted solo Admin cuando aplica.

Qué se calla: columna “dónde se edita” / “En el módulo” / “En este catálogo”; badge verde **Activa** en cada fila; códigos en el scan path de Supervisor/Logística; `notifications`, `min_qty`, `t_km`, `t_días`, umbral, “regla”, dual-stack, WhatsApp, JSON de envelope.

## Pattern

[PAGE_PATTERNS.md](PAGE_PATTERNS.md) **3** (listado denso) + **7** (diálogo corto para alta y para avisos). Ubicación: chrome `.subnav` ya existente (como Inventario/Flota) con **Configuración** muted + **Alertas** activo. No es un quinto patrón. No es sidebar de settings SaaS.

No patrón 1 (home). No dashboard de KPIs. v0: una sola página bajo Configuración; el ítem de nav **Configuración** entra directo aquí. Top-nav **Alerta** sigue siendo el tablero Andon.

## States

- loading: `Cargando alertas…`
- empty (filtros de rol, catálogo semilla siempre tiene filas): no aplica en seed v0. Si Admin desactivó todo lo visible para un no-admin: **No hay alertas para este rol.** / *Las alertas de otras áreas las ve administración. Las inactivas no se listan aquí.*
- error: `FormAlert` con el mensaje de API.
- normal: `DataTable` (card de sección).
- warning: tipo inactivo — badge `muted` **Inactiva** (solo Admin). Sin badge cuando está activa.
- critical: no rediseñar la página; errores de validación en el diálogo.

Copy de alta (Admin): título **Nueva alerta**. Campos: Código, Nombre, Área (Mantenimiento / Flota), Dueño, Se ajusta en (Unidades o existencias / Esta lista), Activa (default sí). Footer: **Cancelar** `secondary` + **Guardar** `outline` (Nueva alerta ya es el naranja de la vista).

## Interaction notes

- Fila clickeable abre diálogo del tipo (cuándo avisa; si Admin, desactivar).
- URL: `/configuracion/alertas`. `?code=FLOTA_SIN_REGRESO` abre el diálogo de ese tipo (redirect desde `/flota/alertas`).
- Lista no se edita inline.
- No-admin no ve controles de alta ni desactivar.
- Logística no ve filas MTTO; Supervisor no ve filas Flota.
- Inventario: el diálogo `STOCK_BAJO` edita “Avisar si quedan” por ítem **y** Existencias sigue pudiendo hacerlo (dual editor).
- Andon: km / días por tipo de unidad — copy *Kilómetros* / *Días sin visita*, resumen *Avisa a los N km o a los N días*.
- Salud: *Avisar bajo* / *Recuperar desde* (enteros 0–100) + interruptor de aviso. Pesos de dimensiones se quedan en Unidades → Configuración de salud (Admin).
- Sin regreso: *Local (horas)* / *Foránea (horas)* — mismo contrato que el form absorbido.
- Inbox `/notificaciones`: H1 **Alertas**. Campanita `aria-label` **Alertas**. Ruta interna sin cambio.

## Mobile / responsive

- Desktop 1440: tabla + header acciones. Contenido 1040.
- 1024: tabla apretada; código puede ocultarse visualmente si aprieta (sigue en el diálogo).
- 390: H1 + lista; hits 44px; diálogo full-width `max-w-lg`; Continuar/Guardar visible.

## Fuera / Don’t

- No Playwright. No `api` lint `--fix`.
- No unificar fábricas WhatsApp. No mergear schemas.
- No mezclar con tablero viaje ni UX operacional A–E.
- No icono Lucide por fila. No card alrededor del H1. No ghost fuera del shell.
- Nav Andon sigue **Alerta** (tablero de avisos). No renombrar el wizard WO.

## Proof

PNG en `docs/screenshots/alert-catalog/` (`d1440`; `m390` si se toca shell/dialog Supervisor):

| Archivo | Rol / estado |
|---------|----------------|
| `alert_catalog_supervisor_lista_d1440.png` | Supervisor — solo familia Mantenimiento |
| `alert_catalog_logistica_lista_d1440.png` | Logística — solo Flota |
| `alert_catalog_admin_lista_d1440.png` | Admin — catálogo completo + **Nueva alerta** |
| `alert_catalog_admin_alta_d1440.png` | Admin — diálogo alta |
| `alert_catalog_umbral_andon_d1440.png` | Supervisor o Admin — editor mantenimiento vencido |
| `alert_catalog_umbral_sin_regreso_d1440.png` | Logística — horas local/foránea |
| `alert_catalog_inbox_alertas_d1440.png` | Inbox/campanita rotulados Alertas |
| `alert_catalog_flota_redirect_d1440.png` | Tras `/flota/alertas` → esta pantalla (Flota type) |
