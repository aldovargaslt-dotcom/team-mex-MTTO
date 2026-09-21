# SPEC-ALERT-CATALOG-v0 — Catálogo central de Alertas

## Status

**Approved** — 2026-09-21

Approved with open-question defaults accepted:
1. Inventario `min_qty` remains editable on Inventario screens **and** via catalog entry (`MODULE` dual editor).
2. ADR-013 (catalog persistence / ownership) only if spike shows more than a UI façade; otherwise façade is enough for first EWOs.

Does not replace ADRs. UI hierarchy detail: companion UX spec under `docs/design/` when layout is cut. Implementation requires an approved ADR if a new catalog schema / ownership boundary is introduced (see Related ADRs).

## Problem

Operators and agents collide on three product names (Andon / Alertas / Notifications) for “things that notify.” Configuration is scattered (Andon thresholds, `/flota/alertas` sin-regreso, Inventario `min_qty`, Salud threshold). There is no single admin-facing place to see alert **types**, who owns them, and who may edit them—while emission rules must stay with the correct domain modules.

## Context

Shaping decisions (2026-09-21), Engineering System V1:

- Product language: **Alertas** (config UI + inbox). Implementation names Andon / schema `alertas` / `notifications` remain internal.
- Model **B**: shared **catalog of types** + **module emitters** own evaluation rules; do **not** merge `andon`, `alertas`, `notifications` schemas.
- Subdomains: Mantenimiento (Visita, Inventario, Andon, Salud) vs Flota (Bitácora, Logística ops, sin-regreso) + Shared (Kernel, inbox).
- WhatsApp / Andon dual-stack notify: **out of scope** for this cut.
- `/flota/alertas` UX is **absorbed** under **Configuración → Alertas**.

Evidence baseline: `context/PRODUCT.md`, `context/GLOSSARY.md`, ADR-005/006/007/010/012, `domain/*/CONTEXT.md`.

## Goals

- One product surface **Configuración → Alertas** listing alert **types** with family (MTTO | Flota), owning module, active flag, and threshold-edit entry points filtered by role.
- Preserve emitter ownership: Andon ≠ stock ≠ salud ≠ sin-regreso (glossary / ADR-005).
- Inbox (campanita) remains the shared **delivery** projection (`notifications`); product may label it Alertas.
- Enforce permission swimlane (see Business Rules).
- Define **mixed** threshold placement per type (module vs catalog-managed values).

## Non-goals

- Unifying or “fixing” Andon WhatsApp dual-stack / Evolution providers.
- Merging PostgreSQL schemas `andon` ∪ `alertas` ∪ `notifications` ∪ `salud` ∪ `inventario`.
- Costeo, multi-almacén, OC formal, GPS/TMS.
- Declaring new DDD Bounded Contexts as confirmed (catalog is a **shared capability**; escalate if BC redraw is required).
- Redesigning visit WO wizard or Flota bitácora SALIDA/ENTRADA rules.
- Per-user notification preferences beyond role swimlane in this cut.
- Creating numbered EWOs as part of this SPEC document (EWOs follow SPEC approval).

## Actors

| Actor | Alert catalog / thresholds |
|-------|---------------------------|
| `ADMIN_DIRECTIVO` | Create / deactivate alert **types**; override edit all families; full catalog list |
| `SUPERVISOR` | Edit thresholds/rules only for MTTO family: Andon, Inventario (stock), Salud |
| `LOGISTICA` | Edit thresholds/rules only for Flota family (sin-regreso); no MTTO types |
| Others | No catalog configuration (inbox read per existing module rules) |

Stub auth remains `X-Role` (or successor); missing role → 401 as today.

## Functional Behavior

### Catalog (Configuración → Alertas)

1. Authenticated user opens **Configuración → Alertas**.
2. System lists **alert types** the user may see:
   - `ADMIN_DIRECTIVO`: all types.
   - `SUPERVISOR`: MTTO family only.
   - `LOGISTICA`: Flota family only.
3. Each row shows at least: stable `code`, product label (“Alerta”), family, owning module, `active`, threshold mode, link/panel to edit thresholds when allowed.
4. `ADMIN_DIRECTIVO` may **create** a type (code, label, family, owning module, threshold mode, active) and **deactivate** a type (soft: stops new emissions / hides from non-admin lists; does not delete historical inbox rows).
5. Non-admin roles **cannot** create or deactivate types.
6. Legacy route `/flota/alertas` redirects or is removed in favor of Configuración → Alertas (Flota type detail). No second competing config IA.

### Threshold editing (mixed)

7. User with permission opens threshold UI for a type.
8. System loads/saves values according to **Threshold placement** table below (module API/port or catalog store).
9. Validation errors stay in that type’s module rules (e.g. Andon km/days > 0; sin-regreso hours > 0).

### Emission (unchanged ownership)

10. Modules continue to evaluate conditions and emit to inbox via existing ports (`StockAlertPort`, Andon flows, `HealthAlertPort`, `FlotaSinRegresoPort`, etc.).
11. Emission **must** respect type `active`. If deactivated, no new inbox items for that `code`.
12. Inbox dedupe keys and producers remain as per ADR-006 and module ADRs; this SPEC does not redefine envelopes.

