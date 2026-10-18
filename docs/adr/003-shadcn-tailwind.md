# ADR-003 — shadcn/ui + Tailwind, tokens Team Mex

Estado: aceptado (v0)

El cliente web usa un **design system de aplicación completa** (no un restyle de Inventario):

- **shadcn/ui + Tailwind** como base de UI
- Tokens: navy `#24284D`, naranja `#EA7515` (un CTA primario por vista), superficies `#F3F3F3` / blanco, tipografía **Roboto**. Pasteles semánticos: [ui-semantic-button-pastels-v0](../design-system/ui-semantic-button-pastels-v0.md)
- Tablas densas: **TanStack Table + shadcn Table**
- Sin Mantine

## North star

- **Supervisor:** mobile work-order / field-service first (CTAs grandes, Piezas / Pendientes / evidencia).
- **Admin:** listado → ficha más denso (estilo Salesforce liviano).

El mismo shell, botones, inputs y tablas se comparten en Unidades, Visitas, Inventario y Andon.

## Rollout incremental

1. Tokens / CSS vars + primitivas shadcn en toda la app
2. App shell (nav, chip de rol) compartido
3. Forms / buttons / inputs compartidos
4. Tablas TanStack + shadcn en listados que se tocan
5. Superficie Inventario + Piezas/Pendientes como primer feature sobre ese DS
6. Andon list + hub card + umbrales por tipo

Fuera: multi-almacén, OC formal, reabrir dominio.

## Enmienda visual — 2026-10-18

Solicitud explícita del usuario: sidebar y diseño actualizado. [EWO-057](../engineering-work-orders/EWO-057.md)
autoriza navegación persistente compartida en escritorio y Sheet móvil, conservando
rutas y permisos. La dirección operacional usa navy existente para acción azul;
se conservan Roboto, superficies neutras, semántica de estado y primitivas. Este
incremento sustituye el shell de navegación superior; no introduce un kit nuevo.

## Cierre del estándar de sidebar — 2026-10-18

Usuario aprueba sidebar nueva como estándar compartido para evitar retrabajos.
[APPLICATION_NAVIGATION](../design/APPLICATION_NAVIGATION.md) fija composición,
catálogo único, estados y responsive. EWO061 retira selección por módulo y mueve
estados del menú a workspace.css. Cambios posteriores deben modificar ese contrato,
no crear sidebars paralelas. Integración/main y deploy no se afirman desde un cambio local.
