# Skills externas de UI/UX

Herramientas de apoyo; no son fuentes de reglas de negocio ni autorización para rediseñar. Instaladas en `.agents/skills/`, sin cambios de dependencias de api/web.

| Skill | Uso | Fuente y revisión |
|---|---|---|
| [Impeccable](../../.agents/skills/impeccable/SKILL.md) | Auditoría y pulido; modo Operate para pantallas operativas | [pbakaus/impeccable](https://github.com/pbakaus/impeccable), `9d715cc4f5564a990ca8345abfdd5df6dc9b41c8`, `plugin/skills/impeccable` |
| [UX Heuristics](../../.agents/skills/ux-heuristics/SKILL.md) | Usabilidad, navegación y formularios | [wondelai/skills](https://github.com/wondelai/skills), `c172996495bed0fcd26896a9416b2093fd7073f0`, `ux-heuristics` |
| [Refactoring UI](../../.agents/skills/refactoring-ui/SKILL.md) | Jerarquía, espaciado y consistencia visual | Misma revisión de Wondel, `refactoring-ui` |
| [Taste](../../.agents/skills/design-taste-frontend/SKILL.md) | Landing pages, portfolios y rediseños solicitados | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill), `c184364c58658b2f131b4ae8bd3d206cabb3deee`, `skills/taste-skill` |

Wondel es una colección: se seleccionaron dos skills pertinentes. Taste v2 es experimental y excluye dashboards, tablas y UI de varios pasos; no cargarla por defecto para Flota, Inventario o el wizard WO.

## Uso y precedencia

1. Leer [AGENTS](../../AGENTS.md), [ICM](../../ICM.md), [sistema UI](README.md) y spec/EWO afectados. Cargar solo la skill pertinente.
2. Preservar [ADR-003](../adr/003-shadcn-tailwind.md), tokens, componentes y lenguaje del producto. Las sugerencias externas de fuentes, animación, librerías o dark mode no autorizan reemplazar el sistema existente.
3. No crear fuentes paralelas PRODUCT.md / DESIGN.md: dirigir a [PRODUCT](../../context/PRODUCT.md) y al índice de diseño. No ejecutar init automáticamente ni copiar hechos a otra documentación.
4. Mantener spec UX → implementación → proof-ui → revisión visual independiente. Una puntuación heurística no prueba aceptación ni reemplaza evidencia. Seguir [verificación](../testing/TESTING_STRATEGY.md); no añadir Playwright ni frameworks por sugerencia externa.

## Instalación y límites

El comando `npx impeccable@4.1.0 install --providers=codex --scope=project --no-hooks --yes` falló con HTTP 404 al verificar el bundle, sin instalar contenido. Se instaló la skill desde el commit oficial indicado mediante el instalador de skills de Codex. No se activaron hooks. El launcher incluido puede descargar el motor cuando se use; no se verificó su ejecución.

Las otras skills se instalaron desde GitHub. El texto de Taste se contrastó con la revisión indicada, normalizando finales de línea. Se conservan licencias upstream. Revisar diffs y actualizar estas revisiones antes de futuras actualizaciones; no actualizar automáticamente. Las restricciones locales viven aquí, sin modificar instrucciones vendorizadas.

Instalación no equivale a rediseño ni a validación runtime. Los agentes que no descubran `.agents/skills/` deben abrir el SKILL.md explícitamente. Referencias a otras skills de las colecciones no implican que estén instaladas.
