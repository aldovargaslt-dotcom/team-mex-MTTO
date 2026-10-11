# Evidencia actual — índice y protocolo

**Separación de sesiones:** E01–E43 son revisión local histórica; E44–E46 fijan plan/despliegue declarado; E47–E156 son acceso público, recorridos/mediciones/fixtures y documentación posterior. La imagen fixture es una entrada sintética, no screenshot de aplicación, y no tiene JSON de DOM.

Cada PNG del cliente tiene un JSON pareado con URL, fecha UTC, texto/controles DOM, viewport, overflow horizontal y respuestas de red recogidas por CDP. Se capturó UI real local/pública, sin mocks ni respuestas fabricadas; la fuente del despliegue público está declarada por el usuario, sin atestación SHA independiente. E28/E29/E30/E33/E42 son verificaciones específicas sin PNG. E31/E32 son errores de **entorno** al intentar render público, no screenshots de Team Mex.

## Índice

| ID | Artefacto / qué acredita |
|---|---|
| [E01](E01-selector-d1440.png) | Selector local d1440, cuatro perfiles; no identidad confiable |
| [E02](E02-supervisor-inicio-error-d1440.png) | Supervisor Inicio error d1440; legibilidad/fuentes |
| [E03](E03-ordenes-error-d1440.png) | Órdenes error d1440; vacío contradictorio |
| [E04](E04-ordenes-filtros-d1440.png) | Menú de filtro abierto d1440 |
| [E05](E05-ordenes-filtro-correctivo-d1440.png) | Filtro Correctivo en URL, sin filas para comprobar resultados |
| [E06](E06-nueva-orden-error-d1440.png) | Nueva orden error/disabled d1440 |
| [E07](E07-unidades-error-d1440.png) | Error de lectura de Unidades d1440 |
| [E08](E08-inventario-error-d1440.png) | Refacciones y subnav en error d1440 |
| [E09](E09-consumo-error-d1440.png) | Consumo 503 + cero/vacío d1440 |
| [E10](E10-stock-error-d1440.png) | Existencias en error d1440 |
| [E11](E11-supervisor-menu-d1440.png) | Menú secundario Supervisor d1440 |
| [E12](E12-andon-error-d1440.png) | Mantenimiento vencido 503 + vacío d1440 |
| [E13](E13-notificaciones-error-d1440.png) | Campanita→Alertas error/vacío d1440 |
| [E14](E14-notificaciones-error-m390.png) | Mismo error de Alertas m390 |
| [E15](E15-ordenes-error-m390.png) | Órdenes error m390 y contraste/dimensiones de controles |
| [E16](E16-nueva-orden-error-m390.png) | Nueva orden como sheet m390 |
| [E17](E17-inicio-error-m390.png) | Inicio error m390, captura corregida tras volver desde selector Supervisor |
| [E18](E18-supervisor-menu-m390.png) | Menú Supervisor m390 |
| [E19](E19-selector-m390.png) | Cambio de rol→selector m390 |
| [E20](E20-mecanico-error-m390.png) | Selector→Mecánico→Mi trabajo error m390 |
| [E21](E21-mecanico-reintentar-m390.png) | Clic Reintentar, nuevo GET de checks y error persistente |
| [E22](E22-mecanico-error-d1440.png) | Bandeja Mecánico error d1440, conteos desconocidos |
| [E23](E23-mecanico-ordenes-restringido-d1440.png) | Mecánico entra directamente a Órdenes, restricción d1440 |
| [E24](E24-nueva-orden-teclado-d1440.png) | Nueva orden tras ciclo de teclado d1440 |
| [E25](E25-ordenes-accesibilidad-m390.png) | Órdenes m390 después del cierre de overlay |
| [E26](E26-filtros-m390.png) | Filtro de Órdenes abierto m390 |
| [E27](E27-nueva-orden-reduced-motion-m390.png) | Sheet con preferencia reduce; medición técnica en E28 |
| [E28](E28-teclado-motion.json) | Media query reduce true, duraciones computed, seis Tab dentro y Escape con foco BODY |
| [E29](E29-contraste.json) | Cálculo de contraste #FFF sobre #EA7515: 2.977:1 |
| [E30](E30-base-solo-lectura.json) | Consultas y resultados de base local, sin escrituras; vínculos parciales de semilla |
| [E31](E31-entorno-certificado-d1440.png) / [E32](E32-entorno-certificado-m390.png) | Límite TLS del navegador público; no se sortea la verificación |
| [E33](E33-publico-session-http.json) | Sesión pública HTTP OIDC/no actor, sin login; commit desconocido en esa observación inicial, declarado posteriormente en E46 |
| [E34](E34-ficha-unidad-error-d1440.png) | Entrada directa al hub de unidad real de E30; error |
| [E35](E35-visita-cerrada-inaccesible-d1440.png) / [E36](E36-visita-cerrada-inaccesible-m390.png) | Entrada directa a visita cerrada real; documento inaccesible |
| [E37](E37-movimientos-error-m390.png) | Movimientos m390 en error + vacío |
| [E38](E38-pendientes-error-m390.png) | Por recibir m390 en error |
| [E39](E39-ordenes-error-d1024.png) | Órdenes d1024, comprobación intermedia de layout en fallo |
| [E40](E40-contraste-documental.md) | Antecedentes vs checkout: roles, umbrales, CHECK, seed y ausencia inicial del plan, resuelta en E44 |
| [E41](E41-mecanico-alertas-restringido-m390.png) | Mecánico pulsa campanita y llega a restricción de Alertas |
| [E42](E42-fuentes-analisis.json) | Estructura de fuentes Andon/Salud/ítems y conteos, solo lectura |
| [E43](E43-entorno-tipografia.md) | Warning final del servidor: Roboto no descargado, fallback; límite visual adicional |
| [E44 origen](E44-plan-origen.json) / [plan íntegro](E44-plan-7b149ca.txt) | Plan leído tras respuesta del usuario, commit y blob fijados; evidencia documental, sin nueva observación UI |
| [E45](E45-inventario-rutas.json) | Inventario dirigido de 29 páginas presentes en código; capacidades/estados de runtime no inferidos |
| [E46](E46-despliegue-declarado.json) | Dominios y fuente `main`/`39ce14d` confirmados por el usuario desde Vercel; sin nueva observación de UI autenticada |

