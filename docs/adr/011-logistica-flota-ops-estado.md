# ADR-011 — Logística Flota ops estado (Kernel)

> Target extension [ADR025](025-abc-utilization-downtime.md), 2026-10-15: durable
> journey returns, explicit correlated physical departure and Logistics operational
> stop routing/external completion. Preserve Kernel journey ownership and independent
> Flota writes through its capability; return does not implicitly mutate custody.
> Canonical historical Aldo text below remains unchanged. No runtime approval.

Estado: aceptado (v0)

Texto canónico (Aldo lock, archivo `ADR-009` en architecture, distinto de [009-icono](009-icono-tipo-vehiculo.md)): [architecture/ADR-009-logistica-flota-ops-estado-v0.md](../../architecture/ADR-009-logistica-flota-ops-estado-v0.md).

Kernel `unidades.ambito`, `unidades.destino`, `unidades.ops_estado`. Registrar regreso: `EN_RUTA` → `DISPONIBLE`. `salida_at` y umbrales: [ADR-012](012-flota-sin-regreso-alertas.md). Asignación chofer **parked**. Mantenimiento UI no se toca aquí.
