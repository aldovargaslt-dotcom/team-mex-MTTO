# Notifications — routing card

**DDD status:** provisional / unvalidated. Technical evidence: schema `notifications`, `api/src/notifications`. ADR-006: thin inbox (campanita), not the Andon bus and not stock owner.

## Purpose

Aggregate inbox items from Andon, Inventario, Salud, and Flota-sin-regreso. Dedupe via `dedupe_key`. Per-user read state.

## Authoritative docs

- [ADR-006](../../docs/adr/006-notifications-schema.md)
- [ADR-004](../../docs/adr/ADR-004-tdd-test-bar-andon-v0.md) N
- Producers: ADR-007 (stock), ADR-010 (salud), ADR-012 (sin regreso)

## Language (subset)

Campanita, inbox, `dedupe_key`, `inbox_read`, badge, `source_module`, severity.

## Seams

Ingest via adapters/ports. WhatsApp stays on Andon `NotifyPort`, not here.

## Do not load by default

Andon engine internals, Inventario apply rules, Flota movement F1–F11 — unless the EWO changes the envelope into the inbox.
