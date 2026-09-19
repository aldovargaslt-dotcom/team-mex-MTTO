# Alertas — routing card

**DDD status:** provisional / unvalidated. Technical evidence: schema `alertas`, `api/src/alertas`. Architecture ADR-010 (docs ADR-012) calls this a **shared config** area, “not a Logística silo, not Andon”.

## Purpose

Store default hours (LOCAL / FORANEO) and per-unidad overrides for **sin regreso**. Evaluation/emit is Logística (or alertas evaluator) → Notifications.

## Authoritative docs

- [ADR-012](../../docs/adr/012-flota-sin-regreso-alertas.md)
- Canonical Aldo: [architecture/ADR-010-flota-sin-regreso-alertas-v0.md](../../architecture/ADR-010-flota-sin-regreso-alertas-v0.md)

## Language (subset)

Umbral horas, override por `unidadId` opaco, `FLOTA_SIN_REGRESO`.

## UI

`/flota/alertas`. HTTP under `/logistica/alertas`.

## Do not

Host these rules in `andon.*`. Do not treat this folder as a general-purpose “alerts BC” for stock or health.
