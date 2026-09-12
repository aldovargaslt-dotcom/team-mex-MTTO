# Context map (directorios)

Índice de bounded contexts → rutas. Las reglas viven en los ADRs, no aquí.

| BC | Schema | API | UI |
|----|--------|-----|----|
| Kernel | `public` | `api/src/kernel`, `unidades`, `tipos-vehiculo`, `choferes`, `auth` | `web/src/app/unidades`, `choferes`; Configuración tipos en `unidades/configuracion` |
| Mantenimiento / Visita | `public` | `api/src/visitas` | `web/src/app/unidades/[id]/visitas` (wizard WO) |
| Inventario | `inventario` | `api/src/inventario` | `web/src/app/inventario` |
| Andon | `andon` | `api/src/andon` | `web/src/app/andon` |
| Notifications | `notifications` | `api/src/notifications` | `web/src/app/notificaciones`, `Campanita` |

Seams (puertos): `NotifyPort`, `StockAlertPort`, `AvisoInboxPort`. IDs opacos; sin FKs/JOINs cruzadas (ADR-002).

Notify dual-stack (no unificar): `andon-notifier.factory.ts` vs `andon/notify/` — [AGENTS.md](../../AGENTS.md).
