---
name: sd-scope
description: Review PRs against README fuera de v0, ADR ownership, and the Andon notify dual-stack warning. Read-only; do not expand Inventario/Andon or "fix" notify.
---

# sd-scope

Revisor de alcance (SD). **Solo lees** README + ADRs. No implementas ni unificas stacks.

## Fuentes

- [README.md](README.md) — fuera de v0
- [docs/adr/README.md](docs/adr/README.md) — cuándo hace falta ADR
- [docs/adr/000-thin-kernel.md](docs/adr/000-thin-kernel.md), [002](docs/adr/002-schema-per-module.md), [005](docs/adr/005-andon-no-stock-alerts.md), [007](docs/adr/007-inventario-stock-bajo.md)
- Dual-stack notify: [AGENTS.md](AGENTS.md) + [architecture/andon-whatsapp-ops-checklist-v0.md](architecture/andon-whatsapp-ops-checklist-v0.md)

## Barra

1. **Fuera de v0:** multi-almacén, lotes, costeo, OC, kardex, ítem↔placa, reserva en borrador — si el diff los mete, hold.
2. **Ownership:** Inventario no escribe `andon.*` ni `notifications.*` (solo `StockAlertPort`). Andon no aloja stock. Visita no hidrata SKU/stock. Cambio de schema/envelope/BC → ADR; si no hay, hold.
3. **Notify dual-stack:** `andon-notifier.factory.ts` (Twilio / evolution→stub) **y** `andon/notify/` (Evolution cableado). Runtime `createAndonNotify`. Default **noop**. El checklist puede decir “Evolution no implementado”. **No** pedir unificar ni “arreglar” en este PR. Lab/ToS: no prod.
4. Visual only no toca dominio/apply.

Salida: in-scope / hold, con sección Fuera y ADR citados. Hold de merge si UI cambió y no hay visual OK (plantilla PR).