### Product language

13. UI copy for config and inbox uses **Alertas** (or “Aviso” where lifecycle copy already exists for Andon states). Do not surface “Notifications schema” or require users to learn three product names.
14. Internal docs/code may keep Andon / notifications identifiers until a later rename EWO.

## Business Rules

### BR-01 — Type identity
Each alert type has a stable `code` (e.g. `MTTO_VENCIDO`, `STOCK_BAJO`, `SALUD_UMBRAL`, `FLOTA_SIN_REGRESO`). Codes are unique and immutable after create.

### BR-02 — Family
`family ∈ { MTTO, FLOTA }`. Family drives default permission swimlane.

### BR-03 — Permission swimlane
- `SUPERVISOR` → threshold edit iff `family = MTTO`.
- `LOGISTICA` → threshold edit iff `family = FLOTA`.
- `ADMIN_DIRECTIVO` → create/deactivate types + threshold edit all families.
- Unauthorized edit → 403 (API) / hidden controls (UI).

### BR-04 — Emitters remain module-owned
Evaluating “should we alert?” stays in Andon / Inventario / Salud / Flota-Alertas modules. The catalog does not run a generic rules engine over foreign schemas in this cut.

### BR-05 — Threshold placement (mixed)

| `code` (v0 seed) | Family | Owning module | Threshold mode | Where values live |
|------------------|--------|---------------|----------------|-------------------|
| `MTTO_VENCIDO` | MTTO | Andon | `MODULE` | Andon thresholds (km/días) |
| `STOCK_BAJO` | MTTO | Inventario | `MODULE` | Per-ítem `min_qty` (ADR-007) |
| `SALUD_UMBRAL` | MTTO | Salud | `MODULE` | Salud config threshold (ADR-010) |
| `FLOTA_SIN_REGRESO` | FLOTA | Alertas/Flota | `CATALOG` | Values edited only via Configuración → Alertas; persistence may remain schema `alertas` behind a port until ADR says otherwise |

`MODULE`: catalog stores metadata only; edit UI calls owning module.  
`CATALOG`: catalog UX is SoT for those scalar thresholds; module reads via port/API owned by Flota/Alertas.

**Inventario dual editor (Approved default):** `min_qty` may be edited on Inventario screens **and** via the catalog entry for `STOCK_BAJO`. Catalog is not the sole editor for `MODULE` Inventario thresholds.

Additional types require `ADMIN_DIRECTIVO` create + this table extended in a SPEC revision or ADR.

### BR-06 — Inbox is delivery, not config
Campanita / `notifications` does not own thresholds. Deactivated type ⇒ no new rows; existing rows remain readable per inbox rules.

### BR-07 — No WhatsApp in this cut
Catalog does not add, remove, or configure WhatsApp channels. Andon `NotifyPort` behavior unchanged.

### BR-08 — WO ≠ EWO ≠ Alerta
Visit wizard remains **WO**. Engineering work remains **EWO-xxx**. Alert types never use `WO-` prefix.

## Domain Implications

- **Shared capability**: Alert Catalog (metadata + permission façade). Provisional card: prefer `domain/shared` or a future `domain/alert-catalog` routing card—**do not** claim a new confirmed BC without escalation.
- **MTTO family** touches provisional areas: `mantenimiento` / `andon`, `inventario`, `salud`.
- **FLOTA family** touches `alertas`, `flota`, `logistica`.
- **Notifications** stays thin inbox.
- Seams: read-only catalog metadata for UI; writes to thresholds via owning module or catalog-backed port for `CATALOG` mode types.

## State Transitions

### Alert type

```text
(none) --ADMIN create--> ACTIVE
ACTIVE --ADMIN deactivate--> INACTIVE
INACTIVE --ADMIN reactivate--> ACTIVE
```

Inactive: hidden from non-admin lists; no new emissions.

### Inbox item
Unchanged from ADR-006 / module producers (read/unread, etc.).

### Andon aviso lifecycle
Unchanged (`ABIERTO` / `ENTERADO` / `RESUELTO`).

## Constraints

### Architecture

- Schema-per-module; opaque IDs; no cross-schema FKs/JOINs (ADR-002).
- New catalog persistence (if not purely façade over existing tables) **requires ADR** before EWO.
- Ports remain the cross-area seam.

### Compatibility

- Existing producers and dedupe keys keep working.
- Seed must register the four v0 types in BR-05.
- `/flota/alertas` must not remain a parallel config after cut (redirect or remove).

### Security

- Enforce BR-03 on API and UI.
- Do not leak MTTO threshold payloads to `LOGISTICA` or Flota payloads to `SUPERVISOR` via catalog APIs.

### Performance

- Catalog list is small (dozens of types max in v0); no special paging required.

### UX / Operational

- Spanish product copy; Team Mex tokens (ADR-003).
- Supervisor mobile-friendly threshold edit for MTTO types where already expected.
- Proof UI screenshots for Configuración → Alertas per role (ADR-004 / proof-ui skills)—no Playwright mandate.

