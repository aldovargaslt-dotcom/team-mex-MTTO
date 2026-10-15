# UX — ABC, utilization and downtime inputs

Status: revised 2026-10-15 from the supplied UX draft and explicit user decisions.
Product behavior confirmed; detailed design/proof not executed. Supersedes the
draft's prohibition on automatic OT-to-downtime mapping and blanket overlap warning.
[UTIL](../specs/SPEC-UTIL-INPUTS-001.md) and [ABC](../specs/ABC-daily-release-spec-and-gap-analysis.md)
own behavior/AC; [ADR025](../adr/025-abc-utilization-downtime.md) owns decisions.

## Screen purpose and primary users

Complete normal operational work without duplicate downtime entry. Logistics
records/routes corrective stops and external completion; Maintenance executes
internal orders, mechanics inspect/sign, Administrativo corrects history. Scope
and existing writer rights are enforced server-side; shared visibility is not
shared technical clearance authority.

## Questions and information hierarchy

What unit/work/episode is this? What is wrong? What action is needed? What is its
current status? What evidence supports it?

P0: blocking reason/actionable failure. P1: identity, current status, proposed
effect and primary action. P2: active reasons, source work and remaining holds.
P3: expandable evidence/audit. Every unit has a status and source time. Missing
facts => “Requiere confirmación,” with the missing source; never default available.
Physical state, journey, downtime and readiness remain distinguishable. Graph
colors never authorize departure or become editable user input.

## Primary/secondary actions and copy

| Context | Primary action | Effect/copy |
|---|---|---|
| Maintenance draft | Abrir orden | “La unidad quedará indisponible hasta resolver los motivos activos.” Existing opening confirmation is enough; no separate downtime form. |
| Opening while on trip | Confirmar apertura | “La unidad está en viaje. Abrir esta orden registra que no puede operar desde ahora.” Preserve trip. |
| Logistics unit/detail | Registrar parada correctiva | Inherit unit/issue, route “Servicio externo” / “Reparación interna”; retain existing host-page primary hierarchy. |
| Internal routing | Continuar a orden correctiva | Carry unit/problem/episode; no repeated unit or inspection entry. Only authorized writers create/open work. |
| External stop | Guardar costo / Finalizar servicio externo | Separate actions. “Guardar el costo no finaliza la indisponibilidad.” Amount+currency; pending cost visible, no invented zero. |
| Order/service completed | Existing completion action | “Motivo resuelto; permanecen otros motivos de indisponibilidad” or “Indisponibilidad finalizada; permanecen bloqueos de salida,” as applicable. |
| Cancellation | Cancelar orden | Choose Duplicada/reemplazada, Apertura por error, Trabajo abandonado; request only survivor/justification needed. Show resulting remaining reasons. |
| Failed verification | Continuar reparación | Authorized Supervisor/Admin gets prefilled linked corrective flow; hold stays visible. |
| Required recheck | Verificar reparación | Named findings, fresh evidence, own signature; original ABC remains accessible. |
| Departure | Autorizar salida / Reconfirmar salida | Current reasons shown; preserve saved trip details after authorization suspension. |
| Correction | Solicitar corrección / Confirmar corrección | Supervisor/Logistics request; Administrativo sees original/replacement/justification and before/after intervals. |

Contextual operations use one primary confirmation per overlay; Cancelar is
secondary. Do not crowd maintenance/ABC footer with competing actions. Do not
offer clearance controls to read-only actors. Routine values come from context,
server actor/current time and established cause; one cause selector only when
ambiguous, including Mixto/Otro/Desconocido. No extra diagnosis, routine timestamp,
phase, metric or color input. Future maintenance remains draft.

Cancellation recalculates current state; if yellow applies again display yellow
with reasons. Never restore an old screenshot/status or erase genuine history.
Ending a stop does not assert “Lista para salir.” External completion may leave a
technical verification hold. Cost details, exact rounding/limits and currency
configuration follow the proposed technical contract before UI implementation.

## Pattern and clone

Reuse [page patterns](../design/PAGE_PATTERNS.md): object detail (5), maintenance
wizard (6), short-record dialog (7). Clone current Logistics transaction Sheet and
NuevaOrdenDialog responsive behavior. Keep four ABC steps; one guided daily ABC+
recheck session discloses both distinct signed records. No signature silently reused.

## Fleet overview and unit detail

The upload covered capture only; this revision includes the agreed graph surfaces.
Overview: range/facility, category hours, coverage, causes and linked unit list.
Detail: source-backed interval timeline, simultaneous reasons/trip evidence,
orders/CHECK/rechecks, correction history and current holds. Preserve selected
filters and calculation revision during drill-down. No mechanic-productivity or
live-telemetry claim. Positive roadside breakdown overlap is explained as
“Avería durante el viaje”; only actual conflicts prompt record reconciliation.

Display available/held/unconfirmed yard time distinctly. Known current status
does not fill missing historical duration. No percentage when denominator is
unsupported; show hours and coverage. Preserve last calculated result with
“Recalculando” after correction; do not mix totals from different revisions.

## States and interactions

| State | Behavior/copy |
|---|---|
| Loading | “Cargando situación de la unidad…”; disable confirmation until relevant facts load. |
| Empty episode | “No hay una indisponibilidad abierta registrada.” Not a readiness claim. |
| Normal | Current facts, effect, inherited context and one confirmation. |
| Saving | “Guardando…”; prevent repeat submit, preserve values. |
| Success | Describe own completed effect and remaining reasons/holds; physical movement only if actually recorded. |
| Error | “No se pudo guardar. Se conservan tus datos.” Include actionable validation details. |
| Uncertain result | “No pudimos confirmar el resultado. Consulta el registro o reintenta.” Same command identity. |
| Conflict | “El registro cambió. Revisa la situación actual antes de confirmar.” Show winning current state/reasons. |
| Warning | “Historia incompleta,” “Costo pendiente” or “Requiere confirmación,” with explanation. |
| Critical | Named safety causes stay visible even during active inspection or trip. No blanket overlap warning. |
| Unauthorized | Hide command; direct access rejects without mutation. |
| Recalculating | Last report revision and update time visible; no false completion or blocked operational command from graph lag. |

Use portal overlays, visible focus, existing motion and focus return; retained
form input after failures. Correction preview uses business timezone and explicit
offset-aware timestamps; no technical IDs/versions in routine flow. Genuine
physical return remains available under existing movement requirements even when
departure prerequisites expired. Combined operations require both capabilities
and atomic supported effects; otherwise separate actions/results.

## Mobile/responsive and Don't

Desktop 1440/1024 preserves host detail; mobile 390 uses bottom Sheet, scrollable
preview, visible confirmation/cancel, 44px targets and readable stacked history.
No new persistent status-entry toolbar or wizard step; no repeated contextual
unit/OT selection, PSI, full roadworthiness inspection or administrative-state edit
as a substitute for downtime. No unrelated design-system migration.

## Proof plan

After implementation capture desktop/mobile: opening/on-trip confirmation,
external/internal routing, cost without completion, cancellation-to-yellow,
multiple reasons, failed verification, held-yard timeline, correction preview,
recalculating, conflict and failed-save. Follow repository click-through/screenshots
and separate visual review; no runtime proof or screenshots claimed here.
