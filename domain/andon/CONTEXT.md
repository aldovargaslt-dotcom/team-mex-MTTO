# Andon — routing card

**DDD status:** provisional / unvalidated. Technical evidence: schema `andon`, `api/src/andon`. ADR-005: **only** overdue maintenance notices.

## Purpose

Open at most one unresolved aviso per unit when km or days since last **closed** visit exceed type thresholds. Enterado is in-app. Resolve on `VisitaCerrada`.

## Authoritative docs

- [ADR-004](../../docs/adr/ADR-004-tdd-test-bar-andon-v0.md) A1–A8
- [ADR-005](../../docs/adr/005-andon-no-stock-alerts.md)
- [docs/andon-evolution-notify.md](../../docs/andon-evolution-notify.md)
- [architecture/andon-whatsapp-ops-checklist-v0.md](../../architecture/andon-whatsapp-ops-checklist-v0.md) — may disagree with code about Evolution; **do not “fix” dual-stack** in an unrelated cut

## Language (subset)

Aviso `ABIERTO` / `ENTERADO` / `RESUELTO`, `t_km`, `t_dias`, `NotifyPort`.

## Seams

- In: `VisitaCerrada` (ignore `consumos`).
- Out: `AvisoInboxPort`; `NotifyPort` (default `noop`).
- Read-only: Flota `AndonAbiertoPort`.

## Dual-stack (known conflict)

1. `api/src/andon/andon-notifier.factory.ts` — Twilio parked; `evolution` stub.
2. `api/src/andon/notify/` — Evolution HTTP wired; runtime `notify.providers.ts` → `createAndonNotify`.

Document both. Do not unify factories. Do not load this conflict unless the EWO is actually about notify.
