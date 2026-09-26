# Project Context Map — ICM

This file is the **context router** for Team Mex MTTO. Goal: **minimum sufficient authoritative context**, never “load the repository”.

Read this file before opening large trees. Then open only the paths listed for the current stage **and** the affected area in [domain/README.md](domain/README.md).

Global methodology (SDD, DDD, TDD, ADR, Engineering Work Orders, verification) stays global. This file is project routing only.

## Core pointers (do not load all of these every time)

| Concern | Path |
|---------|------|
| Product | `context/PRODUCT.md` |
| Architecture baseline | `context/ARCHITECTURE.md` |
| Glossary | `context/GLOSSARY.md` |
| Domain routing cards | `domain/` (provisional areas) |
| Technical context map | `docs/adr/context-map.md` |
| Specs (functional) | `docs/specs/` |
| Local workflow / artifact responsibilities | [WORKFLOW](docs/WORKFLOW.md) |
| PRD (substantial product changes only) | [PRD template](docs/prds/PRD-TEMPLATE.md) |
| Testing / skipped verification | [Testing strategy](docs/testing/TESTING_STRATEGY.md) |
| UX / visual system | `docs/design/` + corte briefs `docs/design-system/` |
| ADRs | `docs/adr/` (**only** decision SoT; no `docs/decisions/`) |
| Engineering Work Orders | `docs/engineering-work-orders/` (`EWO-xxx`) |
| Evidence | `docs/evidence/` + UI screenshots `docs/screenshots/` |
| Agent index | `AGENTS.md` |

**WO** means the visit wizard. Do not load Engineering Work Orders when the task is the wizard UI unless the EWO says so.

---

## Discovery

Load first:

- `context/PRODUCT.md`
- `context/GLOSSARY.md` if any term is in play (especially WO, Andon, alertas, en ruta)
- `domain/<area>/CONTEXT.md` for the suspected area
- current notes under `workspace/discovery/`

Load on demand:

- `README.md` (scope, seed, roles table) if operational context is the question
- one relevant ADR or spec
- current implementation **only** when “what does it do today?” is the discovery question

Do not load by default:

- entire `api/src` or `web/src`
- unrelated `domain/*` cards
- historical cortes, old `docs/screenshots/`, closed EWO evidence
- dual-stack notify files unless notify **is** the problem

---

## Shaping

Load:

- discovery output in `workspace/discovery/`
- `workspace/shaping/` (keep PROPOSAL vs DECISION distinct)
- `context/PRODUCT.md` (scope + non-goals)
- affected `domain/*/CONTEXT.md`
- relevant **accepted** ADRs listed on that card

Goal: record a direction. Not code. Not a speculative ADR or EWO.

---

## Domain Analysis

Load:

- `context/GLOSSARY.md`
- the affected area card
- **directly interacting** area cards **only if a named seam is in scope** (see `domain/shared/CONTEXT.md`)
- existing rules: ADR + `*-engine.ts` / `*-rules.ts` for that area
- overlapping SPECs

Do not load neighboring areas “for completeness”. A schema next door is not a dependency.

If analysis would **declare or redraw a Bounded Context**, stop: current cards are **provisional**. Escalate.

---

## Specification

Load:

- accepted shaping decision (`workspace/shaping/`)
- `context/PRODUCT.md` constraints / fuera de v0
- affected domain card + rules
- overlapping files in `docs/specs/`
- if UI layout/hierarchy/actions change: `docs/design/UX_SPEC_TEMPLATE.md` + the corte brief in `docs/design-system/`
- relevant ADRs

Do not load the full design-system folder. Do not merge consulta/conducta with Flota tablero or with trabajos A–E.

---

## Architecture / ADR

Load:

- proposed/approved SPEC
- `context/ARCHITECTURE.md`
- **existing ADRs for that boundary** (paths from `AGENTS.md` table / domain card)
- `docs/adr/README.md` (when to write an ADR)
- affected domain cards
- implementation constraints needed to compare alternatives (ports, schemas)

Do not load:

- UI token docs (unless the ADR is ADR-003)
- notify dual-stack **unless** the decision is about notify
- `architecture/` Aldo-lock files **unless** the change is Logística ops / sin-regreso (then load those as canonical text pointed from docs ADR-011/012)

New ADRs go in `docs/adr/` using `docs/adr/ADR-TEMPLATE.md`. Do not rewrite accepted ADR bodies.

---

## Engineering Work Order generation

Load:

- approved SPEC (and UX spec if visual)
- relevant ADRs
- affected domain card
- `context/ARCHITECTURE.md` constraints
- **related EWOs** only when sequencing matters

Do not:

