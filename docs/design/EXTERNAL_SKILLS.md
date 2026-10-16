# Skills externas de UI/UX

Herramientas de apoyo; no son fuentes de reglas de negocio ni autorización para rediseñar. Instaladas en `.agents/skills/`, sin cambios de dependencias de api/web.

| Skill | Uso | Fuente y revisión |
|---|---|---|
| [better-ui](../../.agents/skills/better-ui/SKILL.md) | Gate estándar de revisión y pulido tras implementar; no generador de pantallas | [jakubkrehel/skills](https://github.com/jakubkrehel/skills), `skills/better-ui`; hash del instalador `6f69968c0d1ed034753d64aa22f2bf4332f1471164f110db720d05faf76c3551` |
| [Impeccable](../../.agents/skills/impeccable/SKILL.md) | Pase estándar Operate antes de generar UI de tarea; auditoría/pulido adicional opcional | [pbakaus/impeccable](https://github.com/pbakaus/impeccable), `9d715cc4f5564a990ca8345abfdd5df6dc9b41c8`, `plugin/skills/impeccable` |
| [UX Heuristics](../../.agents/skills/ux-heuristics/SKILL.md) | Usabilidad, navegación y formularios | [wondelai/skills](https://github.com/wondelai/skills), `c172996495bed0fcd26896a9416b2093fd7073f0`, `ux-heuristics` |
| [Refactoring UI](../../.agents/skills/refactoring-ui/SKILL.md) | Jerarquía, espaciado y consistencia visual | Misma revisión de Wondel, `refactoring-ui` |
| [Taste](../../.agents/skills/design-taste-frontend/SKILL.md) | Landing pages, portfolios y rediseños solicitados | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill), `c184364c58658b2f131b4ae8bd3d206cabb3deee`, `skills/taste-skill` |

Wondel es una colección: se seleccionaron dos skills pertinentes. Taste v2 es experimental y excluye dashboards, tablas y UI de varios pasos; no cargarla por defecto para Flota, Inventario o el wizard WO.

## Uso y precedencia

1. Leer [AGENTS](../../AGENTS.md), [ICM](../../ICM.md), [sistema UI](README.md) y spec/EWO afectados. Cargar solo la skill pertinente.
2. Preservar [ADR-003](../adr/003-shadcn-tailwind.md), tokens, componentes y lenguaje del producto. Las sugerencias externas de fuentes, animación, librerías o dark mode no autorizan reemplazar el sistema existente.
3. No crear fuentes paralelas PRODUCT.md / DESIGN.md: dirigir a [PRODUCT](../../context/PRODUCT.md) y al índice de diseño. No ejecutar init automáticamente ni copiar hechos a otra documentación.
4. Mantener spec UX → Impeccable Operate → implementación → better-ui y correcciones → proof-ui → revisión visual independiente. Una puntuación heurística no prueba aceptación ni reemplaza evidencia. Seguir [verificación](../testing/TESTING_STRATEGY.md); no añadir Playwright ni frameworks por sugerencia externa.

## Impeccable Operate — estándar antes de generar UI

Para pantallas operativas nuevas y cambios visuales, de layout, jerarquía, acciones o estados, usar Operate antes de escribir JSX. Abrir [SKILL.md](../../.agents/skills/impeccable/SKILL.md), [Operate](../../.agents/skills/impeccable/reference/operate.md) y [OPERATE_CRAFT](OPERATE_CRAFT.md). Leer `reference/craft-floor.md` inmediatamente antes de editar UI; cargar otras referencias solo cuando sean pertinentes. Copy aislado sin impacto visual/interactivo: registrar no aplicable, sin pase completo.

1. Partir de la spec UX aprobada, la tarea/rol, el patrón y hermano existentes. Inspeccionar la superficie actual y sus primitivas; para una pantalla nueva, inspeccionar el hermano. No reabrir decisiones de producto aprobadas.
2. Antes de implementar, dejar una nota breve en la spec UX/EWO existente o en el resumen de implementación: tarea y siguiente acción, jerarquía P0–P3, patrón/hermano y componentes reutilizados, densidad/responsive y estados aplicables (loading, empty, error, focus, disabled, overlays). Usar esos criterios para construir el primer paint, no solo para criticarlo al final.
3. Priorizar escaneabilidad, consistencia, controles familiares, español de taller y estados completos. ADR-003, briefs, tokens y reglas locales prevalecen sobre recetas upstream: conservar Roboto, paleta, radios, loading/empty locales y motion funcional. No introducir skeletons, nuevas tipografías, sombras ni coreografías por defecto.
4. Este es el modo estándar de generación de UI de tarea, no un hook global ni permiso de rediseño. No ejecutar `init`, `document`, instalar hooks ni crear PRODUCT.md / DESIGN.md paralelos; usar `context/PRODUCT.md` y `docs/design/`. El launcher no es requisito de aceptación: si no está disponible, usar el contexto local y registrar el límite.
5. Tras implementar, comprobar interacciones y continuar con better-ui → correcciones → proof-ui → ux-auditor independiente. Reutilizar esos pases para inspección y confirmación; evitar bucles adicionales de pulido. Impeccable no autoaprueba el resultado ni sustituye evidencia.

## better-ui — gate estándar de pulido

Para cambios de UI, abrir [la skill](../../.agents/skills/better-ui/SKILL.md) después de implementar y verificar las interacciones. Revisar solo superficies, iconos y motion afectados; un cambio de copy sin impacto en esas áreas se registra como no aplicable. No usarla como generador ni ampliar el alcance para pulir pantallas ajenas.

- Prevalecen ADR-003, tokens, briefs y [OPERATE_CRAFT](OPERATE_CRAFT.md). Sus convenciones deliberadas no son hallazgos: no añadir sombras, escala de botones, entradas coreografiadas ni nuevos radios para satisfacer recetas upstream. En reduced motion, conservar la regla local de duración 0 o sin animación; no exigir cross-fade.
- Registrar hallazgos por causa con severidad, `archivo:línea`, antes/después y motivo. Un `HIGH` aplicable por interacción rota o accesibilidad bloquea; corregir y volver a verificar. `MEDIUM`/`LOW` de pulido son recomendaciones y pueden quedar documentados. Ninguna receta estética externa crea por sí sola un bloqueo.
- Cerrar con `Block` si queda un `HIGH` aplicable, `Approve` solo para la cobertura inspeccionada, o «No actionable UI-polish findings» con verificación. Checks no ejecutados: `Not verified`; no equivalen a aprobación completa.
- Aplicar correcciones antes de `proof-ui`. Verificar los estados afectados (hover, focus, pressed, disabled, loading, overlays y reduced motion cuando correspondan); capturar de nuevo tras cambios posteriores. Screenshots estáticos no prueban motion.
- Mantener `proof-ui` y el pase independiente `ux-auditor`: el veredicto de better-ui no sustituye aceptación funcional ni Visual QA. En evidencia/PR, enlazar hallazgos, correcciones, pendientes y límites de verificación.

La copia instalada inicialmente en `/workspace/.agents/skills/better-ui` se incorpora a `.agents/skills/better-ui` del repositorio con sus referencias, sin modificar instrucciones upstream. No requiere instalar las skills hermanas mencionadas por upstream ni activa hooks.

## Instalación y límites

El comando `npx impeccable@4.1.0 install --providers=codex --scope=project --no-hooks --yes` falló con HTTP 404 al verificar el bundle, sin instalar contenido. Se instaló la skill desde el commit oficial indicado mediante el instalador de skills de Codex. No se activaron hooks. El launcher incluido puede descargar el motor cuando se use; no se verificó su ejecución.

Las otras skills se instalaron desde GitHub. El texto de Taste se contrastó con la revisión indicada, normalizando finales de línea. Se conservan licencias upstream. Revisar diffs y actualizar estas revisiones antes de futuras actualizaciones; no actualizar automáticamente. Las restricciones locales viven aquí, sin modificar instrucciones vendorizadas.

Instalación no equivale a rediseño ni a validación runtime. Los agentes que no descubran `.agents/skills/` deben abrir el SKILL.md explícitamente. Referencias a otras skills de las colecciones no implican que estén instaladas.
