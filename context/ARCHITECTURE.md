# Architecture Baseline

Architecture **as it exists** in this repository. Not a target architecture. Authoritative decisions live in [`docs/adr/`](../docs/adr/) (index: [README](../docs/adr/README.md)). Directory map of modules: [docs/adr/context-map.md](../docs/adr/context-map.md).

Legend:

- **Evidence** — visible in code or accepted ADRs.
- **Inference** — reading of those artifacts.
- **Unknown** — not established.

Do **not** use `docs/decisions/`. That path is not part of this repository’s SoT.

## System Shape

**Evidence:** a **modular monolith**.

- API: NestJS + TypeORM + PostgreSQL (`api/`). No SQLite. No Prisma.
- UI: Next.js App Router (`web/`), thin client, shadcn/ui + Tailwind (ADR-003).
- One git repo; no root `package.json`.
- Integration between modules: same-process handlers + outbox envelope (`VisitaCerrada`, ADR-001/002), not cross-schema SQL.

**Inference:** deployable as two processes (API + web) sharing one Postgres.

## Major Components

| Component | Path (evidence) | Role |
|-----------|-----------------|------|
| Kernel | `api/src/kernel`, `unidades`, `choferes`, `auth` | Unidades, tipos, choferes, roles, outbox |
| Visitas / Mantenimiento | `api/src/visitas` | Visit lifecycle, cierre, piezas lines |
| Inventario | `api/src/inventario` | Stock, SKU, apply consumos |
| Andon | `api/src/andon` | Overdue-maintenance avisos + notify ports |
| Notifications | `api/src/notifications` | Inbox / campanita |
| Flota | `api/src/flota` | Yard bitácora |
| Logística | `api/src/logistica` | Ops estado mutations; parked assignment port |
| Alertas | `api/src/alertas` | Shared threshold store (sin regreso) |
| Alert Catalog | `api/src/alert-catalog` | Type overlay + HTTP façade (ADR-013) |
| Salud | `api/src/salud` | Health Score |
| Web app | `web/src/app/*` | Role picker, unidades, visitas wizard, inventario, andon, flota, notificaciones |
| Seed | `api/src/seed` | Idempotent demo catalog |

## Data Stores

**Evidence:** PostgreSQL 16. Schemas created at boot / `docker/init.sql`:

| Schema | Typical owner module |
|--------|----------------------|
| `public` | Kernel + visitas (and kernel columns written by Logística) |
| `inventario` | Inventario |
| `andon` | Andon |
| `notifications` | Notifications |
| `flota` | Flota |
| `salud` | Salud |
| `alertas` | Alertas config (sin-regreso hours) |
| `alert_catalog` | Alert type overlay (ADR-013; not inbox, not Andon) |

Rules: opaque IDs; **no** FKs or JOINs across those schemas (ADR-002). TypeORM `synchronize` is used in local/CI test DBs (`DB_SYNCHRONIZE`).

**Unknown:** production migration strategy beyond synchronize/boot `ensureModuleSchemas` (not fully documented as a versioned migration set).

## Integration Boundaries

**Evidence:** ports / adapters, not shared tables.

- `NotifyPort` — Andon outbound (WhatsApp path). Runtime factory: `api/src/andon/notify/` via `notify.providers.ts`. Second factory exists: `andon-notifier.factory.ts` (Twilio parked; `evolution` stub). **Do not unify.** Default env `ANDON_NOTIFY_PROVIDER=noop`.
- `StockAlertPort` — Inventario → Notifications (`StockBajo` / `StockReabastecido`).
- `AvisoInboxPort` — Andon → Notifications.
- `AndonAbiertoPort` — Flota reads open Andon aviso (no Andon UI for Logística).
- `HealthAlertPort` — Salud → inbox (`HEALTH_BELOW_THRESHOLD`); no WhatsApp.
- `FlotaSinRegresoPort` — Logística/alertas eval → inbox `FLOTA_SIN_REGRESO`; no `andon.*`.
- `UnidadChoferAssignmentPort` — Logística writes kernel `unidad.choferId` (parked UI).
- `AlertTypeActivePort` — catalog `active` check before new inbox emit.

Outbox: `VisitaCerrada` written in the same transaction as visit close (ADR-001).

## Runtime / Deployment

**Evidence:**

