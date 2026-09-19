# Project Agent Rules

## Project

Name: [PROJECT NAME]

Purpose: [ONE-SENTENCE PRODUCT PURPOSE]

## Global methodology

This repository follows the global AI Engineering System:
- SDD;
- DDD where domain semantics are affected;
- ADRs for consequential architecture decisions;
- TDD for testable behavior;
- ICM for context routing;
- Work Orders for non-trivial execution;
- independent verification before closure.

## Project sources of truth

Product context:
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

Context routing:
`ICM.md`

## Rules

1. Use terminology from `context/GLOSSARY.md` and relevant domain context.
2. Respect accepted SPECs and ADRs.
3. Do not introduce or redefine business concepts silently.
4. Non-trivial implementation must reference an approved Work Order.
5. Do not silently alter architecture.
6. Do not expand WO scope without escalation.
7. If implementation conflicts with an accepted artifact, stop and report the conflict.
8. Repository artifacts are authoritative over conversational/agent memory.

## Project-specific constraints

- [ADD CONSTRAINT]
- [ADD CONSTRAINT]

## Stack

- Backend: [STACK]
- Frontend: [STACK]
- Database: [STACK]
- Infrastructure: [STACK]
