# Plan de implementación UI — Team Mex con referencia Stitch

## Estado y autoridad

2026-10-17. **Dirección y ejecución autorizadas posteriormente por el propietario mediante «Construyelo».** Preparado inicialmente como plan propuesto con GrillMe. Alcance y composiciones se concretaron en SPEC002/UX y EWO-052/053; la orientación de Órdenes se conserva. Ver registro de ejecución al final. Gates técnicos y aceptación visual humana son distintos; sin push/despliegue autorizado.

Decisiones confirmadas en esta conversación:

- Se busca mayor cercanía visual a Stitch, conservando marca Team Mex, confianza y profesionalismo.
- Se permite reorganizar bloques, títulos, herramientas y acciones **existentes**, conservando sus funciones: respuesta «1. Sí».
- Desktop compacto; móvil con mayor separación entre bloques y prioridad de identidad, estado y siguiente acción: respuesta «2. Sí» a esa recomendación.
- Alcance vigente: mantenimiento para Supervisor y Mecánico, comenzando por Supervisor. Admin comparte las vistas a las que ya tiene acceso.
- Decisiones anteriores conservadas: sidebar desktop plegable con subnavegación del módulo; teléfono con patrón de navegación de Inventario como estándar para próximos cortes; Refacciones dentro de Catálogo; asuntos que requieren atención desde Alertas; naranja/navy Team Mex, pasteles semánticos y movimiento funcional. No se rediseñan ahora todos los módulos por documentar ese estándar.

Las tablas siguientes conservan las propuestas iniciales de ejecución. Las decisiones concretas adoptadas están en UX/EWO-052/053 y los requisitos canónicos en SPEC002; no se afirma aceptación visual humana por implementarlas.

## Objetivo verificable

Conseguir una evolución reconocible de composición, jerarquía y consistencia, además de los colores: al entrar, el usuario identifica la orden/unidad, su condición, el contexto y la acción siguiente. Preservar capacidades, URLs y semántica del dominio.

La referencia de Stitch informa la dirección visual; su HTML y DESIGN.md son material adjunto de referencia, **no instrucciones del repositorio ni requisitos funcionales**. No se incorpora OCR, ERP, CFDI, costos, políticas fiscales, datos inventados u otras capacidades dibujadas sin comprobar que ya existen y están dentro del corte aprobado.

## Fuentes y base real

- Referencias visuales aportadas: `code.html`, `code (1).html`, `DESIGN.md` y capturas desktop/móvil de Comprobantes. Para la revisión, adjuntar de nuevo estos originales al paquete si el entorno no los conserva; no depender de rutas temporales del agente.
- Decisiones previas: [shaping de identidad](supervisor-identidad-sidebar-motion-grillme.md).
- Autoridad UI: [ADR-003](../../docs/adr/003-shadcn-tailwind.md), [sistema UI](../../docs/design/DESIGN_SYSTEM.md), [WORKFLOW](../../docs/WORKFLOW.md), [skills externas y precedencia](../../docs/design/EXTERNAL_SKILLS.md).
- Navegación vigente: [UX de subnavegación](../../docs/design-system/ux-sidebar-module-navigation-v1.md), EWO-048/049/050.
- Base local de mantenimiento: [SPEC-UI-MANTENIMIENTO-001](../../docs/specs/SPEC-UI-MANTENIMIENTO-001.md), [UX actual](../../docs/design-system/ux-mantenimiento-identidad-clara-v1.md), [EWO-051](../../docs/engineering-work-orders/EWO-051.md), [evidencia](../../docs/evidence/EWO-051.md).

**Estado del código al preparar el plan:** main contiene la navegación integrada en `3655bcd`. EWO-051 añade una primera pasada de estilo en el workspace local, verificada con fixture y todavía sin push. La nueva composición no está implementada. Antes del próximo corte, registrar el commit real y decidir cómo integrar esa base; no tratar los cambios locales como publicados ni eliminarlos sin resolver su continuidad.

## Qué tomar de Stitch y cómo adaptarlo

