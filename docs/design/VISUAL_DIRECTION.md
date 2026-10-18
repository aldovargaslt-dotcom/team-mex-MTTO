# Product visual direction

Team Mex MTTO must feel like a professional industrial operations application rather than a generic SaaS dashboard.

Use MaintainX as a reference for visual language and interaction patterns, but do not copy its UI literally.

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
- Blue primary interaction color
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

The owner explicitly requested the sidebar and updated design on 2026-10-18.
[EWO-057](../engineering-work-orders/EWO-057.md) implements the shared persistent
desktop sidebar, contextual topbar and mobile navigation Sheet. ADR-003 records
the amendment. Primary actions use existing navy blue with white text; orange
remains the brand/location accent. Shared primitives apply the same action color
inside portals. Status remains semantic; lists and dividers carry the layout.

## Navigation standard confirmed —2026-10-18

The owner approved the new sidebar as the shared standard across modules.
[Application navigation](APPLICATION_NAVIGATION.md) is canonical; no per-feature
sidebar variants. EWO061 removes the Unidades-only selected-state override and
centralizes desktop/mobile/bottom-link identity in one catalog.
