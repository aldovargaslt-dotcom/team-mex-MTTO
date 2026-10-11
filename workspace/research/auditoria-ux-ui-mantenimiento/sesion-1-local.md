> Registro histórico de la sesión local anterior al acceso público. El estado vigente está en [informe](informe.md) y [matriz](matriz-cobertura.md). Las afirmaciones de inaccesibilidad de este archivo pertenecen sólo a esa sesión.

# Informe de auditoría UX/UI — mantenimiento

## Resultado y alcance efectivo

No OK para los estados de fallo observados; sin veredicto sobre el funcionamiento completo del módulo. La revisión experta detecta problemas reproducibles en el cliente actual. La verificación funcional se limita a acceso local de prueba, navegación, filtros, overlays, recuperación fallida y relaciones leídas directamente de la base. No hubo pruebas con usuarios.

Se leyeron primero `AGENTS.md` e `ICM.md`. Después se cargaron PRODUCT, las tarjetas Mantenimiento/Inventario por su costura de consumos, README para ejecución, auth/roles, las rutas relevantes y los criterios del sistema visual. No se cargó el repositorio entero, no se auditó Logística ni se reutilizaron screenshots históricos como evidencia actual.

En la primera sesión el plan no estaba en el checkout. El usuario facilitó después la rama `codex/plan-auditoria-ux-ui` y el commit `7b149ca`. Se leyó el archivo completo mediante GitHub con esa referencia fijada y se verificó el SHA completo `7b149ca82a6cb8005797b956ad53ad224563b5fb`; copia y origen en E44. El [contraste](contraste-plan.md) deja resuelta esa limitación documental y precisa las fichas, la priorización y el cierre. No cambia la evidencia de runtime ni confirma los pendientes operativos del plan.

## Versión, entorno, datos y dispositivos

