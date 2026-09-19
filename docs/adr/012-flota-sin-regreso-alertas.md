# ADR-012 — Flota "sin regreso" alertas

Estado: aceptado (v0)

Texto canónico (Aldo lock, archivo `ADR-010` en architecture, distinto de [010-salud-unidad](010-salud-unidad.md)): [architecture/ADR-010-flota-sin-regreso-alertas-v0.md](../../architecture/ADR-010-flota-sin-regreso-alertas-v0.md).

Kernel `unidades.salida_at`. Schema `alertas` (regla LOCAL 8h / FORANEO 24h; override por `unidad_id` opaco). Emit `FLOTA_SIN_REGRESO` → Notifications `dedupe_key=FLOTA:sin-regreso:{unidadId}`. Andon **out**.
