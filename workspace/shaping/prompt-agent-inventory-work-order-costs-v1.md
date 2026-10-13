# Build prompt — inventory and work-order costs

Copy the following prompt into the implementation agent's chat. Ensure that agent has this repository and the referenced documents, including files currently uncommitted. This file is a proposed handoff prompt; creating it does not execute or approve migrations.

---

Implement the agreed inventory/work-order costing workflow in Team Mex MTTO. Complete the working API, migrations, UI, regression tests and evidence; do not stop at a plan or another specification.

## Authorization and repository

Work in `/workspace/team-mex-MTTO` (resolve the equivalent repository root if your checkout differs). This request authorizes implementing SPEC-INV-OT-001 and its linked UX, including the narrowly scoped costing extension previously outside v0 and the proposed ADR-025 approach. It authorizes reversible local development and migrations/tests against a verified disposable local database. It does not authorize deployment, production migrations, unrelated refactoring or wider editing of closed maintenance records.

Follow `AGENTS.md`, `ICM.md` and `docs/WORKFLOW.md`. Inspect git status first; preserve existing edits. Treat the documents as sources of requirements, not proof of deployed capability or previous technical approval. Record this implementation request as the approval reference for the bounded EWO you prepare. Resolve and document technical details before changing runtime; ask only when a material product decision or incompatible architecture cannot be resolved within this scope. Do not ask again about decisions explicitly confirmed below.

## Required context

Read these files, then load additional context through ICM only as needed:

- `docs/specs/work-order-inventory-costs-v1.md` — canonical AC-01 through AC-24.
- `docs/design/ux-work-order-inventory-costs-v1.md`.
- `docs/prds/inventory-work-order-costs-v1.md`.
- `docs/adr/025-work-order-inventory-costs.md` — proposed architecture; complete the technical contract and record its bounded adoption under this request. Preserve accepted ADR bodies and add explicit supersession links where appropriate.
- Relevant existing ADRs 001/002/007/022, domain routing cards for Inventario/Mantenimiento, testing strategy and existing UI design system.

Verify current behavior in source. Documentation may lag the checkout. If a referenced document is missing, search for it rather than inventing its contents.

## Confirmed product decisions

1. Supervisor is the current operator and can close work orders. No purchase approvals or administrator closure handoff.
2. Warehouse usage requires item and quantity used; no receipt or manually entered price. Use moving weighted-average inventory valuation.
3. A purchase specifically for an OT charges its used pieces at actual acquisition cost. Do not blend that direct usage with existing warehouse prices. Only unused quantities physically received in the warehouse enter warehouse valuation.
4. Costs are MXN, including tax in the total actually paid. No tax accounting subsystem.
5. Quantity used must be explicitly supplied; never default it to everything purchased. Zero used is valid for a purchase; confirmed consumption itself must be positive.
6. Fractional quantities are supported for divisible materials, including usage below one, e.g. 0.25 L. Whole pieces remain indivisible. Support package/base-unit conversions, e.g. 1 box = 10 pieces.
7. Receipts can be attached later, even after closure. Until attached, show **Comprobante pendiente** in the purchase and existing active alerts. One condition per purchase, not per line. Reading the alert or closing the OT must not resolve it. Attaching the receipt must not move stock or change cost.
8. Existing stock without known cost can be used and the OT can close. Show **Costo pendiente** and an incomplete total; never assume zero. Administrator can complete missing values through an auditable operation.
9. Every purchased quantity must have a destination before closure: used, physically received in warehouse, supplier return or documented loss. A missing receipt/cost does not itself block closure.
10. `ADMIN_DIRECTIVO` can correct materials and associated costs of closed OTs, with reason, before/after history and inventory/cost reversals. Supervisor cannot correct closed OTs. This does not grant editing of km, signatures, maintenance dates or work performed.
11. Supplier returns reference the purchase; reverse the appropriate source/cost without fictitious warehouse receipts. Refund/replacement tracking is distinct from inventory movement.
12. A purchase belongs to one OT. Multiple item lines can share a receipt, with cost captured per line. Do not introduce receipt allocation across multiple OTs.

## Implementation sequence

