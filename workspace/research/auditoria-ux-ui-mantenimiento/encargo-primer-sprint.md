# Encargo para el agente — primer sprint de mantenimiento

Este archivo entrega el contexto y una propuesta concreta de alcance al agente de implementación. La auditoría no aprueba cambios de producto ni sustituye la SPEC/EWO aprobados que exige AGENTS.md. Las decisiones de firma, comprobantes y reglas de cálculo siguen donde las registra el backlog.

## Instrucción para copiar al agente

Prepara y ejecuta, una vez aprobado su alcance, el primer sprint de mejora UX/UI de mantenimiento de Team Mex MTTO.

### Contexto y preparación

1. Lee primero AGENTS.md e ICM.md y carga sólo el contexto necesario.
2. Lee en esta carpeta README.md, informe.md, hallazgos.md, backlog-y-cierre.md, matriz-cobertura.md y fichas-pantallas-flujos.md. Consulta evidencia y mapas según el cambio afectado.
3. Fija commit, entorno, datos y dispositivos actuales. La auditoría evaluó el checkout `39ce14db9b287ad46074900e8028b1a127cd166c`; el usuario declaró ese commit como fuente del despliegue público. Si la versión cambió, reproduce los hallazgos pertinentes antes de corregirlos. No confundas el commit del plan con el del producto.
4. Revisa la SPEC/EWO aprobados existentes. Si no cubren el trabajo, prepara una propuesta concreta con alcance, solución, dependencias, criterios y esfuerzo revisado. Entrega ese paquete listo para revisión antes de solicitar aprobación; continúa el diagnóstico independiente mientras se resuelven decisiones. No inventes una SPEC aprobada ni un EWO autorizado.

### Objetivo y alcance prioritario propuesto

Mejorar los recorridos actuales: encontrar → reanudar → capturar → revisar → cerrar → reconstruir mantenimiento y sus consumos/evidencia.

| Trabajo | Resultado esperado |
|---|---|
| H01 / B10 — disponibilidad fiel | Distinguir carga, datos, vacío real, error y resultado parcial. Consulta fallida no muestra cero o «No hay»; relación cargando no afirma «Sin piezas». |
| H02 / B11 — Inicio legible | Mensajes de error ocupan la región de texto; filas normales conservan jerarquía en desktop y móvil. |
| H04 / B13 — contraste | Texto normal de acciones ≥4.5:1, con estados/foco adecuados, conservando navy, naranja y Roboto. No extrapolar aprobación a controles no revisados. |
| H10 / B16b — vacío filtrado | Cero coincidencias se distingue de ausencia global; quitar filtros recupera resultados y no promueve duplicar una orden. |
| H12 / B16a — cierre accesible | Proponer una vía equivalente operable por teclado para ambas firmas, preservando el requisito y su significado. Añadir tabindex al canvas no basta. Implementar la vía sólo tras resolver D-A04 y aprobar el alcance correspondiente. |

Recovery, foco, navegación por rol y jerarquía de acciones de fila pueden incorporarse si apoyan estos recorridos y quedan expresamente dentro del alcance aprobado. No convertir todo el backlog en un compromiso de sprint.

### Decisiones y límites

- Para H11, diagnostica las referencias a visitas que devuelven 404 y muestra claramente su disponibilidad. No reconstruyas historia ni corrijas datos sin autorización; un enlace a un 404 no resuelve trazabilidad.
- No cambies el significado de RECIBIDA, la obligatoriedad del ticket ni la regla de mantenimiento preventivo por interpretación propia. Usa D-A08/D-A09 para registrar las decisiones requeridas.
- No otorgues permisos nuevos al Mecánico ni deduzcas sus tareas de un enum o de la bandeja CHECK. La cuenta de auditoría era multirol; sus resultados no prueban permisos de cuentas puras.
- Usa SAP/Fiori como referencia visual, de componentes y trazabilidad; conserva los flujos y componentes adecuados de Team Mex. Carbon/Material son complementarios y Taste no bloquea.
- CHECK, nuevas capacidades del Mecánico, Logística, nuevos indicadores, captura histórica, migraciones, cambios de permisos y refactors ajenos quedan fuera de este encargo propuesto.
- Skeletons, transiciones y animaciones tienen prioridad diferida. La fidelidad del estado y el acceso a un requisito obligatorio son trabajos actuales, no animaciones.
- En la instancia pública, las escrituras de prueba se limitan a registros nuevos identificados como prueba; no tocar registros existentes. La autorización anterior no incluye cambios de configuración, seed, migración ni despliegue. No copies credenciales a código, documentación o evidencia.
- Los registros `AUD-UX-20261011-*`, imágenes y trazos de la auditoría son sintéticos. Consulta sus IDs en continuacion-publica.md; no los uses como historia real, firma humana ni indicador operativo.

### Verificación y entrega

1. Reproduce los casos del alcance y conserva evidencia inicial. Comprueba desktop/móvil, teclado, foco, contraste y estados de datos, vacío, filtro, carga, error/parcial y recuperación pertinentes.
2. Recorre con casos propios el guardado/reanudación, stock suficiente/insuficiente, compra externa, evidencia, firmas, cierre y consulta posterior; verifica persistencia y relaciones unidad → visita → trabajos → consumos/evidencia. Comprueba las regresiones pertinentes sin fingir cobertura de ramas no ejecutadas.
3. Sigue las verificaciones de AGENTS.md: pruebas pertinentes, proof-ui y pase independiente de ux-auditor; sin Playwright. Una prueba omitida se registra como SKIPPED, nunca PASS.
4. Entrega cambios revisables, evidencia antes/después, criterios por hallazgo y resultados PASS/FAIL/SKIPPED, con pendientes y riesgos concretos. Si creas un PR, su descripción debe explicar el comportamiento final y la validación; no hagas merge ni despliegue sin autorización.
5. Separa verificación funcional, revisión experta y pruebas con usuarios. No declares aceptación UX humana si no hubo usuarios; conserva las condiciones de cierre de backlog-y-cierre.md.

## Archivos de entrada

- [Índice de auditoría](README.md)
- [Informe y baseline](informe.md)
- [Hallazgos y criterios](hallazgos.md)
- [Backlog, decisiones y cierre](backlog-y-cierre.md)
- [Matriz de cobertura](matriz-cobertura.md)
- [Fichas de pantallas y flujos](fichas-pantallas-flujos.md)
- [Ejecución y registros sintéticos](continuacion-publica.md)
- [Evidencia](evidencia/README.md)

La fuente fijada del plan, cuando el checkout no contenga el archivo de shaping, está en [la copia íntegra E44](evidencia/E44-plan-7b149ca.txt), con [origen verificable](evidencia/E44-plan-origen.json). No hace falta recuperar toda la rama del plan para interpretar esta auditoría.
