# Context map (directorios)

Índice de bounded contexts → rutas. Las reglas viven en los ADRs, no aquí.

| BC | Schema | API | UI |
|----|--------|-----|----|
| Kernel | `public` | `api/src/kernel`, `unidades` (incluye tipos), `choferes`, `auth` | `web/src/app/unidades` (flota agrupada por familia/tipo), `choferes` |
| Mantenimiento / Visita | `public` | `api/src/visitas` | `web/src/app/unidades/[id]/visitas` (wizard WO) |
| Inventario | `inventario` | `api/src/inventario` | `web/src/app/inventario` |
| Andon | `andon` | `api/src/andon` | `web/src/app/andon` |
| Notifications | `notifications` | `api/src/notifications` | `web/src/app/notificaciones`, `Campanita` |
| Flota | `flota` | `api/src/flota` | `web/src/app/flota` (visual ops: ADR-011) |
| Logística (ops + asignación parked) | `public` (`unidades.ops_estado`, `ambito`, `destino`, `salida_at`, `chofer_id`) | `api/src/logistica` | `/flota` (nav Logística→Flota). `/logistica` redirige. |
| Alertas (config compartida) | `alertas` | `api/src/alertas` (store); API HTTP bajo `/logistica/alertas` | Umbrales sin regreso. UI absorbida: `/configuracion/alertas`. No silo Logística. No Andon. |
| Alert Catalog (capacidad compartida) | `alert_catalog` (overlay `tipo`) | `api/src/alert-catalog`; HTTP `/configuracion/alertas` | `/configuracion/alertas`. No es un BC confirmado. No mergea Andon/inbox. |
| Salud | `salud` | `api/src/salud` | hub `web/src/app/unidades/[id]`, config en Unidades (Admin) |

Seams (puertos): `NotifyPort`, `StockAlertPort`, `AvisoInboxPort`, `AndonAbiertoPort` (Flota lee aviso Andon abierto; sin UI Andon), `HealthAlertPort` (Salud → inbox; sin WhatsApp), `FlotaSinRegresoPort` (Logística → inbox `FLOTA_SIN_REGRESO`; sin `andon.*`), `UnidadChoferAssignmentPort` (Logística escribe Kernel `unidad.choferId`; sin schema propio), `AlertTypeActivePort` (catálogo → emitters; sin reglas sobre schemas ajenos). IDs opacos; sin FKs/JOINs cruzadas (ADR-002).

Notify dual-stack (no unificar): `andon-notifier.factory.ts` vs `andon/notify/` — [AGENTS.md](../../AGENTS.md).
