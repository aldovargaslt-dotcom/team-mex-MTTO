# Project Context Map — ICM

## Purpose

This file defines what context agents should load for each workflow stage.
The goal is relevant context, not maximum context.

## Core context

Product:
`context/PRODUCT.md`

Architecture:
`context/ARCHITECTURE.md`

Glossary:
`context/GLOSSARY.md`

Domain:
`domain/`

Specifications:
`docs/specs/`

Architecture decisions:
`docs/decisions/`

Work Orders:
`docs/work-orders/`

Evidence:
`docs/evidence/`

---

## Discovery

Load first:
- `context/PRODUCT.md`;
- `context/GLOSSARY.md` when terminology matters;
- affected domain overview/context;
- relevant accepted decisions;
- current discovery artifact under `workspace/discovery/`.

Load on demand:
- relevant research;
- specific source behavior when current implementation is part of the problem.

Do not load by default:
- entire source tree;
- unrelated WOs;
- old implementation evidence;
- unrelated domains.

---

## Shaping

Load:
- discovery output;
- relevant research;
- product context;
- affected domain context;
- relevant accepted ADRs/specs.

Goal:
choose and record a solution direction, not implementation details.

---

## Domain Analysis

Load:
- glossary;
- affected bounded context;
- directly interacting bounded contexts;
- existing business rules;
- relevant ADRs/specs.

Do not load neighboring domains without an actual dependency.

---

## Specification

Load:
- accepted shaping decision;
- relevant product constraints;
- affected domain model/rules;
- relevant accepted ADRs;
- existing overlapping SPECs.

---

## Architecture / ADR

Load:
- approved/proposed SPEC;
- `context/ARCHITECTURE.md`;
- relevant existing ADRs;
- affected domain contexts;
- implementation constraints necessary to compare alternatives.

---

## Work Order Generation

Load:
- approved SPEC;
- relevant ADRs;
- affected domain context;
- architecture constraints;
- existing related WOs when dependency sequencing matters.

---

## Execution

Load first:
- assigned WO;
- referenced SPEC;
- referenced ADRs;
- affected domain context;
- relevant project rules.

Then use Explorer to identify relevant source and tests.

Avoid loading discovery/research history unless the WO explicitly depends on rationale not captured by accepted artifacts.

---

## Verification

Load:
- WO;
- acceptance criteria;
- relevant SPEC/ADR/domain rules;
- changed files;
- test results;
- implementation evidence.

---

## Escalation

Return above the execution boundary when:
- product behavior is unclear;
- a new domain concept or invariant is required;
- scope must materially expand;
- architecture must materially change;
- an accepted SPEC/ADR conflicts with necessary behavior;
- acceptance criteria conflict.

---

## Project-specific routes

Add domain-specific routes below as the repository grows.

### Example

```text
Maintenance WO
→ load Maintenance context
→ load Fleet context only if unit availability is affected
→ do not load CRM/Shipping/Billing by default
```
