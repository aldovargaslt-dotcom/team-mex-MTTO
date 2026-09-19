# Salud — routing card

**DDD status:** provisional / unvalidated. ADR-010 **names** Salud a bounded context; re-validate on real change. Technical evidence: schema `salud`, `api/src/salud`.

## Purpose

Calculated, explainable **Health Score** (mantenimiento + source alerts + inspections). Not `ACTIVA`/`INACTIVA`, not ops_estado, not editable via PATCH.

## Authoritative docs

- [ADR-010](../../docs/adr/010-salud-unidad.md) — **this** is salud; not architecture ADR-010
- [docs/specs/unit-health-v0.md](../../docs/specs/unit-health-v0.md)
- [ADR-004](../../docs/adr/ADR-004-tdd-test-bar-andon-v0.md) H1–H15

## Language (subset)

Health Score, `GOOD`/status display, `HEALTH_BELOW_THRESHOLD`, hysteresis, inspections `NOT_APPLICABLE` in v0.

## Seams

Read-only ports to last closed visit, open Andon aviso, umbrales, patio km. Writes inbox via `HealthAlertPort`. **Must not write `andon.*`**. No WhatsApp / `NotifyPort`. Dual-stack notify left intact.

## Auth (v0)

`GET` health: Supervisor + Admin. Config: Admin only. `LOGISTICA` does not use this BC on the patio ficha.
