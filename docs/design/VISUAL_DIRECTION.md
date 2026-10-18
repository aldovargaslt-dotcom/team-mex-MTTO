# Product visual direction

Team Mex MTTO must feel like a professional industrial operations application rather than a generic SaaS dashboard.

Use MaintainX and the owner-provided Stitch examples as references for visual language, hierarchy and composition; do not copy their UI or infer new product capabilities. The [current visual contract](DESIGN_SYSTEM.md#contrato-visual-vigente--lectura-obligatoria-para-agentes) and approved screen SPEC/UX govern implementation.

## Core principles

1. Operational clarity over visual decoration.
2. Object-first over component-first design.
3. Medium-high information density.
4. Strong status and state semantics.
5. Restrained use of color.
6. Minimal shadows and decorative surfaces.
7. Prefer lists, tables, sections and dividers over unnecessary cards.
8. Keep actions close to the object they affect.
9. Use compact metadata and inline information.
10. Maintain persistent application navigation.
11. Prioritize scanability over whitespace.
12. Design for desktop operational workflows first.
13. Every screen must have a clear primary action.
14. Every screen must communicate its operational state.
15. UI components must serve the domain model, not the opposite.

## Visual characteristics

- White / neutral surfaces
- Thin borders
- Team Mex orange primary action (`#EA7515`), navy structure/text (`#24284D`), neutral filter selection
- Compact controls
- Restrained corner radius
- Minimal shadows
- Strong typography hierarchy
- Semantic status colors
- Compact tables and lists
- Contextual toolbars
- Persistent sidebar navigation

## Avoid

- Generic SaaS dashboard layouts
- Excessive KPI cards
- Excessive rounded cards
- Excessive shadows
- Gradients
- Decorative illustrations
- Excessive whitespace
- Pastel UI without semantic meaning
- Pill-heavy interfaces
- Dribbble-style decorative design
- Component-driven layouts without operational justification

## Operational scan test

Every operational screen must pass the 3-second scan:

- Where am I?
- What am I looking at?
- What requires attention?
- What is the current state?
- What can I do next?

If these cannot be answered quickly, revise the information hierarchy.

## How this sits with the current shell

The [approved sidebar UX](../design-system/ux-supervisor-identidad-sidebar-v1.md) and [module navigation standard](../design-system/ux-sidebar-module-navigation-v1.md) amend the earlier desktop topbar layout for Supervisor/Admin. Keep each role's implemented navigation until its scoped migration is approved. The product CTA remains Team Mex orange under ADR-003 and the current visual contract; the earlier blue-primary instruction is superseded. Status color is semantic; filters remain neutral; lists and dividers carry the layout. Changes to composition require approved SPEC/UX and the repository UI gates; this direction alone does not authorize runtime changes.
