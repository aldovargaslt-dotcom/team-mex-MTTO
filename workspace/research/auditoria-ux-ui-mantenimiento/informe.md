# Informe de auditoría UX/UI — mantenimiento

## Resultado y método

El Supervisor pudo completar mantenimiento tradicional en la instancia pública con registros nuevos autorizados. Tres visitas cerradas conservan unidad, trabajos, piezas y trazos de firma; una incluye imagen sintética. La salida desde stock y las compras externas produjeron los efectos previstos que se comprobaron por UI y GET posteriores. Esto acredita esos casos funcionales, no aceptación UX global, garantía transaccional bajo concurrencia ni validación humana.

El Mecánico dispone de selección de perfil y bandeja «Mi trabajo» de CHECK, que cargó correctamente sin tareas. No se observó un recorrido suyo de mantenimiento tradicional, ni claim/inicio/captura/cierre CHECK. Las responsabilidades de personas reales y la equivalencia organizacional entre «Supervisor» y supervisor de mantenimiento siguen pendientes.

Se leyeron AGENTS.md e ICM.md antes de cargar contexto. Se limitaron las fuentes a producto/glosario, mantenimiento, la costura de inventario, auth/roles, rutas y criterios visuales relevantes. El plan se recuperó y leyó íntegro en la referencia facilitada, sin cambiar el checkout. Primero se preparó la matriz local; antes de navegar autenticado se preparó otra matriz pública. [Preparación y ejecución](continuacion-publica.md), [primera sesión local](sesion-1-local.md) y [matriz inicial](matriz-sesion-1.md) conservan la cronología.

Se separan tres métodos:

- **Revisión experta:** heurísticas, lectura de pantallas, contraste, foco, semántica y consistencia; dos pases independientes de ux-auditor exigidos por AGENTS. No hubo usuarios.
- **Verificación funcional:** clics y entradas mediante Chrome DevTools Protocol, sin Playwright; capturas PNG, DOM/red y GET de fuentes; escrituras sólo en fixtures nuevos. No se usó API directa para sustituir la captura UI.
- **Pruebas con usuarios:** no realizadas; sin tiempos, tasas de éxito, comprensión, ayuda, esfuerzo cognitivo ni frecuencias operativas medidos.

## Versión, entorno, datos y dispositivos

| Variable | Baseline y límite |
|---|---|
| Fecha | 11 de octubre de 2026 UTC en registros técnicos; el entorno también usó America/Los_Angeles. La UI pública capturada muestra horas que coinciden con UTC del navegador; no se acredita zona operativa de México ni se cambia configuración |
| Checkout | `/workspace/team-mex-MTTO`, rama `work`, HEAD `39ce14db9b287ad46074900e8028b1a127cd166c` |
| Plan | Commit `7b149ca82a6cb8005797b956ad53ad224563b5fb`, blob `15e944c2f0cc34fc970becd130651818e55dbebd`, E44; versión distinta de producto |
| Instancia principal | `https://team-mex-mtto-eight.vercel.app/`; usuario declara main/39ce14d y despliegue inmutable `team-mex-mtto-g0g23ma5r-aldovargaslt-dotcoms-projects.vercel.app`. No se evaluaron las otras URLs ni se obtuvo SHA de runtime independiente |
| Acceso | OIDC/Auth0, cuenta de auditoría multirol: ADMIN_DIRECTIVO/SUPERVISOR/LOGISTICA/MECANICO; un ámbito de patio, TRUSTED/SERVER_VERIFIED según sesión sanitizada E96. Roles UI elegidos Supervisor/Mecánico; Admin sólo preparó unidad/SKU/entrada nuevos |
| API pública | Lecturas y escrituras accesibles por `/backend`; respuestas registradas sin headers, cookies, tokens ni cuerpos sensibles. No acceso SQL público ni revisión de toda su base |
| Datos públicos antes de pruebas | 13 unidades activas, 3 borradores y 2 órdenes cerradas; 3 SKU con stock 10/5/2; 2 pendientes externos por 4/11 piezas. Son registros existentes observados, de representatividad desconocida; una visita se identifica como semilla |
| Datos creados | Una unidad, un SKU, entrada de 2 piezas, tres visitas cerradas, salida de 1 pieza, dos compras externas por 3/1 piezas y dos comprobantes. Identificadores y autorización en continuación pública; agregados posteriores contienen estas pruebas |
| Local anterior | Next.js development con API ausente, base existente consultada READ ONLY. Backend no iniciado por sus acciones automáticas de schema/seed/synchronize. E01–E43 son esa sesión, no caída pública ni datos públicos |
| Navegador | Chromium 151.0.7922.173, Debian Linux, headless/CDP. Desktop 1440×900, móvil virtual 390×844; 1024×768 sólo sesión local; 320×844 sólo reflow de Inicio público |
| Tipografía | E146 acredita Roboto-Regular como fuente efectivamente renderizada en h1 público. El fallback de Roboto E43 pertenece a sesión local; no se atribuye a producción |
| Dispositivos pendientes | Teléfono/tablet físicos, cámara real, guantes, teclado móvil, zoom 200–400%, lector de pantalla y tecnologías asistivas |
| Confianza TLS | CA existentes del entorno acotadas a dominios de app/Auth0 y perfil temporal. No se desactivó TLS. La revisión automática rechazó alterar NSS persistente; no se ejecutó. Alternativa temporal eliminada al terminar junto con cookies/perfil; navegador cerrado |

