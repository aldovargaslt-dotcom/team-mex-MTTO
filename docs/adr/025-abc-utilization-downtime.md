# ADR-025 — ABC, indisponibilidad por motivos y salidas correlacionadas

> Enmienda acotada 2026-10-17: [ADR028](028-configurable-abc-validity.md) sustituye
> el vencimiento diario universal de decisiones 8–9 por política configurable.
> Recheck no renueva vigencia; otros gates, motivos y downtime se conservan.
> Calendario detallado y ejecución siguen pendientes. Cuerpo histórico abajo.

## Status

Accepted for the product/ownership decisions explicitly confirmed by the user in
this review, consolidated 2026-10-15 (client date). Documentation only. Detailed
contracts remain Proposed; safety validation and implementation approval remain
outstanding. This ADR does not assert deployed capability.

## Context

ADR023 treats maintenance opening as ready for work, without withdrawal from
service. The owner now requires opening PREVENTIVE/CORRECTIVE to withdraw the
unit. ADR016 separates maintenance and CHECK; ADR017 preserves journey and yard
custody. Current departure rules can accept an older FIT during an active CHECK;
closing/cancelling active blocking maintenance can remove its gate. Logistics
retains departure audit but clears salidaAt on return without a durable return
endpoint. These are source observations, not production verification.

## Decision

1. A maintenance draft has no availability effect. Explicit opening withdraws
   the unit and starts/joins downtime. CHECK and prepared corrective context are
   excluded. A corrective derived at CHECK completion remains unopened until the
   authorized opening action; CHECK completion alone does not start downtime.
2. Keep one open downtime episode per unit with multiple active reasons and
   order references. Additional reasons never reset its start. Completing an
   order resolves its contribution; the episode ends only when no reason remains.
3. Cancellation removes only the cancelled contribution. Duplicate/replaced work
   references its survivor; mistaken opening requires justification and separate
   audited historical correction; abandoned work retains an explicit unresolved
   reason. Recompute current state from remaining facts, never restore a stale
   snapshot. Genuine past downtime remains historical evidence.
4. Mantenimiento owns technical work and the downtime ledger; Logística owns
   operational-stop facts, assigns/routes corrective stops, and confirms external
   service completion through the owner capability. Supervisor/Administrativo
   manage maintenance reasons; existing mechanic opening/closure permissions
   remain unchanged. Each team resolves its own reasons within facility scope.
   No new bounded context or schema is declared here.
5. Logistics routes a corrective stop to external service or standard internal
   corrective-order creation carrying context. Both join the same episode.
   External cost entry does not finish service; explicit completion resolves its
   reason. This is bounded service-cost capture, not general costing/procurement.
6. Administrative ACTIVA/INACTIVA, Flota physical state, journey, downtime, and
   departure readiness stay independent. Opening an OT does not fabricate a
   workshop transition or change administrative status. Flota alone records
   physical movement through its capability.
7. ABC remains oil, coolant, applicable washer fluid, visible leaks, configured
   visual tire positions, and dashboard evidence/limited warning assessment.
   Remove future PSI inputs, findings, policy/config prerequisites and summaries;
   preserve historical signed PSI content. No routine brakes/steering/suspension/
   battery inspection is added. Serious known defects outside ABC still block.
8. The inspecting assigned mechanic signs; no chief approval for ABC. Any
   authorized mechanic assigned to a focused recheck personally verifies and
   signs named findings. Preserve the base ABC; resolve only eligible scoped
   repair requirements. No extension beyond the base operational day, no clearance
   of unrelated incident/blanket invalidation. A new daily ABC does not erase a
   persistent safety hold. Required/superseding active inspection blocks departure.
9. Last-order completion may end downtime while a safety/recheck hold remains.
   Failed verification retains the hold and offers linked Continue repair.
   Across midnight, today's ABC and outstanding verification are required; one
   guided session/signing action may bind distinct clearly identified records.
10. Logistics authorization and physical custody departure are separate correlated
    facts. Revalidate current gates at physical departure, without rejecting the
    same departure solely because its correlated journey already exists. New
    blockers/expiry suspend prior authorization; Logistics reconfirms using saved
    details. Preserve CHOFER/AVAL, genuine return and independent loops.
11. Every unit has a current display status and reasons. Unknown/conflicting sources
    produce Requires confirmation, never inferred availability. Reporting uses
    downtime once, trip outside downtime, evidenced yard available/held/unconfirmed,
    and unclassified time. A real in-trip breakdown is valid overlapping evidence.
12. Administrativo makes justified historical corrections with preview; Supervisor/
    Logistics request them. Preserve originals, registration times and prior
    authorization decisions. Recompute affected reports with freshness visible.

### Precise supersession

| Historical decision | Replaced scope | Preserved scope |
|---|---|---|
| ADR023 | Opening has no withdrawal/downtime effect | Draft/open marker, canonical lifecycle, existing authority, no maintenance-performed event at opening |
| ADR016 | Existence/type alone is no longer sufficient to describe blocking: an explicitly opened maintenance order always adds downtime | Draft corrective alone does not block; independent safety holds, Visita identity, CHECK_COMPLETED separation |
| ADR017 | Completed-base-only approval, blanket repair invalidation, two uncorrelated departure evaluations | Calendar, incident invalidation, module ports, custody signatures, independent loops and navigation |
| ADR020 / R02 references | PSI provisioning as a future daily CHECK prerequisite | Immutable historical storage, scheduler identity/calendar, migration safeguards |
| ADR011 | Current journey fields alone as the target trip record | Kernel journey owner, no implicit Flota writes on return, no parked driver-assignment expansion |

## Alternatives Considered

- Explicit downtime confirmation on every maintenance opening: rejected for normal
  internal work; the opening confirmation itself now attests withdrawal.
- Restore the pre-order status: rejected because other reasons may change meanwhile.
- Close all reasons with the last OT or external invoice: rejected; independent
  operational reasons and technical holds survive.
- One mutable physical/administrative/fitness status or merged journey/custody:
  rejected; it loses distinct authority and evidence.

## Consequences

Advance preparation must remain draft. Internal openings, cancellations, reason
resolution and departure need common per-unit coordination. Explicit external
completion and technical verification remain separate. Unknown history cannot
support invented duration. Existing open orders require an evidence-based rollout
reconciliation, not downtime backdated to creation/opening by assumption.

## Risks

Safety definitions are not established by this ADR. Proposed combined signing,
cost records, reason transfers and correlated authorization need detailed review
and real PostgreSQL concurrency verification. No runtime permission is granted.

## Follow-up

Validate the [safety matrix](../specs/ABC-UTIL-safety-matrix.md), approve the
[technical contract](../contracts/ABC-UTIL-001-contract.md), reconcile existing
records, and authorize bounded EWOs before implementation. No EWO is approved by
this documentation update.

## Related Artifacts

- [Product intent](../prds/abc-utilization-v1.md)
- [ABC specification](../specs/ABC-daily-release-spec-and-gap-analysis.md)
- [Downtime specification](../specs/SPEC-UTIL-INPUTS-001.md)
- [UX](../design-system/ux-utilization-inputs-v1.md)
- [Delivery/review plan](../../workspace/shaping/abc-utilization-implementation-plan.md)

## Ownership

Date: 2026-10-15. Approval reference: this chat, explicit answers Q1–Q12 and
external-service completion confirmation, followed by authorization to revise docs.
Mantenimiento: technical facts/ledger; Logística: operational reasons, routing and
departure; Flota: physical custody; Administrativo: authorized historical correction.
