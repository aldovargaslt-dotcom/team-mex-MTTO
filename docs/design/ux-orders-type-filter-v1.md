# UX/SPEC — tipos de OT en Órdenes

Aprobado2026-10-12: usuario solicita Correctivo/Preventivo/Revisión y confirma
consulta de CHECK para Supervisor. Revisión=CHECK; Preventivo=PREVENTIVE
(legacy PREDICTIVO); Correctivo=CORRECTIVE (legacy CORRECTIVO).

Hermano: /ordenes listado/detalle actual. No aplicar el mockup ilustrativo completo.
Conservar búsqueda, alta de mantenimiento, selección responsive, tokens y roles.
Filtro: Todos/Correctivo/Preventivo/Revisión. Texto «Tipo de orden», con selección
visible. Todos incluye los tres tipos sin duplicados. Legacylinks de tipo intactos.

Revisiones leen GET /checks con cursor y scope de patio. Detalle consultable en
Órdenes usa GET /checks/:id, sin captura, firma, asignación ni creación de CHECK.
Mostrar unidad, estado real, origen, fecha operativa, dictamen y vigencia cuando
estén disponibles. No inferir revisión apta de estar concluida.

Colas: Todos «Abiertas/Cerradas»; mantenimiento «Borradores/Cerradas»; Revisión
«En curso/Concluidas». CHECK activo=PENDING/ASSIGNED/IN_PROGRESS; concluido=COMPLETED;
CANCELLED no es concluido. Sin convertir CHECK a BORRADOR/CERRADO ni emitir eventos.
Admin mantiene cola cerrada existente. Supervisor consulta dentro de su patio.

AC01 los tres tipos filtran registros reales, Todos sin duplicación;
AC02 Supervisor lee lista/detalle autorizado y no puede mutar CHECK ni leer otro patio;
AC03 paginación/error parcial/carga/vacío explícitos;
AC04 mobile/desktop menú y detalle sin recorte, consulta sin CTA de ejecución;
AC05 API tests/build, web lint/build, CDP y revisión independiente.

Corrección QA: menú inline anterior se recorta por overflow del listado. Selector
de tipo usa Dialog/portal existente, cuatro opciones44px, selección neutral y
texto «Tipo: …» persistente. No dependencia nueva ni menú dentro de tabla.