## Protocolo de primera sesión local (histórico)

1. Leer AGENTS/ICM; buscar plan y fuentes mínimas; fijar git HEAD/estado y preparar matriz antes de navegar.
2. Consultar base existente con cliente pg y transacciones READ ONLY/ROLLBACK. No boot API: crea schemas/siembra y la base carece de columnas/tablas nuevas.
3. Preparar dependencias web desde lockfile (ignore-scripts, caché en /tmp), iniciar servidor development con API_URL local explícita.
4. Abrir Chromium headless, fijar viewport, entrar por selector de rol. Ejecutar clics reales mediante CDP y recoger DOM/red/PNG, sin Playwright. URLs directas: restricciones E23, IDs de unidad/visita E34–E36 y Movimientos E37; no presentarlas como navegación exitosa desde un listado.
5. Repetir Reintentar, abrir/cerrar filtros/menu/dialog, ciclo Tab/Escape y preferencia reduce. Capturar las mismas pantallas accesibles en tamaños indicados.
6. Revisar PNG/DOM, calcular contraste y hacer pase visual independiente. Elaborar hallazgos sólo después de evidencia.
7. Después de recibir la ubicación del plan, leerlo en `7b149ca`, verificar SHA completo/blob, contrastar acuerdos y actualizar sólo entregables de auditoría. Inventariar rutas restantes sin atribuirles cobertura de UI.

El clic automatizado al Inicio inferior fue interceptado por el badge N de Next, según hit-test `nextjs-portal`. No se registró como fallo del producto. E17 se recapturó desde acceso correcto a Supervisor/Inicio. Todos los PNG conservan la apariencia original; no se ocultaron errores ni se retocó diseño.

El registro final del servidor advirtió fallback de Roboto (E43). Se conoce después del pase visual; repetir apariencia tipográfica con assets disponibles. Se cerraron ambos Chromium y el servidor web usados para la auditoría; el backend nunca se inició.

Las preferencias emuladas por CDP se verificaron dentro de la misma conexión (E28 media query true); no se asume que persistieran entre conexiones. El foco fue medido, no inferido de una imagen. La red pareada es incremental entre capturas y puede contener llamadas de campanita además de la ruta principal.

## Comandos / resultados