- Local human: `docker compose` Postgres; `api` `:3001` (Swagger `/docs`); `web` `:3000` proxy `/backend`.
- Cloud Agents: native Postgres via `.cursor/environment.json` / `install.sh` / `wait-for-db.sh`. Do not invent a third DB path.
- Production docs in README: Railway (API + optional UI) + Vercel (UI Root Directory `web`).
- Auth: stub headers. Not SSO.

## Important Existing Patterns

- **Schema-per-module** and ports as seams (ADR-002).
- **TDD bar** with stable test IDs C/O/I/A/N/S/F/H (ADR-004); characterization for pre-existing code.
- **UI engineering system** in `docs/design/` (spec UX → `ui-implementer` → `proof-ui` screenshots → `ux-auditor`). Not Playwright.
- **Cortes / briefs** in `docs/design-system/` + PR template: historical engineering slices. New execution artifacts are **Engineering Work Orders** (`EWO-xxx`), not a `work-orders/` folder and not the visit **WO**.
- **Visual-only** cuts do not change `api/src`.

## Critical Constraints

- Do not expand Inventario or Andon ownership without ADR.
- Do not write `andon.*` from Salud, Flota, or Inventario.
- Do not treat kernel `ops_estado` as derived from `flota` SALIDA/ENTRADA in the current accepted cut (ADR-011).
- Mantenimiento UI `/unidades` is not the Logística desk; nav Logística → `/flota` only.
- Assign-chofer UI parked.
- Fuera de v0 list in [PRODUCT.md](PRODUCT.md).

## Known Architectural Risks / Debt

| Item | Kind | Notes |
|------|------|--------|
| Andon notify dual-stack | Evidence | Two factories; checklist still says Evolution unimplemented; HTTP Evolution is wired under `andon/notify/`. Lab/ToS. Default noop. |
| ADR number collision | Evidence | `architecture/ADR-009` = docs ADR-011; `architecture/ADR-010` = docs ADR-012; docs ADR-009 = icono; docs ADR-010 = salud. |
| Two “en ruta” models | Evidence | Patio bitácora vs kernel ops estado. |
| Tablero viaje spec status | Evidence | [fleet-tablero-viaje-v0.md](../docs/specs/fleet-tablero-viaje-v0.md) **propuesto**; related ADRs accepted. |
| Stub auth | Evidence | `X-Role` only. |
| CI schema list vs `docker/init.sql` | Evidence | GitHub Actions verify snippet historically omitted `alertas` while `docker/init.sql` creates it. Not changed in this bootstrap. |
| TypeORM synchronize | Inference | Convenient for v0; may not be a durable prod migration story. |

## Authoritative ADRs

**Canonical location: `docs/adr/`.** Accepted v0 unless an ADR says superseded.

| # | File | Topic |
|---|------|--------|
| 000 | `docs/adr/000-thin-kernel.md` | Thin kernel |
| 001 | `docs/adr/001-visita-cerrada-outbox.md` | `VisitaCerrada` |
| 002 | `docs/adr/002-schema-per-module.md` | Schema per module |
| 003 | `docs/adr/003-shadcn-tailwind.md` | UI stack |
| 004 | `docs/adr/ADR-004-tdd-test-bar-andon-v0.md` | Test IDs (historical filename — do not rename) |
| 005 | `docs/adr/005-andon-no-stock-alerts.md` | Andon ≠ stock |
| 006 | `docs/adr/006-notifications-schema.md` | Inbox |
| 007 | `docs/adr/007-inventario-stock-bajo.md` | `min_qty` |
| 008 | `docs/adr/008-flota-schema.md` | Flota + LOGISTICA + parked assignment port |
| 009 | `docs/adr/009-icono-tipo-vehiculo.md` | Tipo icono |
| 010 | `docs/adr/010-salud-unidad.md` | Salud |
| 011 | `docs/adr/011-logistica-flota-ops-estado.md` | Ops estado; canonical Aldo text in `architecture/ADR-009-…` |
| 012 | `docs/adr/012-flota-sin-regreso-alertas.md` | Sin regreso; canonical Aldo text in `architecture/ADR-010-…` |

New ADRs: add the next number under `docs/adr/` using [ADR-TEMPLATE.md](../docs/adr/ADR-TEMPLATE.md). Do not rewrite accepted ADR bodies to fit new code.

## What this file is not

- Not a proposal to split services.
- Not a proposal to unify notify.
- Not a classification of every folder as a confirmed DDD Bounded Context (see [domain/README.md](../domain/README.md)).