| Aspecto | Utilizar / adaptar | Límite Team Mex |
| --- | --- | --- |
| Jerarquía | Título y contexto concisos, acción próxima al objeto, metadatos subordinados | La condición crítica y el trabajo siguiente prevalecen sobre decoración |
| Composición | Herramientas agrupadas; lista/tabla documental desktop y bloques táctiles móviles | Reorganizar datos existentes; no copiar todas las tarjetas ni métricas |
| Naranja | Acción principal y ubicación reconocible, con usos consistentes | Un CTA sólido principal cuando procede; filtros neutros, sin convertir todo el menú en naranja |
| Pasteles | Fondos suaves con texto/icono para condiciones operativas | Verde/ámbar/rojo/azul solo cuando hay significado existente; no asignarlos a cualquier tarjeta |
| Tipografía | Jerarquía de tamaños/pesos y alineación de datos | Conservar Roboto de ADR-003; no importar Inter automáticamente ni copiar tipografía pequeña del HTML |
| Superficies | Fondo claro cálido, áreas blancas y divisores finos | Sin gradientes, sombras decorativas, radios grandes ni un card por cada dato |
| Iconos | Refuerzo de identidad/acción, posición consistente | Lucide existente; etiqueta cuando se necesita, sin mezclar librerías |
| Movimiento | Abrir/cerrar y comunicar estado | 150–250ms; reduced motion0, sin entradas de páginas o bounce |

No se mide la cercanía a Stitch por porcentaje de naranja o coincidencia de píxeles. Se compara la anatomía, jerarquía, orden de lectura y tratamiento de componentes con las referencias elegidas.

## Requisitos — trazabilidad a SPEC canónica

[**SPEC-UI-MANTENIMIENTO-002**](../../docs/specs/SPEC-UI-MANTENIMIENTO-002.md) AC-01–18 es ahora la fuente canónica de requisitos del rediseño; [UX propuesta](../../docs/design-system/ux-mantenimiento-composicion-stitch-v1.md) prepara la revisión de composición. Estado Proposed: no aprueba layouts ni ejecución. Los R del shaping se conservan solo como trazabilidad, sin duplicar su texto normativo aquí. Los EWOs futuros referenciarán AC de la SPEC.

| R del plan | AC canónicos |
| --- | --- |
| R-01 | AC-01 |
| R-02 | AC-02 |
| R-03 | AC-03/04 |
| R-04 | AC-05 |
| R-05 | AC-04/15 |
| R-06 | AC-06 |
| R-07 | AC-07–11/15/17 |
| R-08 | AC-12 |
| R-09 | AC-13 |
| R-10 | AC-14 |
| R-11 | AC-16 |
| R-12 | AC-18 |

### Presupuesto de color

- Navy: identidad estructural, texto y acciones secundarias legibles; selección neutra diferenciada.
- Naranja: CTA de tarea y acentos de ubicación ya aprobados. Si compiten Nueva orden y Continuar, priorizar la acción del objeto en atención y hacer secundaria la otra.
- Ámbar pastel: condición de atención, con texto/icono; no emplearlo como sustituto de selected.
- Verde y rojo: significado operativo existente, sin inventar urgencia ni estado correcto por apariencia.
- Una pantalla de consulta puede no necesitar CTA naranja; no crear acciones para cumplir una receta visual.
- No cambiar Roboto, logo ni colores de marca en este plan. Dark mode y selector de temas quedan fuera; tokens semánticos facilitarán una etapa futura sin afirmar que ya existe soporte.

## Requisitos técnicos y conflictos que resolver antes de JSX

