# Project Bootstrap Checklist

## Existing repository

1. Do not reorganize source code just to fit this methodology.
2. Perform reconnaissance of current behavior and architecture.
3. Fill `context/PRODUCT.md` with current reality.
4. Fill `context/ARCHITECTURE.md` with current architecture, not desired architecture.
5. Seed `context/GLOSSARY.md` with important existing terms.
6. Add only the bounded-context folders that are useful now.
7. Tailor `AGENTS.md`.
8. Tailor `ICM.md`.
9. Point Grok Bot at the repository and state that accepted repository artifacts are authoritative.
10. Run one real change end-to-end before documenting more.

## New repository

1. Define product purpose and constraints.
2. Create minimal glossary/domain context.
3. Record initial architecture decisions only when they are actually decisions.
4. Use discovery/shaping before committing uncertain product behavior.
5. Create the first approved SPEC.
6. Decompose into WOs.
7. Execute through Cursor + independent verification.

## Avoid

- filling templates with speculative text;
- creating unused ADRs;
- creating every possible bounded context upfront;
- loading the whole repo into every session;
- using Grok 4.6 as the default solution to unclear requirements.
