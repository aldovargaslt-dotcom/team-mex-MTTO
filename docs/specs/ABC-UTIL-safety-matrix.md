# ABC/UTIL — safety policy validation matrix

Status: product constraints agreed; technical definitions REQUIRED before affected
completion/release capabilities are implementation-ready. Not approved as a full
safety policy. Owner: Maintenance authority; consolidated 2026-10-15.

[ADR025](../adr/025-abc-utilization-downtime.md) owns decisions;
[ABC spec](ABC-daily-release-spec-and-gap-analysis.md) owns acceptance criteria.
Mock colors/photos do not establish thresholds. No PSI prerequisite in future ABC.

| ID | Retained observation | Agreed constraint | Maintenance must validate |
|---|---|---|---|
| SAFE-01 | Required facts/evidence | Missing, unreadable, invalid or unsupported required value prevents signing; no default normal | Allowed enums; legitimate N/A by configured vehicle applicability; recapture procedure |
| SAFE-02 | Oil | Critical condition => UNFIT; classification cannot downgrade | Critical/noncritical definitions; correction and verification evidence |
| SAFE-03 | Coolant | Critical => UNFIT; refill does not verify a continuing leak repaired | Criteria, safe procedure and post-action evidence |
| SAFE-04 | Washer fluid | Explicit observation where applicable | Applicability; allowed conditions and blocking policy |
| SAFE-05 | Visible leaks | Severe => UNFIT; location/severity/note retained | Severity combinations and physical supporting evidence |
| SAFE-06 | Visual tires | Exact unique configured positions; severe damage/visually flat => UNFIT | Defect/severity enums, position applicability and verification; no numeric pressure |
| SAFE-07 | Dashboard | 2–5 READY photos cover odometer/fuel/warnings; limited warning assessment plus engine context | Warning-specific policy by relevant vehicle/context; ambiguous-warning procedure; no color-only rule |
| SAFE-08 | Fixed during ABC | Original fact/action/verified current condition retained; selecting FIXED alone cannot clear blocker | Required before/action/after proof; permitted corrections |
| SAFE-09 | Serious issue outside ABC | Independent persistent hold; no expanded routine checklist | Authorized hold producers, technical evidence and scoped clearance procedure |
| SAFE-10 | Focused verification | Inspect named repairs with fresh evidence; failure retains hold | Finding-specific tests/evidence and permitted repair-related invalidation resolution |

## Required validation artifact

For each row record approved policy ID/version, vehicle applicability, allowed
input combinations, derived finding/result, evidence required, correction/recheck
procedure, approver and validation date. Test normal/noncritical/critical/missing/
invalid cases. Policy revisions invalidate unsigned review candidates; historical
signed policy remains frozen. A stricter current release obligation must be an
explicit versioned requirement, never a rewrite of the signed ABC.

Until applicable policy is validated/configured, report the missing requirement
and keep affected signing/release disabled. Do not invent technical thresholds,
infer a warning meaning from its color, or treat this matrix as a completed risk
assessment. Any repair consumables use existing authorized maintenance semantics;
ABC completion does not consume stock.