El usuario autorizó expresamente «Crear y modificar registros nuevos identificados como prueba; no tocar registros existentes». No hubo escrituras dirigidas a unidades, visitas, stock, pendientes, alertas ni configuración preexistentes. Catálogos y chofer existente se referenciaron sin modificarlos. Los tres stocks previos conservaron cantidades 10/5/2 y los dos pendientes previos conservaron estado/cantidad/sin ticket en E140; eso no es una auditoría de integridad general ni de acciones concurrentes de terceros.

## Perfiles: tareas, responsabilidades, permisos y capacidad comprobada

| Perfil / tarea | Código actual y observación pública | Estado y responsabilidad pendiente |
|---|---|---|
| Supervisor: encontrar/priorizar unidad u orden | Inicio, Órdenes, Unidades, Inventario; acceso a mantenimiento vencido desde menú. E51–E89 presentan datos, colas, filtros y unidades | Consulta disponible. Prioridades, lenguaje y responsabilidad diaria deben confirmarse con personas |
| Supervisor: crear/capturar/reanudar/cerrar mantenimiento | `VisitasController` exige SUPERVISOR para escrituras legacy; selección UI Supervisor completó tres casos. Datos/trabajos/notas/fotos/piezas/firmas/confirmación recorridos | Capacidad comprobada para cuenta multirol seleccionando Supervisor. No prueba autorización de cuenta SUPERVISOR pura, concurrencia ni recuperación de escritura fallida |
| Supervisor: consumo/comprobante | UI/cliente y controlador admiten Supervisor; stock suficiente, bloqueo insuficiente, compra externa, adjunto y cierre ejecutados en datos nuevos | GET posterior y UI reconcilian efectos. Cerrar comprobante no exige ticket en caso observado; no decidir aquí que deba exigirlo |
| Supervisor: Andon/Enterado | Aviso FOTON visible y marcado Enterado antes de auditoría; sigue activo; lectura y destinos recorridos | No se pulsó Enterado ni se cerró visita de FOTON. Resolución de aviso existente no probada. Los fixtures no tenían avisos que resolver |
| Supervisor: umbrales | Decorator actual admite Supervisor/Admin; README dice 403 para Supervisor | Ni forma ni PATCH probados. Responsable de negocio y permiso efectivo puro pendientes; no cambiar permisos |
| Supervisor: alertas | Badge 2, dos filas y destino observados; RoleGate y controlador admiten Supervisor | No se abrieron filas que marcan leído ni se alteró inbox. Exactitud histórica/por actor y transición leído pendientes |
| Mecánico: acceder a Mi trabajo | Selector/OIDC y GET de cola accesibles; E90/E91 muestran cero tareas en CHECK | Sólo acceso y vacío exitoso comprobados; no existe caso accesible para ejecutar CHECK en esta sesión |
| Mecánico: mantenimiento tradicional | UI de Órdenes restringida en sesión local; guards y RoleGate excluyen MECANICO puro; no navegación al wizard desde Mi trabajo | No atribuirle captura de mantenimiento por existir enum. Proceso humano del mecánico y quién registra su trabajo pendientes |
| Mecánico: campanita | E92: badge 2 → pantalla restringida, copy «logística y administración» | Acción UI incoherente con rol seleccionado, H06. No se llamó backend restringido desde esa vista; no prueba de 403 de cuenta pura |
| CHECK completo | Código contiene elegibles/claim/start/evidencia/hallazgos/review/complete/invalidate y actor/patio. Sólo cola vacía observada | Código presente ≠ capacidad habilitada ≠ flujo usable. Sin scheduler forzado, migración, asignación ni CHECK completado |
| Supervisor puro y CHECK | Autorizaciones canónicas de lectura/review/assign no le atribuyen esas acciones por su nombre; actor multirol puede comportarse diferente del rol UI | No probado; no ampliar permisos ni añadir capacidad al sprint de mantenimiento actual |
| Admin: preparación | Unidad/SKU/entrada nuevos mediante formularios actuales; E98–E101 | Precondición técnica de pruebas, no auditoría de operaciones administrativas ni Logística |

