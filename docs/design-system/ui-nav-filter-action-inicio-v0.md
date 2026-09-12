# UI — nav vs filtro vs acción + Inicio cola v0

Estado: aceptado (visual / IA only). Composición en el cliente. **Sin** schema `inicio`, JOINs cruzados ni cambios de ownership (ADR-000 / ADR-002 / ADR-005).

Problema: el usuario entra a un listado de módulos, no a trabajo pendiente. El mismo control (`.subnav`) marca ubicación y filtra listas. Catálogo de inventario (Familias, Proveedores) comparte barra con ops diarias.

Meta: gramática visual de una regla y una puerta de entrada operacional.

## Gramática

| Significante | Trabajo | Dónde |
|--------------|---------|--------|
| **Subrayado** (naranja, sin caja) | Ubicación: dónde estoy | Header primario; `.subnav` de sección |
| **Texto quieto** (peso, no borde ni subrayado naranja) | Filtro de la lista actual | `.list-filter` (Andon, Stock, Notificaciones) |
| **Botón** (fill naranja o borde/outline) | Acción | Editar, Guardar, Cancelar, Nueva visita |

Subrayado ≠ botón. Filtro ≠ sección. El menú hamburger (fondo gris en activo) es drawer, no se unifica a subrayado.

Inicio (`/inicio`) es **cola de excepciones** (exception-based / work queue), no dashboard de gráficas ni el inbox de notificaciones.

- Campanita / `/notificaciones` = evento nuevo (se marca leído; el aviso puede seguir abierto).
- Inicio = estado que sigue sin resolverse.

## Must

1. Un subrayado naranja para ubicación (header + `.subnav`). Filtros de lista usan `.list-filter`, nunca `.subnav`.
2. Inventario diario: Ítems · Stock · Movimientos · Compras. Familias y Proveedores detrás de **Catálogo**.
3. Configuración de tipos/unidades es acción admin en el listado de Unidades, no tab gemelo (ya en esa vista).
4. Tras elegir rol: `/inicio`. Marca y primer ítem de nav = Inicio. `/` sigue siendo el picker de rol.
5. Inicio muestra solo **Requiere atención**: filas clicables con conteo (Andon no resueltos, stock bajo, agotadas, compras pendientes). Vacío: una línea. Composición `GET` existentes; cero API agregada.
6. Un CTA naranja por vista. Inicio no lleva CTA primario naranja (las filas son navegación).

## Don’t

Gráficas; bloque KPI de inventario (125 / 3 / 0); “Próximamente” (no hay odómetro vivo ni umbral de aproximación); feed de actividad en Inicio; promover notificaciones como home; schema o JOIN `andon.*` + `inventario.*`; tabs con caja para ubicación.

## Apply

- Shell: [web/src/components/AppShell.tsx](../../web/src/components/AppShell.tsx)
- Subnav inventario: [web/src/components/InventarioNav.tsx](../../web/src/components/InventarioNav.tsx)
- Filtros: [web/src/components/ListFilter.tsx](../../web/src/components/ListFilter.tsx)
- Cola: [web/src/app/inicio/page.tsx](../../web/src/app/inicio/page.tsx)

Fuera de este corte: umbral de aproximación, listado global de borradores WO, ingest de compras al inbox.