- invent an EWO without an approved SPEC for non-trivial behavior
- migrate historical cortes/briefs into EWOs unless a human asks
- use the ID prefix `WO-` (collision with visit wizard)

ID: `EWO-001`, `EWO-002`, … in `docs/engineering-work-orders/`.

---

## Execution

Load first:

- the assigned **EWO** (`docs/engineering-work-orders/EWO-xxx.md`)
- referenced SPEC / UX spec / corte Must
- referenced ADRs
- affected `domain/*/CONTEXT.md`
- the matching row in `AGENTS.md` (“Antes de cambiar X, lee Y”)
- `context/GLOSSARY.md` terms used in the EWO

Then use Explorer **narrowly** for source and tests (the module paths on the domain card).

Avoid:

- discovery/research history unless the EWO says rationale is not in accepted artifacts
- the other eight domain cards
- `project-template/` (removed after bootstrap; never a SoT)

Visual-only EWO: `docs/design/` + corte brief + `web/src` for that route. **Do not** load `api/src`.

Flota visual: tablero spec + ADR-011/012 + `domain/flota` + `domain/logistica`. **Do not** load Mantenimiento `/unidades` implementation.

Consulta/conducta: `docs/design-system/ux-consulta-conducta-cortes-v0.md` only. **Do not** merge with A–E or tablero viaje.

---

## Verification

Load:

- Canonical acceptance criteria linked by the EWO (SPEC AC IDs by default; tiny-task criteria may live in the EWO or issue as described in [WORKFLOW](docs/WORKFLOW.md))
- relevant SPEC / ADR / ADR-004 test IDs
- changed files
- test commands: skill `verify-api` or `script/verify.sh`; UI: `proof-ui` + `docs/design/SCREENSHOT_WORKFLOW.md`
- evidence template `docs/evidence/`

Do not add Playwright. Do not run `api` `lint --fix`.

---

## Escalation (leave the execution boundary)

Return to humans / shaping / domain / architecture when:

- product behavior is unclear
- a new domain concept or invariant is required
- DDD Bounded Context status would be asserted or changed
- scope must expand (including anything **fuera de v0**)
- architecture or schema/envelope/ownership must change without an ADR
- an accepted SPEC/ADR conflicts with necessary behavior
- acceptance criteria conflict
- someone asks to **unify** Andon notify factories or treat Evolution as production-ready
- WO (wizard) terminology would be renamed or overloaded as EWO

Do not silently resolve those.

---

## Project-specific routes

Align with [AGENTS.md](AGENTS.md) and [docs/adr/context-map.md](docs/adr/context-map.md).

```text
Kernel / unidades / choferes / tipos / outbox
→ domain/kernel + ADR-000,001,002,008 (+ 009 icono if tipos.icono)
→ not Andon/Inventario schemas

Visita / cierre / VisitaCerrada / wizard WO
→ domain/mantenimiento + ADR-001,002,004 C/O
→ Inventario only if consumos/apply in scope
→ do not load Flota tablero

Inventario
→ domain/inventario + ADR-002,007,004 I/S
→ Notifications only if StockBajo path
→ never andon.*

Andon
→ domain/andon + ADR-004 A, ADR-005
→ notify dual-stack only if EWO is notify
→ never stock tables

Notifications / campanita
→ domain/notifications + ADR-006,004 N

Flota bitácora patio
→ domain/flota + spec fleet-manager-v0 + ADR-008 + ADR-004 F
→ Kernel catalog ports only; no parallel unidad table

Logística Flota visual / ops estado / sin regreso
→ domain/logistica + domain/flota + domain/alertas
→ ADR-011/012 + architecture Aldo-lock files they point to
→ brief-logistica-flota-visual-v0 + spec tablero viaje
→ do not touch Mantenimiento /unidades
→ assignment chofer parked: load ADR-008 port + brief-logistica-asignacion only if EWO is that parked work

Salud
→ domain/salud + ADR-010 (docs/adr/010-salud-unidad.md) + spec unit-health-v0 + ADR-004 H
→ do not write andon.*; do not load notify factories

Alert Catalog (Configuración → Alertas)
→ SPEC alert-catalog-v0 + ADR-013 + domain/shared
→ UX docs/design/ux-alert-catalog-v0.md
→ do not merge andon/alertas/notifications; do not load notify factories
→ Flota hours stay schema `alertas` via port

UI web/src
→ ADR-003 + docs/design/README.md + the corte brief
→ Flota: tablero spec, not ux-operacional A–E

UX operacional A–E
→ ux-operacional-cortes-v0.md
→ not Flota

Consulta / conducta
→ ux-consulta-conducta-cortes-v0.md
→ not A–E, not tablero viaje
```
