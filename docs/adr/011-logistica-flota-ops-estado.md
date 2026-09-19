# ADR-011 — Logística Flota ops estado (Kernel)

Estado: aceptado (v0)

Texto canónico (Aldo lock, archivo `ADR-009` en architecture, distinto de [009-icono](009-icono-tipo-vehiculo.md)): [architecture/ADR-009-logistica-flota-ops-estado-v0.md](../../architecture/ADR-009-logistica-flota-ops-estado-v0.md).

Kernel `unidades.ambito`, `unidades.destino`, `unidades.ops_estado`. Registrar regreso: `EN_RUTA` → `DISPONIBLE`. `salida_at` y umbrales: [ADR-012](012-flota-sin-regreso-alertas.md). Asignación chofer **parked**. Mantenimiento UI no se toca aquí.