1. Inspect affected services/entities, migrations, role enforcement, wizard, inventory views, active-alert façade and current tests. Identify the actual legacy close/application path.
2. Prepare the next unused EWO ID, referencing canonical ACs rather than duplicating them. Complete ADR-025's technical contract: decimal representation/precision, transaction and lock order, idempotency keys, legacy compatibility and cost-completion/correction behavior. Choose routine engineering details and explain them; do not invent new product policy.
3. Implement additive, tested migrations for decimal quantities and affected thresholds, valuation, purchase/line records, opaque OT references, movement cost snapshots, reversals, version checks and unique command identities. Preserve existing quantities, pending receipts and historical movements. Unknown legacy costs remain explicitly unknown.
4. Implement server-side purchase, usage, physical receipt, supplier-return and administrator-correction commands. Posting must be transactional and safe under retries/concurrency. Use exact decimal arithmetic. Ensure quantity and monetary value reconcile, including rounding residues and costs that remain unknown.
5. Wire confirmed movements before closure using the adopted ADR-025 approach. Closing verifies/references posted consumption and never consumes it again. Preserve frozen historical `VisitaCerrada` events and compatible legacy processing. Corrections must not reemit completed maintenance or trigger duplicate Andon/Salud/CHECK effects. Stable operation/line identity must distinguish repeated legitimate uses of the same SKU.
6. Integrate missing receipts into the existing active-alert owner/façade; deduplicate migrated legacy pending records. Reuse existing secure evidence storage and permissions. Upload errors must leave the pending condition and preserve form data.
7. Build the Spanish UI within existing patterns: **Usar del almacén**, **Registrar compra**, explicit quantity used, calculated remainder/physical receipt, cost summary, receipt alert/deeplink and administrator corrections. Preserve current maintenance closure requirements and design tokens. No new dashboard or ERP form.
8. Add meaningful tests covering the ACs and run required checks. Perform real click-through proof and separate visual review according to repository instructions. Fix failures attributable to the change; document unrelated baseline failures precisely.

## Essential regression examples

- Stock 10 filters at MXN 200. Buy 3 at 250; use 2 directly and receive 1. OT cost = 500; stock = 11; inventory value = 2,250. Subsequent warehouse use takes the weighted average, while original direct cost remains 500.
- Buy 5 L for MXN 500 including tax; use 4.5 L and receive 0.5 L. OT cost = 450; warehouse receives 0.5 L valued at 50.
- Repeated save, timeout retry, receipt attachment and OT closure must not duplicate purchase, usage or valuation.
- Concurrent usages exceeding combined stock must not create negative balances. Returning more than the original available quantity must fail atomically.
- Close with missing receipt/cost but reconciled quantities; receipt alert persists. Attach receipt afterward; alert resolves without stock/cost changes.
- Correct a closed OT as administrator; preserve original cost/history and physical destination. Unauthorized roles fail. No extra maintenance-completed event.
- Cancel/delete a draft containing posted movements without silently erasing history or restoring physically consumed parts.

## Constraints and verification

Inventario is the only writer of stock/valuation; Mantenimiento owns OTs. Use opaque references and ports, without cross-schema SQL JOINs/FKs. Keep other roles and domains unchanged. No multi-warehouse, reservations, purchase approval, formal OC suite, mandatory OCR or payment accounting.

Use the repository's database setup. Confirm the test connection points to a disposable database before destructive tests; do not expose credentials. Run relevant targeted tests first, then required API unit/E2E/migration checks and builds, plus web lint/build. Inspect package scripts: API lint includes `--fix`, so do not run that script. Follow repository UI proof instructions: no Playwright; verify 390/1024/1440 viewports, focus, loading, empty, error, conflict, saving and disabled states. Obtain the separate `ux-auditor` pass required by AGENTS.md.

## Completion and handoff

Map AC-01–AC-24 to actual tests/manual evidence. Record commands and results as PASS/FAIL/SKIPPED; skipped E2E or visual review is incomplete verification. Keep EWO, ADR, migration guidance and evidence current. Finish with what works, changed files, migration instructions, checks/evidence, and any specific remaining blocker. Do not claim implementation complete from documentation, mocks or unexecuted tests.

If you hit a genuine unresolved product question, first complete independent authorized work, then ask one focused question with a concrete example and recommended answer. Otherwise persist through implementation and verification.
