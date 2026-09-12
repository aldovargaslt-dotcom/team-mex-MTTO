# Context map (directorios)

Índice de bounded contexts → rutas. Las reglas viven en los ADRs, no aquí.

| BC | Schema | API | UI |
|----|--------|-----|----|
| Kernel | `public` | `api/src/kernel`, `unidades` (incluye tipos), `choferes`, `auth` | `web/src/app/unidades` (flota agrupada por familia/tipo), `choferes` |
| Mantenimiento / Visita | `public` | `api/src/visitas` | `web/src/app/unidades/[id]/visitas` (wizard WO) |
| Inventario | `inventario` | `api/src/inventario` | `web/src/app/inventario` |
| Andon | `andon` | `api/src/andon` | `web/src/app/andon` |
| Notifications | `notifications` | `api/src/notifications` | `web/src/app/notificaciones`, `Campanita` |
| Flota | `flota` | `api/src/flota` | `web/src/app/flota` |

Seams (puertos): `NotifyPort`, `StockAlertPort`, `AvisoInboxPort`. Flota lee aviso Andon abierto vía `AndonService.hasNoResuelto` (sin UI Andon). IDs opacos; sin FKs/JOINs cruzadas (ADR-002).

Notify dual-stack (no unificar): `andon-notifier.factory.ts` vs `andon/notify/` — [AGENTS.md](../../AGENTS.md).
