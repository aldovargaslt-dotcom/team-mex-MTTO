# ADR-003 — shadcn/ui + Tailwind, tokens Team Mex

Estado: aceptado (v0)

El cliente web usa un **design system de aplicación completa** (no un restyle de Inventario):

- **shadcn/ui + Tailwind** como base de UI
- Tokens: navy `#24284D`, naranja `#EA7515`, superficies `#F3F3F3` / blanco, tipografía **Roboto**
- Tablas densas: **TanStack Table + shadcn Table**
- Sin Mantine

## North star

- **Supervisor:** mobile work-order / field-service first (CTAs grandes, Piezas / Pendientes / evidencia).
- **Admin:** listado → ficha más denso (estilo Salesforce liviano).

El mismo shell, botones, inputs y tablas se comparten en Unidades, Visitas, Inventario (y Andon cuando exista).

## Rollout incremental

1. Tokens / CSS vars + primitivas shadcn en toda la app
2. App shell (nav, chip de rol) compartido
3. Forms / buttons / inputs compartidos
4. Tablas TanStack + shadcn en listados que se tocan
5. Superficie Inventario + Piezas/Pendientes como primer feature sobre ese DS

Fuera: Andon, multi-almacén, OC formal, reabrir dominio.
