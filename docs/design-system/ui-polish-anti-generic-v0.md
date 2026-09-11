# UI polish — anti-generic v0

Estado: aceptado (visual only)

Problema: el skin shadcn se lee como plantilla AI/SaaS genérica.

Meta: producto de operaciones — WO mobile para Supervisor + listado/ficha denso para Admin.

Stack: shadcn/ui + Tailwind + tokens Team Mex (ADR-003). Dominio / Inventario / ADR-000 / ADR-002 sin cambios.

## Must

1. Densidad↑: padding de página 12–16; gaps de sección 12; filas de tabla/lista ~40px; sin regiones vacías grandes bajo tablas.
2. Superficies: bordes > sombras suaves; radio de card 6–8px máx (no 16).
3. Tipo: H1 de página ≤20–22px; cuerpo 14; meta 12; menos bold decorativo.
4. Naranja SOLO un CTA primario por vista; secundario = outline/ghost navy/borde.
5. Shell: navy más presente; chip de rol más quieto; marca de flota (no letra “R”).
6. WO mobile: primario sticky abajo; H1 = id de unidad (`U-101`) + badge Borrador; subtítulo de contexto de visita.
7. Listas: tablas densas tipo Salesforce; hit de fila completa; evitar una card por ítem salvo piezas WO en mobile.
8. Vacíos: una línea + CTA opcional — sin bloques ilustrados de marketing.

## Don’t

Whitespace de marketing / títulos hero; dos o muchos botones naranja; sombras suaves grandes; radio 16px en todo; overload de pills de consumo.