| Verificación | Estado | Evidencia / límite |
|---|---|---|
| Leer AGENTS.md e ICM.md; git rev-parse HEAD y status | PASS | HEAD fijado, checkout limpio inicialmente |
| Localizar el plan en checkout durante la preparación inicial | FAIL histórico | Archivo ausente en checkout; ubicación solicitada; no se fingió lectura. Resuelto después por lectura fijada E44 |
| Leer plan remoto completo y resolver SHA `7b149ca` | PASS documental | [E44 origen](E44-plan-origen.json) y [copia íntegra](E44-plan-7b149ca.txt); [contraste](../contraste-plan.md). Sin cambiar baseline de producto |
| Inventario dirigido de páginas presentes en código | PASS documental | [E45](E45-inventario-rutas.json), 29 entradas; no acredita pantallas usables ni roles efectivos |
| Consultas pg `BEGIN READ ONLY` → SELECT → `ROLLBACK` | PASS | E30/E42; no fixture nuevo ni modificación de registros |
| Primer arranque web con dependencias preinstaladas | FAIL de entorno | Módulo jose ausente; no se clasifica como defecto UX |
| Primer npm ci sin caché explícita | FAIL de entorno | Caché /home/agent/.npm no escribible; instalación detenida |
| `npm ci --ignore-scripts --cache /tmp/team-mex-npm-cache` | PASS | 370 paquetes instalados desde lock; sin cambios de manifiesto/lock |
| `API_URL=http://127.0.0.1:3001 npm run dev -- --hostname 127.0.0.1` | PASS para render web | Navegador actual y capturas; no acredita backend |
| GETs `/backend/*` | FAIL funcional del entorno | 503, backend local no disponible; se auditó presentación de fallo |
| Clics/filtros/overlays/retry/teclado/mediciones | PASS en pasos accesibles | E01–E28/E34–E41; detalle y escritura no completados |
| curl GET público `/` y `/api/auth/session` con TLS verificado | PASS limitado | HTTP 200 y OIDC/no actor; E33. No versión ni login acreditados |
| Render público en Chromium por proxy | FAIL de entorno | E31/E32 CA no confiable para Chromium; no es pantalla auditada del producto |
| Descarga y render efectivo de Roboto | FAIL de entorno / validación pendiente | E43 warning Next/font, fallback; configuración de marca intacta |
| API startup, seed, synchronize, migraciones | SKIPPED | Escriben o requieren schema ausente; fuera de límites autorizados |
| Captura/cierre/consumo/firma/CHECK completos | SKIPPED / inaccesible | Requieren backend, identidad y datos habilitados. No sustituido por código ni SQL |
| Suites API/lint/build como verificación del producto | SKIPPED | No implementación; no sustituyen recorrido. No se afirma suite verde |
| Pruebas con usuarios, dispositivo real y lector de pantalla | SKIPPED / pendiente | Sin participantes/dispositivos/acceso; protocolos pendientes en backlog |
| Pase visual independiente | PASS como actividad; resultado no OK | [Registro](revision-visual-independiente.md), no aprobación global |

Verificación documental y manifiesto de hashes se registran en [verificacion-documental.json](verificacion-documental.json) y [SHA256SUMS](SHA256SUMS). No son pruebas de negocio.


## Continuación pública — índice completo

E47 en adelante son capturas públicas o registros técnicos/documentales nuevos. Login Auth0 se capturó **antes** de introducir credenciales. PNG originales sin retoque; JSON sin headers/cookies/tokens/cuerpo de contraseña ni valores de input de credenciales. La red es incremental y los requests no son un log exhaustivo del servidor. Se conserva una imagen sintética de prueba como entrada, claramente marcada; no fotografía de reparación real.

Robotos públicos E146, TLS resuelto/acotado al perfil temporal y limpieza acreditados en informe/ejecución. Las afirmaciones de acceso pendiente y backend inaccesible de las secciones históricas anteriores pertenecen a la primera sesión. El backend local nunca se inició; la API pública sí se usó. El perfil público autenticado fue eliminado al terminar.