Los textos Slice0 «no implementado» de AGENTS/ICM/PRODUCT se contrastaron con código presente y bandeja actual. Se registra H09 sin modificar fuentes canónicas ni reabrir decisiones CHECK ya aceptadas. La habilitación y usabilidad del incremento CHECK siguen pendientes de casos y perfiles; no pertenecen al primer sprint posterior.

## Evaluación por dimensión

| Dimensión | Evidencia y conclusión | Límite |
|---|---|---|
| Comprensión | Estados y requisitos de cierre visibles; error/0 en Consumo E148, vacío filtrado E94, Recibida/cerrar comprobante E131 ambiguos | Interpretación humana y consecuencias no medidas |
| Atención | Inicio organiza atención por fuente; fallo parcial E143 ocupa columna estrecha. Múltiples Adjuntar ticket naranja compiten E130 | No ranking ni frecuencia de uso inferidos; truncamiento móvil por validar con usuarios |
| Acción | Wizard completo, reanudación y cierre disponibles; stock insuficiente ofrece corrección y bloquea Continuar; campanita Mecánico conduce fuera de permiso | Captura embebida completa, eliminación, conflicto y desconexión de escritura pendientes |
| Análisis | Historial distingue tipos/orígenes y enlaza visitas; Consumo reconcilia stock/externo; dos referencias antiguas 404 | Agregados sin drill-down; muestra insuficiente para tendencias o causalidad |
| Medición | Se conoce persistencia de tres casos sintéticos; createdAt → cerradoAt mide intervalo documental, no reparación. Cierre semilla anterior a creación | Sin MTTR, costos, SLA, productividad, reincidencia o tasas humanas válidas |
| Consistencia | Shell, tarjetas, documento y wizard reutilizables; diferencia de selección tabs/filtros es observación; jerarquía primaria repetida y recuperación desigual confirmadas | No uniformar semánticas sin definir su función |
| Accesibilidad | Roboto público cargado; blanco/naranja 2.977:1 a 13px; Escape cierra y foco BODY; firmas obligatorias con canvas no focusable/nombre/alternativa; reduce mantiene 0.3s | Sin certificación WCAG ni prueba con lector. Reflow 320 de Inicio no equivale a zoom global |

El segundo pase ux-auditor revisó 21 PNG públicos y semántica E114, coincidió en firmas, campanita, vacío filtrado, comprobante y énfasis de fila. Lo positivo observado (wizard, validación, cierre/documento/historial) tampoco reemplaza prueba con usuarios. [Registro independiente](evidencia/E155-revision-independiente-publica.md).

## Referencias y cierre del alcance

SAP/Fiori se usa como referencia de jerarquía listado→objeto, mensajes y relaciones identificables, sin copiar flujos. Carbon aporta estados vacíos y Material accesibilidad/navegación como referencias complementarias. Se preservan navy `#24284D`, naranja `#EA7515`, Roboto y primitivas Team Mex/Radix. Taste no se necesitó ni bloqueó el trabajo. Referencias enlazadas en el mapa de kit.

La entrega documental termina con recorridos accesibles y límites trazables. La evaluación humana permanece abierta: usuarios, cuentas puras, dispositivo real y casos de conflicto/recuperación/avisos. No hay aceptación de producto ni cambios implementados. El [backlog](backlog-y-cierre.md) propone únicamente mejoras posteriores, separa nuevas capacidades y deja Logística como siguiente módulo.
