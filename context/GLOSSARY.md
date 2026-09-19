# Ubiquitous Language / Glossary

Terms found in code, UI, database, tests, or documentation. **Do not invent business terms.** If a word means different things, that is called out.

**WO** is reserved for the Supervisor visit wizard (Orden de Trabajo / work-order UI). Engineering execution artifacts are **Engineering Work Order** with IDs `EWO-xxx`. Never call those `WO`.

| Term | Meaning | Area | Notes / Non-meaning |
|---|---|---|---|
| Team Mex / MTTO | This product: mantenimiento + inventario + andon + flota + salud | Product | Repo `team-mex-MTTO` |
| Unidad | Fleet unit (vehicle). Identity includes número interno (`nombre`) and `placas` | Kernel | Not a TMS “vehicle on a map” |
| Número interno | Display name of the unit (e.g. `FOTON`) | Kernel / UI | Upsert key for seed is **placas**, not this name |
| Placas | License plate; catalog upsert key | Kernel | |
| Tipo / TipoVehiculo | Operational family: `STOCK`, `RUTAS`, `CAMIONES 3 Y MEDIA` | Kernel | Not a manufacturer model. Optional `icono` (ADR-009) |
| Chofer | Driver catalog person | Kernel | Not an app login role. Estado `ACTIVO` / `INACTIVO` |
| `motivoInactivacion` | Why a unit is `INACTIVA`; `ENVIO_ESPECIAL` or null | Kernel | Envío especial is a **motivo**, not a third `EstadoUnidad` |
| Envío especial | Reason a unit is inactive for maintenance | Kernel / Flota spec | Does **not** require a patio `SALIDA` |
| `SUPERVISOR` | Role: visit wizard, Andon Enterado, Inventario | Auth | |
| `ADMIN_DIRECTIVO` | Role: catalog write, Flota, Salud config, read historial | Auth | UI often “Administrador” |
| `LOGISTICA` | Role: Flota desk + ops; not wizard / inventario / andon UI | Auth | Nav → `/flota` only |
| Visita | Maintenance visit aggregate | Mantenimiento | States include borrador vs `CERRADO` |
| **WO** | Visit **wizard** UI (Supervisor): Datos → Trabajos → Obs → Fotos → Piezas → Firmas → Confirmar | Mantenimiento / UI | CSS `wo-wizard`. **Not** an Engineering Work Order. Spanish product sense: orden de trabajo de visita |
| Trabajos A–E | Catalog work types required to close a visit (≥1) | Mantenimiento | UX “operacional” cortes A–E are a **different** program (copy/existencias); do not fuse with Flota tablero |
| Piezas | Consumption lines on the visit (`visita_piezas`) | Mantenimiento | `itemId` opaque; no stock fields on the visit DTO |
| `DESDE_STOCK` | Consume from inventario stock (`SALIDA_OT` if qty available) | Mantenimiento × Inventario | Insufficient stock → 400, visit stays `BORRADOR` |
| `COMPRA_EXTERNA` | External buy; pendiente de comprobante; no stock movement | Mantenimiento × Inventario | |
| `VisitaCerrada` | Frozen outbox envelope on successful close | Kernel / Mantenimiento | ADR-001 |
| Inventario | Parts catalog + stock + movements | Inventario | Schema `inventario` |
| Familia / Ítem / SKU / Proveedor | Inventory catalog concepts | Inventario | |
| `min_qty` | Opt-in low-stock threshold (`null` = no alert) | Inventario | Brief alias `stock_min` is **not** persisted |
| Bajo / Agotado | Stock badges: `qty <= min_qty` and `qty = 0` | Inventario / UI | Not Andon |
| `StockBajo` / `StockReabastecido` | Inbox events from Inventario via `StockAlertPort` | Inventario → Notifications | Must not write `andon.*` |
| Andon | Overdue **maintenance** notice (km/days since last closed visit) | Andon | Schema `andon`. **Not** stock alerts (ADR-005). **Not** salud threshold. **Not** flota sin regreso |
| Aviso (`ABIERTO` / `ENTERADO` / `RESUELTO`) | Andon notice lifecycle | Andon | Enterado is in-app; does not resolve. Resolve via `VisitaCerrada` |
| `NotifyPort` | Outbound Andon notify seam | Andon | Default provider `noop` |
| Dual-stack notify | Two factories: `andon-notifier.factory.ts` vs `andon/notify/` | Andon | Known conflict; do not unify |
| Campanita | Shell bell → `/notificaciones` inbox | Notifications | |
| Inbox / `inbox_item` | Notification row with `dedupe_key` | Notifications | Schema `notifications` |
| Flota | Yard bitácora: sitios, `SALIDA`/`ENTRADA`, firmas, `unidad_operativa` | Flota | Schema `flota`. Not GPS |
| Sitio | Named place for a movement (patio, cliente, taller) | Flota | |
| `SALIDA` / `ENTRADA` | Yard movement pair | Flota | Open salida = “en ruta” **in the bitácora sense** |
| Firma `CHOFER` / `AVAL` | Required on patio movement alta | Flota | Distinct from visit firmas chofer/jefe |
| `ops_estado` | Kernel field `EN_RUTA` \| `DISPONIBLE` | Logística / Kernel | **Not** derived from Flota SALIDA/ENTRADA in ADR-011 |
| `ambito` | `FORANEO` \| `LOCAL` | Logística / Kernel | |
| `destino` | Free-text current destination | Logística / Kernel | |
| `salida_at` | Timestamp for sin-regreso evaluation | Logística / Kernel | ADR-012 |
| Registrar regreso | `EN_RUTA` → `DISPONIBLE` | Logística | `POST /logistica/regresos/:unidadId` |
| Asignación chofer↔unidad | Kernel `unidades.chofer_id` via port | Logística | **Parked** UI; HTTP may exist |
| Alertas (schema) | Shared config for sin-regreso thresholds | Alertas | Not Andon; HTTP under `/logistica/alertas`; UI `/flota/alertas` |
| Sin regreso / `FLOTA_SIN_REGRESO` | Overdue return while `ops_estado=EN_RUTA` | Alertas → Notifications | `dedupe_key=FLOTA:sin-regreso:{unidadId}` |
| Salud / Health Score | Calculated unit health (not editable) | Salud | Schema `salud`. Not `ACTIVA`/`INACTIVA`, not ops_estado |
| `HEALTH_BELOW_THRESHOLD` | Derived inbox alert from Salud | Salud → Notifications | Does not appear on Andon board; no WhatsApp |
| Corte / brief | Historical engineering slice (PR + issue template + `docs/design-system/`) | Process | Not an EWO unless a human migrates it |
| **Engineering Work Order** | Approved execution artifact for non-trivial work | Process | ID `EWO-001`…. Path `docs/engineering-work-orders/`. **Never abbreviated WO** |
| Spec UX | Screen spec before non-trivial UI (`docs/design/UX_SPEC_TEMPLATE.md`) | UI process | Complements functional SPEC/ADR; does not replace them |
| Visual only | UI-only cut; must not touch `api/src` | Process | |
| Fuera de v0 | Explicit non-goals (multi-almacén, GPS, …) | Product | README / PRODUCT.md |

## Ambiguous or conflicting terminology

1. **WO** vs **Engineering Work Order** vs **corte/brief** — see rules above. Product WO stays the wizard.
2. **Andon** vs **alertas** vs **stock bajo** vs **salud** — four different sources; inbox is the shared projection.
3. **En ruta** — Flota open `SALIDA` vs kernel `ops_estado=EN_RUTA` vs (parked) assignment `ops` on chofer. Do not collapse.
4. **ADR-009 / ADR-010** — architecture folder vs `docs/adr/` numbers differ; use the docs/adr index.
5. **Logística** — role, Nest module, and nav label; desk is `/flota`, not a schema `logistica`.
6. **Trabajos A–E** (visit close) vs **UX operacional cortes A–E** (copy/existencias program) — different documents; do not merge.

## Rules

- Prefer accepted business/UI Spanish terms over new English synonyms in copy.
- New accepted terms go here or on the relevant `domain/*/CONTEXT.md` card.
- Do not rename WO in the visit UI to “EWO” or “Engineering Work Order”.
