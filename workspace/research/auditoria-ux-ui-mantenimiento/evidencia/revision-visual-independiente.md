# Pase visual independiente

Revisor: subagente `ux-auditor`, sólo lectura, según AGENTS.md y docs/design/VISUAL_QA.md. No fue implementer; no editó archivos de producto. Inspeccionó realmente con view_image E02/E03/E06/E09/E15/E16/E20/E22 y sus JSON de controles.

**Veredicto: no OK para los estados observados. Sin aprobación global del módulo.**

| Hallazgo del pase | Evidencia | Confianza / prioridad del pase |
|---|---|---|
| Error y vacío/0 simultáneos | Órdenes E03/E15, Nueva orden E06/E16, Consumo E09 | Alta / P1 |
| Errores de Inicio partidos palabra por línea en columna estrecha | E02 | Alta / P1 |
| Recuperación desigual, texto sin control vs Reintentar | E02/E03/E06/E09 comparados con E20/E22 | Alta / P2 |
| CTA texto blanco sobre naranja 14px, contraste 2.98:1 | E03/E15 y JSON; cálculo independiente coincide con E29 | Alta / P2 |
| Gramática de selección azul de Órdenes frente a filtros navy | E03/E15 comparados con E09 | Media / P2, semántica pendiente |

Las prioridades finales del backlog no son una copia automática de ese pase: contraste entra como candidato P1 por componente compartido y selección queda P3 mientras se define su semántica. La severidad y confianza están completas en [hallazgos](../hallazgos.md).

Referencias locales leídas por el revisor: VISUAL_QA, PAGE_PATTERNS §10, VISUAL_HIERARCHY, DESIGN_SYSTEM, UI_ANTI_PATTERNS, OPERATE_CRAFT, brief anti-generic Must 1/8, nav/filter/Inicio Gramática/Must 1–3 y criterios de proof-ui. La adenda histórica de skeletons está propuesta, no requerida.

Recomendaciones del pase: distinguir error/vacío/datos, permitir ancho de texto en Inicio, habilitar recuperación explícita, resolver contraste con tokens existentes y aclarar navegación/filtro antes de consolidar. Son propuestas, sin implementación.

Límites explicitados: 503 del entorno local, no prueba de producción caída; CHECK sólo pantalla de error; sin captura/cierre/usuarios/historia real/lector de pantalla. E16 controles principales y Cerrar miden 44px, por lo que no se atribuye un defecto táctil allí. El indicador N de Next es artefacto del entorno. No se aprobaron pantallas o estados sin captura.