| Variable | Evaluada / límite |
|---|---|
| Fecha | 10 de octubre de 2026, America/Los_Angeles. Los registros técnicos conservan UTC del 11 de octubre |
| Repositorio | `/workspace/team-mex-MTTO`, rama `work`, HEAD `39ce14db9b287ad46074900e8028b1a127cd166c` (merge #88). Limpio al inicio |
| Plan rector | `7b149ca82a6cb8005797b956ad53ad224563b5fb`, blob `15e944c2f0cc34fc970becd130651818e55dbebd`; leído después de recibir la ubicación. No es la versión del cliente observado |
| Cliente | `web` 0.1.0, Next.js 15.5.25, servidor development en `http://127.0.0.1:3000`; API_URL fijado a `http://127.0.0.1:3001` |
| Roles observados | SUPERVISOR y MECANICO elegidos mediante el selector local; identidad de prueba, sin cuenta humana ni permisos OIDC acreditados |
| API | Código `api` 0.0.1 inspeccionado; servicio no iniciado. Permisos y reglas declarados en código, sin ejecución HTTP de dominio |
| Base | PostgreSQL local `team_mex_mtto`, consultas `BEGIN READ ONLY` y `ROLLBACK`; 34 tablas, esquema legacy. Sin tablas CHECK/Auth ni columnas canónicas de orden en `visitas` |
| Datos | 13 unidades; una visita cerrada de semilla, un trabajo, dos firmas placeholder, cero piezas, cero fotos; un evento VisitaCerrada; tres entradas de inventario, cero pendientes de comprobante |
| Navegador | Chromium 151.0.7922.173, Debian Linux, headless; control mediante Chrome DevTools Protocol, sin Playwright ni framework nuevo |
| Tipografía renderizada | Roboto configurado en código; al cerrar el servidor se recuperó el warning de descarga fallida/fallback (E43). No se acredita Roboto efectivo en los PNG; repetir validación tipográfica con assets disponibles |
| Viewports | 1440×900 y 390×844; 1024×768 para Órdenes. Tamaños virtuales, sin teléfono físico, cámara, guantes ni teclado móvil |
| Dominio público | `https://team-mex-mtto-eight.vercel.app`, localizado inicialmente en DEPLOY.md. GET `/` respondió 200; GET `/api/auth/session` devolvió OIDC/no autenticado/actor null. Después el usuario confirmó dominio, rama main, URL de despliegue y fuente `39ce14d` en Vercel (E46); coincide con el checkout evaluado. API efectiva, cuentas y vistas autenticadas siguen sin comprobar |
| Render público | Chromium encontró error de confianza en la CA del proxy. No se desactivó TLS; curl sí verificó TLS con la CA del entorno. E31/E32 son evidencia del límite del navegador, no UI del producto |

No iniciar la API fue una decisión necesaria para respetar los límites: `ensureModuleSchemas` ejecuta CREATE SCHEMA; `SeedService.onModuleInit` llama a `seed()` y escribe catálogo/inventario/visita; synchronize es true por defecto en desarrollo. La base actual tampoco contiene las estructuras que exige el código nuevo. No se ejecutó ninguno de esos caminos ni una migración para obtener acceso.

Las dependencias web preinstaladas carecían de `jose`. Se reinstalaron desde el lockfile con `npm ci --ignore-scripts --cache /tmp/team-mex-npm-cache`; no cambió package.json ni el lockfile. El primer intento falló por la caché fuera de la zona escribible. Esto es preparación del entorno, no un hallazgo de producto. El servidor finalmente renderizó las pantallas. Los 503 observados son consecuencia de no disponer del backend local; **no prueban una caída en producción**.

## Confirmación de perfiles: evidencia por nivel

Las tareas y responsabilidades reales del taller no están confirmadas con personas. La tabla distingue responsabilidad inferida de capacidades declaradas y de UI observada. «Supervisor de mantenimiento» se corresponde aquí con la etiqueta UI «Supervisor»/SUPERVISOR; esa equivalencia organizacional debe confirmarse.

| Perfil / tarea | Declaración actual en el checkout | Disponible y observado | Validación pendiente |
|---|---|---|---|
| Supervisor: priorizar y consultar unidad/órdenes | Shell enlaza Inicio, Órdenes, Unidades, Inventario; menú secundario incluye mantenimiento vencido. Hub autorizado a SUPERVISOR/ADMIN | Acceso, destinos, filtros y errores vistos; ficha e historia no cargan | Priorización con datos, búsqueda y regreso desde ficha, significado para el usuario |
| Supervisor: crear, editar, eliminar borrador y cerrar visita | `VisitasController` reserva esas escrituras a SUPERVISOR. Datos/trabajos/observaciones/fotos/piezas/firmas figuran en el cliente | Nueva orden abre, muestra fallo y CTA disabled; no se creó una visita | Permisos efectivos, captura, reanudación, pérdida de conexión, firma, cierre y lectura posterior |
| Supervisor: consumo/compra externa | Controlador Inventario admite SUPERVISOR; piezas forman parte de visita y del evento de cierre | Stock, Consumo, Movimientos y Por recibir sólo en fallo | Stock insuficiente, compra externa, atomicidad, enlaces y comprobante |
| Supervisor: Andon | Leer y Enterado declarados. Enterado no resuelve; cierre sí tiene consumidor Andon | Pantalla y texto de regla observados, sin avisos cargados | Acción y efecto real; interpretación humana de Enterado |
| Supervisor: cambiar umbral | Código actual de PATCH `/andon/umbrales/:tipoVehiculoId` permite ADMIN_DIRECTIVO y SUPERVISOR | No ejecutado, ni forma completa auditada | Contrastar con README que todavía dice 403 para Supervisor; confirmar responsabilidad de negocio, sin revocar/otorgar permisos en esta auditoría |
| Supervisor: alertas | Controlador y RoleGate admiten SUPERVISOR | Campanita → Alertas y fallo observados | Badge, marcar leído, destino correcto; esas escrituras no se ejecutaron |
| Mecánico: acceso | Enum, selector y ruta `/mi-trabajo` existen actualmente | Selector → bandeja CHECK, error y Reintentar vistos | Identidad confiable, patio, cola con datos, cuentas reales |
| Mecánico: mantenimiento tradicional | Visitas/Órdenes/hub/Inventario/Andon no están habilitados para MECANICO puro en sus guards relevantes | `/ordenes` devuelve restricción; no hay navegación a wizard desde Mi trabajo | Proceso real de ejecución del mecánico y registro por Supervisor. No inferir que tiene una bandeja de mantenimiento por su nombre |
| Mecánico: CHECK | Código canónico incluye consulta elegible, claim, start, condición, evidencia, hallazgos, review, complete e invalidation, con restricciones de actor/patio/asignación | Sólo pantalla de bandeja degradada; ninguna de esas operaciones completada | Toda capacidad CHECK en runtime; esquema, actor, configuración, storage y datos habilitados en un entorno autorizado |
| Supervisor puro: supervisar CHECK | Servicios de lectura CHECK admiten MECANICO/LOGISTICA/ADMIN; assign permite LOGISTICA/ADMIN; review permite MECANICO. SUPERVISOR puro no figura en esas autorizaciones | Sin recorrido CHECK de Supervisor observado | No atribuirle revisión/asignación por la palabra «supervisor». Cualquier ampliación sería decisión aparte |
| Mecánico: alertas compartidas | Shell muestra campanita, pero RoleGate y API de Notifications excluyen MECANICO | Pulsarla lleva a una restricción que nombra Logística/Administración (E41) | Alinear el recorrido con permisos existentes; no conceder permisos por defecto |

GET básico de unidades carece de decorator Roles específico y pasa por autenticación global; esto no concede al Mecánico una ficha operativa: el hub y el cliente tienen restricciones adicionales. Permisos declarados no equivalen a pruebas de autorización efectivas. En identidades con varios roles, el guard legacy selecciona rol, mientras CHECK usa roles del actor; no se probó esa combinación.

## Capacidad actual frente a propuestas MECANICO/CHECK

AGENTS/ICM/PRODUCT conservan textos de Slice0 que dicen «target/no implementado». El checkout actual sí incluye código CHECK, TrustedAuth, bandeja y login OIDC. Se registra el desfase documental; no se modifica ninguna fuente de verdad.

Se deben conservar tres niveles: **código presente**, **capacidad habilitada en una instancia** y **recorrido usable comprobado**. Aquí se acreditó el primer nivel de CHECK y sólo la pantalla de error del tercero; no se acreditó habilitación operativa. Las decisiones target registradas no autorizan desplegar, migrar ni ampliar esta auditoría. Tampoco se reabren las decisiones CHECK R01–R05 por este informe.

El primer sprint propuesto mejora el mantenimiento tradicional actual: identificar disponibilidad real, recuperar consultas, reconocer órdenes y abrir/volver de su captura. Claim, scheduler diario, CHECK completo, nuevas asignaciones, storage y permisos quedan fuera de ese sprint y necesitan su evaluación/decisión independiente.

## Evaluación por dimensión

| Dimensión | Conclusión apoyada por lo observado | Límite |
|---|---|---|
| Comprensión | Error convive con «No hay…» y ceros; copy de restricciones no describe los roles permitidos | No se midió interpretación de usuarios |
| Atención | Inicio distingue fuentes fallidas, pero el texto ocupa la columna del icono; dificulta escaneo | No se observaron filas de alerta reales |
| Acción | Nueva orden es identificable; disabled impide continuar sin unidad. Mecánico tiene Reintentar, Supervisor suele recibir sólo una instrucción | No se probó continuidad después de recuperar API |
| Análisis | Consumo expone período/origen, pero muestra valores iniciales tras 503 | Filas, drill-down y agregados con datos no observados |
| Medición | La muestra es semilla; no acredita historial ni tiempos de reparación, costos o desempeño | No hay evidencia de KPI operativo acordado |
| Consistencia | Chrome y primitivas reconocibles; selección azul en Órdenes frente a filtros navy; recuperación desigual; campanita no corresponde a permisos de Mecánico | Clasificación de cola como tab o filtro requiere acuerdo |
| Accesibilidad | CTA blanco/naranja 2.98:1; principales hits móviles revisados ≥44px. Tab mantiene foco dentro de Nueva orden; Escape cierra y devuelve foco a BODY. Reduced-motion mantiene animaciones | Sin lector de pantalla, reflow/zoom 200–400%, captura táctil o evaluación WCAG completa |

La revisión visual independiente `ux-auditor` exigida por las instrucciones del repositorio inspeccionó ocho PNG actuales y coincidió en los cuatro problemas principales. No editó producto y no concede aceptación global. Detalle del pase en el índice de evidencia. El warning de fallback tipográfico se conoció al recuperar el registro final del servidor; las capturas se conservan originales y la apariencia Roboto queda pendiente, sin reinterpretar los fallos de estado como problemas de fuente.

## Referencias aplicadas

[SAP/Fiori: mensajes](https://www.sap.com/design-system/fiori-design-web/v1-151/foundations/best-practices/global-patterns/messaging/messaging) sirve para separar estados y ayudar a reconocer/resolver fallos; [list report/object page](https://developers.sap.com/concepts/fiori-list-report-object-page/) sirve como referencia de jerarquía listado→objeto y contexto del detalle. La claridad de relaciones identificadas en la ficha se evalúa en el mapa de trazabilidad; no se copia un proceso SAP ni se propone SAPUI5.

[Carbon: empty states](https://www.carbondesignsystem.com/building-blocks/core/patterns/empty-states) complementa la distinción entre resultado vacío, permisos y falta de servicio. [Material: tipografía](https://m3.material.io/styles/typography/applying-type) complementa legibilidad; no reemplaza la escala Roboto propia. El contraste se compara con [WCAG 2.2, 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). Se conservan azul marino #24284D, naranja #EA7515, Roboto y componentes pertinentes de Team Mex. Taste no se utilizó y no bloqueó el trabajo.

## Límites de conclusión

No se auditó un cierre exitoso, una visita capturable, firmas humanas, consumo real, evidencia fotográfica, CHECK usable, permisos OIDC, historia productiva ni el módulo Logística. Las fichas marcan esos estados como inaccesibles o pendientes. Una consulta SQL prueba registros y vínculos de la muestra; no prueba navegación. Un PNG de un error prueba ese estado; no prueba la tarea exitosa. Una revisión experta tampoco demuestra satisfacción, comprensión o éxito de los perfiles reales.
