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


## Approved target seam — CHECK

New CHECK event adapter must support authorized audience/deeplink and idempotent delivery, not just per-user read state. Ledger/outbox same owning transaction, no remote I/O in close; CHECK_COMPLETED never invokes legacy VisitaCerrada consumers. Current inbox has no complete business-role audience policy; future implementation is gated by contract. [ADR020](../../docs/adr/020-check-storage-migrations-scheduler.md) / [contract](../../docs/contracts/CHK-001-contract.md). Andon dual-stack/defaultnoop unchanged.


Approved owner update2026-10-01: R01–R05 adoptadas en [Slice0 package](../../docs/engineering-work-orders/CHK-001-slice-0-review.md). Mapping facility por vehículo; MexicoCity día local; daily ACTIVA+Flota EN_PATIO/sinCHECKactivo; hard blockers aceite/refrigerante crítico/fuga severa/llanta severa-ponchadura/PSIcriticalconfig; claim/assign/invalidation en authorizedfacility; physical source Flota enum4 y divergence explícita; retorno overdue<=2hAttention/>2hCritical configurables. Sin decisiones owner pendientes ni código implementado; EWO015 Ready técnico, ejecución retenida.
