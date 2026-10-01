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


## Approved target overlay — CHECK Slice0

No change to as-is module/schema table until implemented. [ADR016–020](README.md) target Visita/CHECK1:1, trusted identity, documentary capability, private storage/versioned migrations and scheduler. /logistica dashboard/Tower and /flota movements clarification ADR017 replaces the historical redirect/navigation note above. Proposed documentary owner/schema vehicle_documents is a capability, not a newly declared BC. SignedCheckReadPort, VehicleInsurancePolicyPort, coordinated DeparturePolicyPort are proposed seams; no cross-schema SQL. [Contract/review](../engineering-work-orders/CHK-001-slice-0-review.md).


Approved owner update2026-10-01: R01–R05 adoptadas en [Slice0 package](../engineering-work-orders/CHK-001-slice-0-review.md). Mapping facility por vehículo; MexicoCity día local; daily ACTIVA+Flota EN_PATIO/sinCHECKactivo; hard blockers aceite/refrigerante crítico/fuga severa/llanta severa-ponchadura/PSIcriticalconfig; claim/assign/invalidation en authorizedfacility; physical source Flota enum4 y divergence explícita; retorno overdue<=2hAttention/>2hCritical configurables. Sin decisiones owner pendientes ni código implementado; EWO015 Ready técnico, ejecución retenida.