## Failure Behavior

- Unauthorized catalog mutation → 403.
- Unknown `code` → 404.
- Invalid threshold payload → 400 with module validation message.
- Emitter failure when writing inbox → existing module failure behavior; catalog does not swallow emitter errors.
- If catalog store unavailable for `CATALOG` mode read → fail closed (do not emit sin-regreso with silent default) **or** documented last-known module fallback—pick one in ADR; default **fail closed** for new writes/evaluations.

## Edge Cases

- Admin deactivates `STOCK_BAJO` while `min_qty` remains on ítems: no new stock inbox events until reactivated; ítem fields may remain editable in Inventario UI (out of catalog) unless a later SPEC says otherwise—**this cut**: Inventario UI may still edit `min_qty`; deactivated type only suppresses inbox emission.
- Role header missing → 401.
- User switches role (stub) → list and actions re-filter immediately.
- Historical inbox rows for deactivated types remain visible per inbox ACL.
- Concurrent admin deactivate + emitter race: emission must re-check `active` at emit time.

## Acceptance Criteria

### AC-01 — Catalog list by role
**Given** types seeded per BR-05  
**When** `SUPERVISOR` opens Configuración → Alertas  
**Then** only MTTO family types are listed and Flota types are absent.

### AC-02 — Logística list
**Given** same seed  
**When** `LOGISTICA` opens Configuración → Alertas  
**Then** only Flota family types are listed.

### AC-03 — Admin full list + create/deactivate
**Given** `ADMIN_DIRECTIVO`  
**When** they create type `X` and deactivate `MTTO_VENCIDO`  
**Then** `X` appears for the correct family viewers and `MTTO_VENCIDO` produces no **new** inbox items.

### AC-04 — Supervisor cannot create types
**Given** `SUPERVISOR`  
**When** they attempt type create/deactivate via API  
**Then** response is 403.

### AC-05 — Supervisor edits Andon thresholds
**Given** `SUPERVISOR` and `MTTO_VENCIDO` active  
**When** they change Andon km/días via catalog entry point  
**Then** values persist in Andon module store and subsequent overdue evaluation uses them.

### AC-06 — Logística edits sin-regreso via catalog
**Given** `LOGISTICA`  
**When** they edit `FLOTA_SIN_REGRESO` hours under Configuración → Alertas  
**Then** values persist per BR-05 `CATALOG` mode and `/flota/alertas` is not required.

### AC-07 — Supervisor forbidden on Flota thresholds
**Given** `SUPERVISOR`  
**When** they attempt to mutate `FLOTA_SIN_REGRESO`  
**Then** 403 / no UI control.

### AC-08 — Logística forbidden on MTTO thresholds
**Given** `LOGISTICA`  
**When** they attempt to mutate Andon / `min_qty` catalog entry / Salud threshold via catalog API  
**Then** 403.

### AC-09 — Product language
**Given** any of the three roles on config or inbox shell  
**When** UI is shown  
**Then** primary labels use Alertas (not a three-way Andon/Alertas/Notifications product split).

### AC-10 — Legacy Flota path
**Given** previous `/flota/alertas` URL  
**When** user navigates there  
**Then** they reach Configuración → Alertas (Flota type) without a second config model.

### AC-11 — WhatsApp untouched
**Given** this cut deployed  
**When** Andon notify provider config is inspected  
**Then** dual-stack / WA behavior is unchanged from pre-cut ADRs/AGENTS rules.

### AC-12 — Schema non-merge
**Given** implementation of this SPEC  
**When** DB schemas are reviewed  
**Then** `andon`, `notifications`, and Flota sin-regreso persistence are not collapsed into one schema solely to satisfy UI unity.

## Dependencies

- ADR for catalog persistence / ownership **if** new tables or ownership shift beyond façade (gate before EWO that needs persistence)—spike decides; not a blocker to Approve this SPEC.
- UX spec (`docs/design/`) for Configuración → Alertas layout when UI cut starts.
- Existing ADR-005, 006, 007, 010, 012 behavior remaining authoritative for emitters.
- Glossary update: product term Alertas vs internal Andon/notifications.
- Optional ICM / `domain/shared` card pointer update.

## Related ADRs

- `docs/adr/005-andon-no-stock-alerts.md`
- `docs/adr/006-notifications-schema.md`
- `docs/adr/007-inventario-stock-bajo.md`
- `docs/adr/010-salud-unidad.md`
- `docs/adr/012-flota-sin-regreso-alertas.md`
- `docs/adr/002-schema-per-module.md`
- `docs/adr/003-shadcn-tailwind.md`
- **TBD** — ADR-013 (proposed name) Alert Catalog shared metadata / ownership — only if spike shows more than UI façade

## Open Questions

**None.** Closed on Approve (2026-09-21):

1. Inventario `min_qty` dual editor: **yes** — Inventario screens and catalog entry.
2. ADR-013: **deferred to spike** — required only if not pure UI façade.