| Registro | Tipo / escena / límite |
|---|---|
| [E47 JSON](E47-publico-login-d1440.json) | publico login d1440 |
| [E47 PNG](E47-publico-login-d1440.png) | publico login d1440 |
| [E48 JSON](E48-publico-login-m390.json) | publico login m390 |
| [E48 PNG](E48-publico-login-m390.png) | publico login m390 |
| [E49 JSON](E49-auth0-login-sin-credenciales-d1440.json) | auth0 login sin credenciales d1440 |
| [E49 PNG](E49-auth0-login-sin-credenciales-d1440.png) | auth0 login sin credenciales d1440 |
| [E50 JSON](E50-publico-selector-multirol-d1440.json) | publico selector multirol d1440 |
| [E50 PNG](E50-publico-selector-multirol-d1440.png) | publico selector multirol d1440 |
| [E51 JSON](E51-publico-supervisor-inicio-d1440.json) | publico supervisor inicio d1440 |
| [E51 PNG](E51-publico-supervisor-inicio-d1440.png) | publico supervisor inicio d1440 |
| [E52 JSON](E52-publico-inicio-m390.json) | publico inicio m390 |
| [E52 PNG](E52-publico-inicio-m390.png) | publico inicio m390 |
| [E53 JSON](E53-publico-ordenes-borradores-d1440.json) | publico ordenes borradores d1440 |
| [E53 PNG](E53-publico-ordenes-borradores-d1440.png) | publico ordenes borradores d1440 |
| [E54 JSON](E54-publico-captura-pieza-sin-guardar-d1440.json) | publico captura pieza sin guardar d1440 |
| [E54 PNG](E54-publico-captura-pieza-sin-guardar-d1440.png) | publico captura pieza sin guardar d1440 |
| [E55 JSON](E55-publico-ordenes-cerradas-d1440.json) | publico ordenes cerradas d1440 |
| [E55 PNG](E55-publico-ordenes-cerradas-d1440.png) | publico ordenes cerradas d1440 |
| [E56 JSON](E56-publico-ordenes-cerradas-m390.json) | publico ordenes cerradas m390 |
| [E56 PNG](E56-publico-ordenes-cerradas-m390.png) | publico ordenes cerradas m390 |
| [E57 JSON](E57-publico-visita-cerrada-foton-m390.json) | publico visita cerrada foton m390 |
| [E57 PNG](E57-publico-visita-cerrada-foton-m390.png) | publico visita cerrada foton m390 |
| [E58 JSON](E58-publico-visita-cerrada-foton-d1440.json) | publico visita cerrada foton d1440 |
| [E58 PNG](E58-publico-visita-cerrada-foton-d1440.png) | publico visita cerrada foton d1440 |
| [E59 JSON](E59-publico-orden-cerrada-chato-d1440.json) | publico orden cerrada chato d1440 |
| [E59 PNG](E59-publico-orden-cerrada-chato-d1440.png) | publico orden cerrada chato d1440 |
| [E60 JSON](E60-publico-visita-cerrada-chato-d1440.json) | publico visita cerrada chato d1440 |
| [E60 PNG](E60-publico-visita-cerrada-chato-d1440.png) | publico visita cerrada chato d1440 |
| [E61 JSON](E61-publico-hub-chato-d1440.json) | publico hub chato d1440 |
| [E61 PNG](E61-publico-hub-chato-d1440.png) | publico hub chato d1440 |
| [E62 JSON](E62-publico-hub-chato-m390.json) | publico hub chato m390 |
| [E62 PNG](E62-publico-hub-chato-m390.png) | publico hub chato m390 |
| [E63 JSON](E63-publico-hub-mantenimiento-chato-m390.json) | publico hub mantenimiento chato m390 |
| [E63 PNG](E63-publico-hub-mantenimiento-chato-m390.png) | publico hub mantenimiento chato m390 |
| [E64 JSON](E64-publico-hub-historial-chato-m390.json) | publico hub historial chato m390 |
| [E64 PNG](E64-publico-hub-historial-chato-m390.png) | publico hub historial chato m390 |
| [E65 JSON](E65-publico-wizard-borrador-chato-m390.json) | publico wizard borrador chato m390 |
| [E65 PNG](E65-publico-wizard-borrador-chato-m390.png) | publico wizard borrador chato m390 |
| [E66 JSON](E66-publico-wizard-borrador-chato-d1440.json) | publico wizard borrador chato d1440 |
| [E66 PNG](E66-publico-wizard-borrador-chato-d1440.png) | publico wizard borrador chato d1440 |
| [E67 JSON](E67-publico-nueva-orden-d1440.json) | publico nueva orden d1440 |
| [E67 PNG](E67-publico-nueva-orden-d1440.png) | publico nueva orden d1440 |
| [E68 JSON](E68-publico-nueva-orden-m390.json) | publico nueva orden m390 |
| [E68 PNG](E68-publico-nueva-orden-m390.png) | publico nueva orden m390 |
| [E69 JSON](E69-publico-nueva-orden-unidad-seleccionada-m390.json) | publico nueva orden unidad seleccionada m390 |
| [E69 PNG](E69-publico-nueva-orden-unidad-seleccionada-m390.png) | publico nueva orden unidad seleccionada m390 |
| [E70 JSON](E70-publico-teclado-nueva-orden.json) | Teclado inicial móvil; Escape a300ms no acredita fallo; repetido E150 cierra |
| [E71 JSON](E71-publico-unidades-d1440.json) | publico unidades d1440 |
| [E71 PNG](E71-publico-unidades-d1440.png) | publico unidades d1440 |
| [E72 JSON](E72-publico-unidades-m390.json) | publico unidades m390 |
| [E72 PNG](E72-publico-unidades-m390.png) | publico unidades m390 |
| [E73 JSON](E73-publico-ordenes-borradores-lista-m390.json) | publico ordenes borradores lista m390 |
| [E73 PNG](E73-publico-ordenes-borradores-lista-m390.png) | publico ordenes borradores lista m390 |
| [E74 JSON](E74-publico-hub-foton-m390.json) | publico hub foton m390 |
| [E74 PNG](E74-publico-hub-foton-m390.png) | publico hub foton m390 |
| [E75 JSON](E75-publico-hub-foton-d1440.json) | publico hub foton d1440 |
| [E75 PNG](E75-publico-hub-foton-d1440.png) | publico hub foton d1440 |
| [E76 JSON](E76-publico-hub-historial-foton-d1440.json) | publico hub historial foton d1440 |
| [E76 PNG](E76-publico-hub-historial-foton-d1440.png) | publico hub historial foton d1440 |
| [E77 JSON](E77-publico-andon-d1440.json) | publico andon d1440 |
| [E77 PNG](E77-publico-andon-d1440.png) | publico andon d1440 |
| [E78 JSON](E78-publico-andon-m390.json) | publico andon m390 |
| [E78 PNG](E78-publico-andon-m390.png) | publico andon m390 |
| [E79 JSON](E79-publico-inventario-m390.json) | publico inventario m390 |
| [E79 PNG](E79-publico-inventario-m390.png) | publico inventario m390 |
| [E80 JSON](E80-publico-consumo-m390.json) | publico consumo m390 |
| [E80 PNG](E80-publico-consumo-m390.png) | publico consumo m390 |
| [E81 JSON](E81-publico-consumo-d1440.json) | publico consumo d1440 |
| [E81 PNG](E81-publico-consumo-d1440.png) | publico consumo d1440 |
| [E82 JSON](E82-publico-movimientos-d1440.json) | publico movimientos d1440 |
| [E82 PNG](E82-publico-movimientos-d1440.png) | publico movimientos d1440 |
| [E83 JSON](E83-publico-pendientes-d1440.json) | publico pendientes d1440 |
| [E83 PNG](E83-publico-pendientes-d1440.png) | publico pendientes d1440 |
| [E84 JSON](E84-publico-pendientes-m390.json) | publico pendientes m390 |
| [E84 PNG](E84-publico-pendientes-m390.png) | publico pendientes m390 |
| [E85 JSON](E85-publico-consumo-90d-m390.json) | publico consumo 90d m390 |
| [E85 PNG](E85-publico-consumo-90d-m390.png) | publico consumo 90d m390 |
| [E86 JSON](E86-publico-consumo-90d-d1440.json) | publico consumo 90d d1440 |
| [E86 PNG](E86-publico-consumo-90d-d1440.png) | publico consumo 90d d1440 |
| [E87 JSON](E87-publico-stock-d1440.json) | publico stock d1440 |
| [E87 PNG](E87-publico-stock-d1440.png) | publico stock d1440 |
| [E88 JSON](E88-publico-notificaciones-d1440.json) | publico notificaciones d1440 |
| [E88 PNG](E88-publico-notificaciones-d1440.png) | publico notificaciones d1440 |
| [E89 JSON](E89-publico-notificaciones-m390.json) | publico notificaciones m390 |
| [E89 PNG](E89-publico-notificaciones-m390.png) | publico notificaciones m390 |
| [E90 JSON](E90-publico-mecanico-mi-trabajo-d1440.json) | publico mecanico mi trabajo d1440 |
| [E90 PNG](E90-publico-mecanico-mi-trabajo-d1440.png) | publico mecanico mi trabajo d1440 |
| [E91 JSON](E91-publico-mecanico-mi-trabajo-m390.json) | publico mecanico mi trabajo m390 |
| [E91 PNG](E91-publico-mecanico-mi-trabajo-m390.png) | publico mecanico mi trabajo m390 |
| [E92 JSON](E92-publico-mecanico-alertas-m390.json) | publico mecanico alertas m390 |
| [E92 PNG](E92-publico-mecanico-alertas-m390.png) | publico mecanico alertas m390 |
| [E93 JSON](E93-publico-filtros-d1440.json) | publico filtros d1440 |
| [E93 PNG](E93-publico-filtros-d1440.png) | publico filtros d1440 |
| [E94 JSON](E94-publico-borradores-filtro-vacio-d1440.json) | publico borradores filtro vacio d1440 |
| [E94 PNG](E94-publico-borradores-filtro-vacio-d1440.png) | publico borradores filtro vacio d1440 |
| [E95 JSON](E95-publico-cerradas-filtro-preventivo-d1440.json) | publico cerradas filtro preventivo d1440 |
| [E95 PNG](E95-publico-cerradas-filtro-preventivo-d1440.png) | publico cerradas filtro preventivo d1440 |
| [E96 JSON](E96-fuentes-publicas-solo-lectura.json) | Sesión/roles y pendientes sanitizados, sin subject personal |
| [E97 JSON](E97-publico-escape-desktop.json) | publico escape desktop |
| [E98 JSON](E98-prueba-unidad-antes-crear-d1440.json) | prueba unidad antes crear d1440 |
| [E98 PNG](E98-prueba-unidad-antes-crear-d1440.png) | prueba unidad antes crear d1440 |
| [E99 JSON](E99-prueba-unidad-creada-d1440.json) | prueba unidad creada d1440 |
| [E99 PNG](E99-prueba-unidad-creada-d1440.png) | prueba unidad creada d1440 |
| [E100 JSON](E100-prueba-refaccion-creada-d1440.json) | prueba refaccion creada d1440 |
| [E100 PNG](E100-prueba-refaccion-creada-d1440.png) | prueba refaccion creada d1440 |
| [E101 JSON](E101-prueba-entrada-2-pza-d1440.json) | prueba entrada 2 pza d1440 |
| [E101 PNG](E101-prueba-entrada-2-pza-d1440.png) | prueba entrada 2 pza d1440 |
| [E102 JSON](E102-prueba-visita-1-datos-m390.json) | Formulario de nueva orden seleccionado, ANTES de crear |
| [E102 PNG](E102-prueba-visita-1-datos-m390.png) | Formulario de nueva orden seleccionado, ANTES de crear |
| [E103 JSON](E103-prueba-visita-1-creada-m390.json) | prueba visita 1 creada m390 |
| [E103 PNG](E103-prueba-visita-1-creada-m390.png) | prueba visita 1 creada m390 |
| [E104 JSON](E104-prueba-visita-1-trabajos-m390.json) | prueba visita 1 trabajos m390 |
| [E104 PNG](E104-prueba-visita-1-trabajos-m390.png) | prueba visita 1 trabajos m390 |
| [E105 JSON](E105-prueba-visita-1-observaciones-m390.json) | prueba visita 1 observaciones m390 |
| [E105 PNG](E105-prueba-visita-1-observaciones-m390.png) | prueba visita 1 observaciones m390 |
| [E106 JSON](E106-prueba-visita-1-fotos-m390.json) | prueba visita 1 fotos m390 |
| [E106 PNG](E106-prueba-visita-1-fotos-m390.png) | prueba visita 1 fotos m390 |
| [E107 JSON](E107-prueba-visita-1-foto-agregada-m390.json) | prueba visita 1 foto agregada m390 |
| [E107 PNG](E107-prueba-visita-1-foto-agregada-m390.png) | prueba visita 1 foto agregada m390 |
| [E108 JSON](E108-prueba-visita-1-piezas-m390.json) | prueba visita 1 piezas m390 |
| [E108 PNG](E108-prueba-visita-1-piezas-m390.png) | prueba visita 1 piezas m390 |
| [E109 JSON](E109-prueba-stock-insuficiente-m390.json) | prueba stock insuficiente m390 |
| [E109 PNG](E109-prueba-stock-insuficiente-m390.png) | prueba stock insuficiente m390 |
| [E110 JSON](E110-prueba-borrador-guardado-m390.json) | prueba borrador guardado m390 |
| [E110 PNG](E110-prueba-borrador-guardado-m390.png) | prueba borrador guardado m390 |
| [E111 JSON](E111-prueba-borrador-reanudado-m390.json) | prueba borrador reanudado m390 |
| [E111 PNG](E111-prueba-borrador-reanudado-m390.png) | prueba borrador reanudado m390 |
| [E112 JSON](E112-prueba-firmas-vacias-m390.json) | prueba firmas vacias m390 |
| [E112 PNG](E112-prueba-firmas-vacias-m390.png) | prueba firmas vacias m390 |
| [E113 JSON](E113-prueba-cierre-sin-firmas-m390.json) | prueba cierre sin firmas m390 |
| [E113 PNG](E113-prueba-cierre-sin-firmas-m390.png) | prueba cierre sin firmas m390 |
| [E114 JSON](E114-canvas-accesibilidad.json) | canvas accesibilidad |
| [E115 JSON](E115-prueba-trazos-sinteticos-m390.json) | prueba trazos sinteticos m390 |
| [E115 PNG](E115-prueba-trazos-sinteticos-m390.png) | prueba trazos sinteticos m390 |
| [E116 JSON](E116-prueba-confirmar-lista-m390.json) | prueba confirmar lista m390 |
| [E116 PNG](E116-prueba-confirmar-lista-m390.png) | prueba confirmar lista m390 |
| [E117 JSON](E117-prueba-dialogo-cierre-stock-m390.json) | prueba dialogo cierre stock m390 |
| [E117 PNG](E117-prueba-dialogo-cierre-stock-m390.png) | prueba dialogo cierre stock m390 |
| [E118 JSON](E118-prueba-visita-1-cerrada-hub-m390.json) | Cerrando… transitorio, todavía no éxito; confirmado E119 |
| [E118 PNG](E118-prueba-visita-1-cerrada-hub-m390.png) | Cerrando… transitorio, todavía no éxito; confirmado E119 |
| [E119 JSON](E119-prueba-visita-1-cierre-confirmado-m390.json) | prueba visita 1 cierre confirmado m390 |
| [E119 PNG](E119-prueba-visita-1-cierre-confirmado-m390.png) | prueba visita 1 cierre confirmado m390 |
| [E120 JSON](E120-prueba-documento-1-cerrado-m390.json) | prueba documento 1 cerrado m390 |
| [E120 PNG](E120-prueba-documento-1-cerrado-m390.png) | prueba documento 1 cerrado m390 |
| [E121 JSON](E121-prueba-documento-1-cerrado-d1440.json) | prueba documento 1 cerrado d1440 |
| [E121 PNG](E121-prueba-documento-1-cerrado-d1440.png) | prueba documento 1 cerrado d1440 |
| [E122 JSON](E122-prueba-salida-ot-d1440.json) | prueba salida ot d1440 |
| [E122 PNG](E122-prueba-salida-ot-d1440.png) | prueba salida ot d1440 |
| [E123 JSON](E123-prueba-stock-1-restante-d1440.json) | prueba stock 1 restante d1440 |
| [E123 PNG](E123-prueba-stock-1-restante-d1440.png) | prueba stock 1 restante d1440 |
| [E124 JSON](E124-prueba-visita-2-creada-d1440.json) | prueba visita 2 creada d1440 |
| [E124 PNG](E124-prueba-visita-2-creada-d1440.png) | prueba visita 2 creada d1440 |
| [E125 JSON](E125-prueba-visita-2-stock-insuficiente-d1440.json) | prueba visita 2 stock insuficiente d1440 |
| [E125 PNG](E125-prueba-visita-2-stock-insuficiente-d1440.png) | prueba visita 2 stock insuficiente d1440 |
| [E126 JSON](E126-prueba-visita-2-origen-externo-d1440.json) | prueba visita 2 origen externo d1440 |
| [E126 PNG](E126-prueba-visita-2-origen-externo-d1440.png) | prueba visita 2 origen externo d1440 |
| [E127 JSON](E127-prueba-dialogo-cierre-externo-d1440.json) | prueba dialogo cierre externo d1440 |
| [E127 PNG](E127-prueba-dialogo-cierre-externo-d1440.png) | prueba dialogo cierre externo d1440 |
| [E128 JSON](E128-prueba-visita-2-cierre-confirmado-d1440.json) | prueba visita 2 cierre confirmado d1440 |
| [E128 PNG](E128-prueba-visita-2-cierre-confirmado-d1440.png) | prueba visita 2 cierre confirmado d1440 |
| [E129 JSON](E129-prueba-historial-dos-visitas-d1440.json) | prueba historial dos visitas d1440 |
| [E129 PNG](E129-prueba-historial-dos-visitas-d1440.png) | prueba historial dos visitas d1440 |
| [E130 JSON](E130-prueba-pendiente-externo-d1440.json) | prueba pendiente externo d1440 |
| [E130 PNG](E130-prueba-pendiente-externo-d1440.png) | prueba pendiente externo d1440 |
| [E131 JSON](E131-prueba-comprobante-sin-ticket-d1440.json) | prueba comprobante sin ticket d1440 |
| [E131 PNG](E131-prueba-comprobante-sin-ticket-d1440.png) | prueba comprobante sin ticket d1440 |
| [E134 JSON](E134-prueba-stock-invariable-externo-d1440.json) | prueba stock invariable externo d1440 |
| [E134 PNG](E134-prueba-stock-invariable-externo-d1440.png) | prueba stock invariable externo d1440 |
| [E135 JSON](E135-prueba-consumo-30d-d1440.json) | prueba consumo 30d d1440 |
| [E135 PNG](E135-prueba-consumo-30d-d1440.png) | prueba consumo 30d d1440 |
| [E136 JSON](E136-prueba-visita-3-creada-d1440.json) | prueba visita 3 creada d1440 |
| [E136 PNG](E136-prueba-visita-3-creada-d1440.png) | prueba visita 3 creada d1440 |
| [E137 JSON](E137-prueba-tercer-pendiente-con-origen-d1440.json) | prueba tercer pendiente con origen d1440 |
| [E137 PNG](E137-prueba-tercer-pendiente-con-origen-d1440.png) | prueba tercer pendiente con origen d1440 |
| [E138 JSON](E138-prueba-ticket-adjunto-d1440.json) | prueba ticket adjunto d1440 |
| [E138 PNG](E138-prueba-ticket-adjunto-d1440.png) | prueba ticket adjunto d1440 |
| [E139 JSON](E139-prueba-ticket-cerrado-d1440.json) | prueba ticket cerrado d1440 |
| [E139 PNG](E139-prueba-ticket-cerrado-d1440.png) | prueba ticket cerrado d1440 |
| [E140 JSON](E140-pruebas-fuentes-finales.json) | GET final de fixtures/stock/pendientes, medios por presencia y actor por booleano |
| [E141 JSON](E141-prueba-consumo-final-m390.json) | prueba consumo final m390 |
| [E141 PNG](E141-prueba-consumo-final-m390.png) | prueba consumo final m390 |
| [E142 JSON](E142-prueba-stock-final-m390.json) | prueba stock final m390 |
| [E142 PNG](E142-prueba-stock-final-m390.png) | prueba stock final m390 |
| [E143 JSON](E143-publico-fallo-parcial-controlado-m390.json) | publico fallo parcial controlado m390 |
| [E143 PNG](E143-publico-fallo-parcial-controlado-m390.png) | publico fallo parcial controlado m390 |
| [E144 JSON](E144-publico-fallo-parcial-controlado-d1440.json) | publico fallo parcial controlado d1440 |
| [E144 PNG](E144-publico-fallo-parcial-controlado-d1440.png) | publico fallo parcial controlado d1440 |
| [E145 JSON](E145-publico-recuperado-d1440.json) | publico recuperado d1440 |
| [E145 PNG](E145-publico-recuperado-d1440.png) | publico recuperado d1440 |
| [E146 JSON](E146-tipografia-publica.json) | Roboto-Regular efectivamente renderizado en h1 público |
| [E147 JSON](E147-publico-reflow-320-inicio.json) | publico reflow 320 inicio |
| [E147 PNG](E147-publico-reflow-320-inicio.png) | publico reflow 320 inicio |
| [E148 JSON](E148-publico-consumo-fallo-controlado-m390.json) | publico consumo fallo controlado m390 |
| [E148 PNG](E148-publico-consumo-fallo-controlado-m390.png) | publico consumo fallo controlado m390 |
| [E149 JSON](E149-publico-consumo-recuperado-m390.json) | publico consumo recuperado m390 |
| [E149 PNG](E149-publico-consumo-recuperado-m390.png) | publico consumo recuperado m390 |
| [E150 JSON](E150-accesibilidad-publica.json) | CSS público/contraste, reduced-motion y Escape móvil |
| [E151 JSON](E151-prueba-movimiento-enlace-orden-m390.json) | Fila de movimiento abre sheet; enlace a documento se ejecuta después en E153 |
| [E151 PNG](E151-prueba-movimiento-enlace-orden-m390.png) | Fila de movimiento abre sheet; enlace a documento se ejecuta después en E153 |
| [E152 JSON](E152-prueba-comprobante-enlace-orden-m390.json) | prueba comprobante enlace orden m390 |
| [E152 PNG](E152-prueba-comprobante-enlace-orden-m390.png) | prueba comprobante enlace orden m390 |
| [E153 JSON](E153-prueba-sheet-movimiento-a-visita-m390.json) | Documento con piezas secundarias aún cargando; estable E154, no pérdida de línea |
| [E153 PNG](E153-prueba-sheet-movimiento-a-visita-m390.png) | Documento con piezas secundarias aún cargando; estable E154, no pérdida de línea |
| [E154 JSON](E154-prueba-enlace-movimiento-datos-estables-m390.json) | prueba enlace movimiento datos estables m390 |
| [E154 PNG](E154-prueba-enlace-movimiento-datos-estables-m390.png) | prueba enlace movimiento datos estables m390 |
| [E155 MD](E155-revision-independiente-publica.md) | Revisión visual independiente del segundo pase |
| [E156 JSON](E156-mutaciones-observadas.json) | Mutaciones de dominio registradas incrementalmente, no log exhaustivo |