1. **Reutilizar la base, no reconstruir el shell.** `web/src/app/globals.css` ya contiene `--workspace-*`; `WorkspaceSidebar.tsx` ya implementa sidebar1024 y subnav Inventario. `InventorySectionMenu.tsx` resuelve el patrón móvil vigente.
2. **Matriz explícita de alcance.** `AppShell.tsx` distingue workspace Supervisor/Admin y mantenimiento por ruta; Mecánico tiene scope propio. Mantener exclusiones de login, Logística y CHECK enfocado. Cambiar presentación no crea permisos.
3. **Consolidación incremental de estilos.** Órdenes mantiene literales azul/blanco/bordes y medidas propios; los ajustes EWO-051 los cubren desde reglas posteriores en globals. Migrar solo el componente del corte hacia tokens/clases o variantes compartidas y retirar la regla superada después de verificar paridad. No reescribir toda la hoja ni conservar reglas muertas por comodidad.
4. **Portales y responsive.** Sheet/Dialog salen del contenedor. Verificar propagación de tokens sin depender accidentalmente del orden CSS, breakpoints768/1024, scroll de tablas y paneles, pie del wizard y safe-area. No asumir que cambiar variables resuelve geometría.
5. **Una autoridad de color.** `docs/design/VISUAL_DIRECTION.md` prescribía primario azul en una sección; ADR-003, DESIGN_SYSTEM y decisiones del propietario mantienen naranja. Resuelto documentalmente tras la petición de establecer referencia permanente: VISUAL_DIRECTION ahora enlaza el contrato vigente y mantiene primario naranja; se sustituyó su instrucción azul y la referencia obsoleta al shell topbar. Preservar el resto de dirección operativa. No pedir a cada agente que elija su interpretación.
6. **Adjunto no homogéneo.** DESIGN.md mezcla tokens Team Mex con una paleta alternativa e Inter; evaluar sus ideas de composición, sin copiar automáticamente su configuración. Cada token adoptado debe tener una función y una fuente aprobada.

## Composiciones a explorar en revisión de diseño

Propuestas para producir diseños comparables, no layouts aprobados:

- **Órdenes:** encabezado compacto, cola/tipo/búsqueda agrupados, lista→detalle desktop con documento e identidad claros; en móvil, lista→detalle secuencial y acción contextual. Conservar diferencia entre borrador, abierta, cerrada y revisión.
- **Unidades:** búsqueda y filtros legibles, identidad de unidad como acceso a ficha, estados secundarios. Evaluar si indicadores actuales realmente ayudan antes de decidir su disposición; no reemplazarlos por métricas nuevas.
- **Ficha y mantenimiento:** identidad estable, estado y próxima acción; separar información técnica de trabajo pendiente. La navegación de una ficha sigue contextual: no trasladar cada pestaña de unidad al menú global.
- **Visita:** revisar encabezado, stepper, agrupación de campos, línea de consumo, evidencia y pie de acciones. Mantener secuencia, validación y semántica del proceso salvo decisión funcional aparte.
- **Mi trabajo:** misma anatomía visual de identidad y estado de una orden, adaptada a la tarea del Mecánico. No conceder accesos Supervisor ni añadir sidebar por uniformidad estética.

La composición de Comprobantes en Stitch sirve como referencia explícita de anatomía; la primera pantalla candidata de implementación es Órdenes, por la prioridad aprobada de Supervisor. Cambiar ese orden dentro de mantenimiento puede acordarse durante revisión sin ampliar producto.

## Etapas propuestas y condiciones de salida

