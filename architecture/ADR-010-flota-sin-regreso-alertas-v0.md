# ADR-010 — Flota "sin regreso" alertas (v0)

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-09-19 |
| **Accepted** | 2026-09-19 (Aldo full lock) |
| **Owner** | architect |
| **Depends on** | ADR-000, ADR-006, ADR-008, ADR-009 |
| **Product** | Config alertas in shared alertas; Logística UI; Notifications inbox + Flota badge |

Índice repo: [docs/adr/012-flota-sin-regreso-alertas.md](../docs/adr/012-flota-sin-regreso-alertas.md). No sustituye [docs/adr/010-salud-unidad.md](../docs/adr/010-salud-unidad.md).

## Context

Standing ops on Kernel unidad (ADR-009). Need overdue-return alerts: time since `salida_at` while `opsEstado=EN_RUTA`, thresholds by ambito with per-unidad override, emit to shared Notifications (ADR-006), not Andon.

## Decision

### 1. Ownership

| Piece | Owner |
|---|---|
| `opsEstado`, `ambito`, `destino`, `salidaAt` | Kernel `unidad` (Logística writes) |
| Default hours LOCAL/FORANEO + rules metadata | **Alertas** store (shared config BC / `alertas` schema) |
| Per-unidad threshold override | Alertas store keyed by opaque `unidadId` (unidad wins) |
| Eval job / emitter | Logística (or alertas evaluator) reading Kernel + alertas config |
| Inbox projection | Notifications (ADR-006) |
| Flota badge | UI derived from same open inbox items / eval |
| Andon | **out** |

### 2. Locked numbers

| Scope | Hours |
|---|---|
| Default `LOCAL` | **8** |
| Default `FORANEO` | **24** |
| Unidad override | optional hours; **wins** over ambito default |

Clock start = **`registrarSalida`** → set `unidad.salida_at`.  
`registrarRegreso` → `opsEstado=DISPONIBLE`, clear `salida_at` (and clear/expire alert dedupe).

Alert condition (derived):  
`opsEstado=EN_RUTA` AND `salida_at` set AND `now - salida_at >= thresholdHours(unidad)`.

No stored sticky "alert flag" required; optional last_emitted for idempotency via Notifications `dedupe_key`.

### 3. Kernel columns (extend ADR-009)

| Column | Notes |
|---|---|
| `salida_at` | timestamptz null; set on salida, cleared on regreso |

(`ambito`, `destino`, `ops_estado` already ADR-009.)

### 4. Alertas config (new thin schema `alertas`)

```
alertas.regla_flota_sin_regreso
  id
  ambito_default_local_h   = 8
  ambito_default_foraneo_h = 24
  updated_at

alertas.umbral_unidad
  unidad_id   -- opaque, no FK cross-schema
  horas       -- override
  PK (unidad_id)
```

Logística UI configures this family; Notifications does not own thresholds.

### 5. Frozen DTO / ports (builder)

```ts
// Commands (Logística)
registrarSalida(unidadId: string, input: {
  ambito: "LOCAL" | "FORANEO";
  destino?: string;
  choferId?: string; // optional; ADR-008 assign if provided
}): Promise<void>
// sets opsEstado=EN_RUTA, ambito, destino?, salidaAt=now, optional choferId

registrarRegreso(unidadId: string): Promise<void>
// opsEstado=DISPONIBLE; salidaAt=null; keep choferId unless product says clear

// Threshold resolution
resolveUmbralHoras(unidad: { id; ambito }): Promise<number>
// umbral_unidad[unidad.id] ?? (ambito===FORANEO ? 24 : 8)

// Emit → Notifications (ADR-006)
type FlotaSinRegresoAbierto = {
  eventId: string;
  eventType: "FLOTA_SIN_REGRESO";
  unidadId: string;
  ambito: "LOCAL" | "FORANEO";
  salidaAt: string;      // ISO
  thresholdHoras: number;
  elapsedHoras: number;
  occurredAt: string;
}
// dedupe_key = `FLOTA:sin-regreso:{unidadId}`
// source_module = LOGISTICA (or FLOTA)
// subject_type = UNIDAD
// on regreso / under-threshold → expire/clear same dedupe (StockBajo pattern)
```

Eval: periodic job + on read path OK for v0; must be idempotent via dedupe.

### 6. Non-negotiables

1. Not Andon schema / WA ladder.
2. No mantenimiento writes.
3. STOCK|RUTAS|CAMIONES chips remain UI-only.
4. Opaque `unidad_id` in alertas — no cross-schema FK.

## Consequences

- Builder: migrate `salida_at`; alertas tables; wire emit to existing inbox ingest; Flota badge from unread FLOTA_SIN_REGRESO.
- ADR-009 unchanged except documented `salida_at` addition here.
- Reviewer: FAIL if thresholds hard-coded only in UI or alerts written into andon.

## Status note

Accepted under Aldo full lock. Builder unblocked for this slice.