| [Imagen fixture](fixture-imagen-sintetica.png) | 640×360, texto PRUEBA AUDITORÍA UX/UI / NO reparación; entrada del caso de foto y ticket |

## Resultado de ejecución pública

| Comprobación | Estado / evidencia |
|---|---|
| Login/cuenta multirol/roles UI y consultas públicas | PASS E47–E96, sin atribuir autorización a cuenta pura |
| Crear fixture unidad/SKU/entrada | PASS E98–E101; sólo registros nuevos autorizados |
| Crear/reanudar/capturar tres visitas/siete pasos/cerrar | PASS casos concretos E103–E140; imagen/trazos sintéticos |
| Suficiente/insuficiente/externo, stock/movimientos/pendiente | PASS efectos cotejados E109/E122–E142; concurrencia/atomicidad SKIPPED |
| Ticket antes de cierre / cierre sin ticket | PASS comportamiento E131/E138–E140; no inferir obligatoriedad ni recepción física |
| Relaciones nuevas e historias de origen | PASS E129/E151–E154; dos relaciones antiguas404 FAIL reconstrucción E83/E96, causa pendiente |
| Error parcial/Consumo y recuperación por recarga | PASS reproducción E143–E149; FAIL criterios estados/legibilidad/recovery |
| Tipografía/contraste/teclado/reduce/canvas | PASS medición E114/E146/E150; FAIL criterios H04/H05/H07/H12; WCAG completa SKIPPED |
| Segundo pase experto independiente | PASS E155; no aprobación global ni usuarios |
| Usuarios/roles puros/físico/lector/zoom/escritura offline/CHECK completo | SKIPPED; motivos exactos en matriz/ejecución |
| Cerrar navegador y eliminar perfil temporal autenticado | PASS; sin almacén NSS persistente alterado |

[Verificación documental](verificacion-documental.json) y [SHA256SUMS](SHA256SUMS) se regeneran al final. Pruebas de aplicación/build/migración no aplican a esta entrega de documentación; no se ejecutaron para insinuar validación humana.