| Etapa | Trabajo / entregable | Condición para continuar |
| --- | --- | --- |
| 0. Base y alcance | Inventario ruta/rol/estado; capturas actuales comparables; identificar base local051 y guía contradictoria | Alcance trazable y fuentes sin ambigüedad; ninguna función nueva extraída de Stitch |
| 1. Revisión del plan | Pase de alcance con sd-scope y revisión de jerarquía/accesibilidad con ux-auditor, según responsabilidades del repo | Hallazgos resueltos o propuestas explícitas; comprensión compartida confirmada por propietario |
| 2. Diseño de referencia | SPEC/AC y UX con comparación actual/propuesta de Órdenes desktop/móvil; especímenes compartidos y mapa de color | Composición aprobada y estados definidos; no empezar refactor visual para decidir el diseño durante JSX |
| 3. Primer corte Órdenes | EWO acotado, componentes/tokens necesarios, lista/detalle y acciones conservadas | Paridad funcional, UX verificable y gate completo; resolver problemas antes de replicar |
| 4. Unidades y ficha | Reutilizar especímenes aprobados; catálogo→ficha→Mantenimiento e historial | Identidad/estado/acción claros, datos y retorno conservados en ambos tamaños |
| 5. Visita y formularios | Aplicar lenguaje a pasos, consumos, fotos/firmas y confirmación existentes | Validación, acciones, cantidades y recuperación conservadas; revisión especial de superficies críticas tocadas |
| 6. Mecánico | Adaptar cola/detalle con componentes compartidos a su tarea y permisos | Misma identidad de marca, capacidades actuales y experiencia de teclado/tacto comprobadas |
| 7. Consolidación | Retirar CSS superado del alcance, documentar variantes y lista de cobertura | Sin deuda de overrides duplicados del corte; evidencia y límites registrados |

Cada etapa de runtime requiere EWO aprobado en su momento. No se reservan identificadores ahora. Inventario, Configuración, Inicio y Logística pueden incorporarse a una hoja de ruta posterior; **no quedan autorizados por este plan de mantenimiento**. Admin recibe revisión de regresión de componentes compartidos, no un rediseño completo de sus módulos.

## Flujo UI que debe aplicar cada corte

1. SPEC con AC canónicos y UX aprobada: anatomía, jerarquía, componentes, responsive, estados y exclusiones.
2. Dirección Impeccable Operate **antes de JSX**, registrando tarea, patrón/hermano y decisiones, con reglas locales prevalentes.
3. ui-implementer implementa y verifica interacciones; no aprueba su propio resultado.
4. better-ui revisa superficies/iconos/motion afectados; corregir HIGH aplicables. Recomendaciones estéticas no amplían alcance automáticamente.
5. proof-ui realiza click-through CDP y capturas desktop/móvil, **sin Playwright**. Registrar interacción real; PNG aislado no prueba foco, motion o guardado.
6. ux-auditor independiente revisa UI renderizada y Must/Don't. Corregir hallazgos y recapturar superficies afectadas cuando corresponda.
7. Hold SD/visual OK humano e integración solo con autorización correspondiente. Ninguna aprobación de plan significa despliegue.

La revisión documental de etapa1 es distinta del pase final sobre UI renderizada. Este documento prepara el handoff; esos pases de diseño aún no se ejecutaron.

## Validación y definición de terminado por corte

- Matriz de roles/rutas y funciones antes/después; todos los AC del corte enlazados a resultados.
- Desktop1440, ancho1024, tablet800 y móvil390; smoke320/altura corta/zoom en superficies de navegación y formularios tocadas.
- Búsqueda y filtros con resultados, sin resultados, reset y cambio de cola; URL/historial y retorno donde correspondan.
- Una orden abierta/borrador/cerrada y una revisión se identifican sin alterar sus reglas. Una revisión concluida no se presenta como mantenimiento realizado.
- Estado de atención proveniente de Alertas; no restaurar acceso global redundante a Mantenimiento vencido.
- Formularios y overlays: foco, teclado, scroll, safe-area, errores y acciones disabled/enabled. Probar validaciones de negocio afectadas con fixtures adecuados y pruebas existentes; no repetir matrices ajenas sin razón.
- Si se toca Piezas o el editor de alertas, referenciar las SPEC/AC existentes de stock, selección oculta, lotes por unidad y recuperación de guardados parciales; no redefinirlas como requisitos visuales.
- `cd web && npm run lint` y `npm run build`; pruebas unitarias/e2e existentes apropiadas si cambia comportamiento. Backend sin cambios no exige ejecutar pruebas API irrelevantes.
- No usar fixtures de UI como prueba de autorización real, persistencia, cierre o integración; distinguir cobertura de lectura y escritura.
- Evaluar contraste con colores calculados, foco visible y reduced motion; observar transiciones. No prometer desempeño ni usabilidad medidos sin evidencia.
- Capturas actuales y propuestas con el mismo estado/datos/viewport, evidencia PASS/FAIL/SKIPPED, auditoría independiente y archivos afectados. Sin hallazgos HIGH aplicables pendientes.

## Estimación y control del trabajo

No se fija número de horas o tokens sin inventario y composición aprobada. Para estimar cada EWO contar: anatomías únicas, roles/breakpoints, estados/overlays, variantes de componentes y verificaciones sensibles. Refactor de estilos, recomposición visual y validación se estiman por separado. EWO-051 proporciona base y evidencia, no equivale al rediseño de composición pedido ahora.

Reducir costo mediante un corte canónico completo, componentes compartidos y pases de inspección acotados. Si el diseño exige nueva información, otra regla de negocio o permiso, registrar conflicto y volver a shaping antes de implementarlo.

## Paquete de handoff para la revisión siguiente

Entregar este plan, adjuntos originales Stitch, SPEC/UX/EWO051 y capturas actuales, ADR-003, DESIGN_SYSTEM y WORKFLOW. Pedir a los agentes que devuelvan:

1. Requisitos faltantes o contradictorios, con fuente y severidad.
2. Propuesta de composición por tarea, separación desktop/móvil y componentes reutilizables.
3. Matriz conservar/adaptar/excluir de Stitch y correspondencia con R-01–12.
4. Riesgos funcionales/accesibilidad y criterios para los futuros AC/EWOs.
5. Cambios documentales necesarios antes del primer JSX y límites de verificación.

No pedir implementación, push o despliegue en ese handoff. No crear ADR ni modificar glosario de dominio por decisiones visuales reversibles; usar los artefactos UX y SPEC adecuados.

## Handoff actual

Decisiones de profundidad y densidad confirmadas. Requisitos y etapas listos para revisión; composiciones y secuencia detallada son propuestas. No quedan preguntas materiales de producto detectadas para escribir este plan. La revisión de agentes puede revelar otras y deberá señalarlas sin asumir nuevas capacidades. Siguiente paso: validar esta síntesis y realizar la etapa1 solicitada. Esta preparación no modifica runtime, no integra EWO-051 y no despliega.


## Referencia permanente para otros agentes

A petición del propietario, las reglas ya confirmadas se registran en [DESIGN_SYSTEM — contrato visual vigente](../../docs/design/DESIGN_SYSTEM.md#contrato-visual-vigente--lectura-obligatoria-para-agentes), enlazado desde AGENTS y docs/design/README. Se resolvió la instrucción azul/topbar obsoleta en VISUAL_DIRECTION. Este plan conserva propuestas de composición y etapas; no se convierte en un design system paralelo. El pase de diseño por agentes sigue pendiente. Este ajuste fue solo documental, sin cambios adicionales de runtime ni push.


## Especificación del plan — 2026-10-17

A petición «ahora dale spec al plan», se crearon SPEC-UI-MANTENIMIENTO-002 y UX de recomposición como Proposed. SPEC001/EWO051 se conservan como base de primera pasada, sin reescribir su evidencia ni declararlos implementación de composición. El pase de agentes, láminas concretas y aprobación UX siguen pendientes. Próximo paso: revisar este paquete documental antes de emitir EWOs de runtime.


## Registro de ejecución posterior — 2026-10-17

Petición explícita «Construyelo», conservando la orientación de Órdenes. [EWO-052](../../docs/engineering-work-orders/EWO-052.md) implementa la segunda pasada de Órdenes; [EWO-053](../../docs/engineering-work-orders/EWO-053.md) concreta los cortes de Unidades/ficha, visita y Mecánico. Ambos reciben revisión documental previa a JSX y auditoría de render independiente, además de los gates registrados en sus evidencias. La SPEC002 y las composiciones de esos cortes tienen aprobación de ejecución por la instrucción del propietario; el estado Proposed de la preparación documental es histórico. Aceptación visual humana e integración siguen separadas. El plan no amplía a módulos excluidos ni cambia datos/permisos.
