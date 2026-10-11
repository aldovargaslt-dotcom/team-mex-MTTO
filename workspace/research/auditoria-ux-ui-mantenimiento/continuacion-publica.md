# Continuación de la auditoría en el despliegue público

## Preparación previa a los recorridos autenticados

Baseline declarado por el usuario en E46: dominio público `team-mex-mtto-eight.vercel.app`, fuente `39ce14db9b287ad46074900e8028b1a127cd166c`. Plan E44, commit `7b149ca82a6cb8005797b956ad53ad224563b5fb`. Chromium 151, desktop 1440×900 y móvil virtual 390×844, misma cuenta de auditoría y mismo despliegue.

Login OIDC/Auth0 completado. La sesión devuelve ADMIN_DIRECTIVO, SUPERVISOR, LOGISTICA y MECANICO, un ámbito de patio, TRUSTED/SERVER_VERIFIED. Los recorridos usan la selección UI de Supervisor y Mecánico; **no son pruebas de cuentas puras** ni confirman responsabilidades operativas de personas. No se copian contraseña, tokens ni cookies a evidencia.

El bloqueo TLS anterior se resolvió con las CA ya presentes en el entorno, limitadas a dominios de aplicación/Auth0 y al perfil temporal de Chromium en `/tmp`. TLS sigue verificado. La revisión automática rechazó modificar el almacén NSS persistente por ampliar confianza de futuros navegadores; esa acción no se ejecutó. La alternativa afecta sólo el perfil temporal, que se elimina al terminar.

**Restricción al preparar esta matriz, antes de la autorización posterior:** el usuario habilitó acceso con una cuenta; entonces no había identificado registros de prueba ni autorizado su modificación. Se recorren consultas y formularios sin guardar, cerrar visitas, firmar, tomar/iniciar CHECK, marcar alertas ni cambiar configuración. Un cierre persistido o una acción CHECK siguen pendientes aunque pueda verse su control.

| Tarea / flujo | Preparación del recorrido público | Estados y comprobaciones previstas | Cobertura inicial |
|---|---|---|---|
| M01 / acceso | OIDC → selector → Supervisor/Mecánico | Perfil UI, roles efectivos, retorno; desktop/móvil | Login completado; selector pendiente de captura |
| S01 / F01–F02 | Supervisor → Inicio → Andon → unidad pertinente | Origen, prioridad explicable, carga/datos/vacío, aviso/unidad; sin Enterado | Pendiente |
| S02/S08 / F05 | Unidades → ficha → visitas existentes | Identidad, estado administrativo/Salud, trabajos/consumos/evidencia, historial y retorno | Pendiente; casos se seleccionan de los registros visibles |
| S03 / F01 | Órdenes → colas/filtros → orden existente | Consulta exitosa, vacío real/filtro, detalle y reanudación sin editar | Pendiente |
| S04 / F04/F07 | Nueva orden → selección → cancelar sin crear | Carga de unidades/choferes, jerarquía, foco, contraste, zoom | Pendiente; POST y persistencia excluidos |
| S05–S07 / F04 | Documento/captura de visita existente, si abrir es consulta | Requisitos y relaciones visibles, lectura de cerrado | Captura/consumo/firma/cierre por ejecutar sólo con caso y operaciones autorizadas |
| S09 / F03 | Consumo/Movimientos/Pendientes/Stock vinculados a mantenimiento | Fuente, unidad, período/UOM, agregado/detalle y evidencia cuando existan | Pendiente; no alterar stock/comprobantes |
| S10 / F02 | Campanita → listado, sin marcar leído | Conteo, clasificación, permiso/destino | Pendiente; lectura que cambie estado no se ejecuta |
| M02/M03 / F06 | Selección Mecánico → Mi trabajo → detalle sólo si es GET | Cola actual, estado, tareas ofrecidas, lectura CHECK | Pendiente; cuenta multirol limita pruebas negativas |
| X01/X03 | Pantallas accesibles, desktop/móvil, teclado/zoom/reduce | Foco, nombres/hits, lectura, continuidad, estados/carga y motion diferido | Pendiente; sin dispositivo físico ni usuario participante |

La matriz se prepara antes de recorrer las vistas autenticadas. Los resultados y límites se completarán con evidencia nueva, preservando las capturas locales anteriores.


## Autorización posterior y ejecución

Después de consultar órdenes/visitas se advirtió que cambiar de paso guarda. El usuario autorizó expresamente: **«Crear y modificar registros nuevos identificados como prueba; no tocar registros existentes.»** La matriz inicial anterior se conserva como preparación histórica; la [matriz final](matriz-cobertura.md) expresa cobertura actual.

Se preparó una unidad y un SKU nuevo mediante UI Admin y luego se hicieron todas las visitas/comprobantes mediante UI seleccionando Supervisor. Se referenció tipo STOCK, categoría Filtros y chofer WERO existentes sin modificarlos. Imagen y trazos sintéticos, no reparación ni firma humana. No se modificaron registros antiguos ni se ejecutó CHECK, Enterado, leído, umbrales, seed, migración o código de producto.

| Registro nuevo / marcador | ID y resultado final |
|---|---|
| Unidad `AUD-UX-20261011-A`, placas `UXAUD01`, modelo Prueba auditoría UX/UI | `1d815aac-6311-4301-a315-9e05e4628d8d`, ACTIVA, STOCK; E98/E99 |
| SKU `AUD-UX-20261011-PZA`, Prueba auditoría UX/UI, Filtros, compatible STOCK | `023de669-9f64-4182-a8dc-406714b2a79c`, pieza, sin mínimo; E100 |
| Entrada de prueba 2 piezas | `761d7ed7-4875-444e-9ec9-02e14d00c66a`, nota explícita de auditoría; E101/E140 |
| Visita 1, preventivo, 100 km, afinación | `1ac25340-6cd6-4f0b-864a-fc65571ac3cf`, CERRADO, 1 pieza DESDE_STOCK, 1 imagen, 2 trazos; observación indica prueba/no trabajo real |
| Salida derivada de visita 1, qty 1/delta -1 | `ae102729-f567-4353-be43-eaeb89a39ecf`, SALIDA_OT; stock nuevo 2→1; E122/E123/E140 |
| Visita 2, correctivo, 101 km, calibración | `53a02af0-b7a5-4059-9df6-c53bf3aa8add`, CERRADO, 3 piezas COMPRA_EXTERNA, sin foto, 2 trazos; observación de prueba |
| Comprobante de visita 2 | `055e2fce-758a-418b-a3a4-f8b21a3ad558`, RECIBIDA, sin ticket; se probó que cerrar no lo exige y ya no ofrece adjuntar |
| Visita 3, preventivo, 102 km, luces | `f2aa2d26-8669-4b0c-83ea-29e73dd2bdf9`, CERRADO, 1 pieza COMPRA_EXTERNA, sin foto, 2 trazos; observación de prueba de adjunto |
| Comprobante de visita 3 | `5918832a-eaaa-4288-83aa-3ebc90dd393b`, RECIBIDA, imagen sintética adjunta antes de cierre; E138/E139/E140 |

**Los registros permanecen para revisión.** No se borran fixtures ni se presenta su contenido como historia del taller. Los agregados posteriores al 11/oct 07:00 UTC incluyen pruebas: 1 pieza desde stock y 4 compra externa; Historial tiene tres cierres nuevos y sus mezclas/cadencias son sintéticas. No existe exclusión de fixtures comprobada en esos agregados. Los comprobantes derivados se identifican por SKU/unidad nuevos; no tienen un campo de nota de auditoría propio observado.

## Casos funcionales y evidencia

PASS significa que el caso y resultado descritos se comprobaron; no ausencia de defectos de UX. FAIL se refiere al criterio explícito, no a una regla de negocio inventada. SKIPPED no equivale a PASS.

| Caso / precondición / recorrido | Resultado y persistencia observada | Estado / evidencia |
|---|---|---|
| Acceso OIDC → selector Supervisor/Mecánico | Sesión autenticada multirol; destinos disponibles | PASS E47–E52/E90/E96; cuentas puras SKIPPED |
| Colas y filtro Preventivo con 3 borradores correctivos | Cero coincidencias legítimo; mensaje afirma inexistencia global | PASS filtrado; FAIL claridad del vacío, H10, E53/E73/E94/E95 |
| Nueva orden sobre unidad con borrador previo, sin crear | Advierte y ofrece continuar; no crea segunda orden | PASS lectura E69; borrador existente nunca editado |
| Fixtures Admin → unidad/SKU/entrada nuevos | IDs nuevos y stock 2; respuesta posterior/UI | PASS E98–E101 |
| Visita 1 → siete pasos → guardar/salir/reanudar | Trabajo/notas/imagen/línea persistidos; reanudación vuelve al paso Datos; se avanza para verificar Piezas | PASS E103–E112/E120/E140; URL directa para reabrir guardado, no prueba de conservar paso |
| Qty 3 > stock 2, origen stock | Advertencia con cantidad, acción externo, Continuar disabled; no se guarda qty inválida ni se cierra | PASS E109; no prueba de concurrencia |
| Confirmar sin firmas | Faltante visible y Cerrar disabled | PASS regla existente E113; no operación backend de cierre inválido |
| Canvas obligatorio operable sólo por puntero en UI actual | Sin tabindex/role/nombre/alternativa visible; trazos por mouse permiten avanzar | FAIL accesibilidad, H12 E112–E116/E114; lector SKIPPED |
| Cerrar visita 1 con stock 1 | Diálogo anticipa irreversible, stock restante 1; CERRADO, GET pieza/imagen/firmas, SALIDA_OT y stock 1 | PASS E117–E123/E140 |
| Visita 2, qty 3 > stock 1 → Usar compra externa → cierre | Pendiente nuevo qty 3; stock permanece 1; consumo incluye 3 externo | PASS E124–E130/E134/E135 |
| Cerrar comprobante nuevo sin ticket | RECIBIDA y desaparecen adjuntar/cerrar; sin ticket en GET. No exige archivo | PASS comportamiento E131/E140; H14 semántica/recuperación, sin asumir ticket obligatorio |
| Visita 3 externa qty 1 → adjuntar imagen → cerrar comprobante | Ticket visible y hasTicket true; RECIBIDA; stock no cambia por operación externa | PASS E136–E142/E140 |
| Historial/movimiento/comprobante → documento/unidad | Historial diferencia origen y tipo; movimiento abre sheet, desde sheet enlace a visita 1; comprobante enlaza visita 3 | PASS E129/E151–E154; retorno conservando origen/filtros SKIPPED |
| Pendientes antiguos de qty 4/11 → resolver sus referencias por GET | Ambos GET visita 404; texto OT corto sin enlace ni explicación de origen no disponible | FAIL trazabilidad disponible H11, E83/E96; causa no demostrada, registros sin tocar |
| Bloqueo sólo GET Andon en navegador → Inicio → desbloqueo | Error parcial ocupa columna del icono con otras filas disponibles; recupera fila FOTON | PASS simulación/recuperación; FAIL legibilidad H02, E143–E145. No caída del servidor |
| Bloqueo sólo GET Movimientos → Consumo → desbloqueo | Con datos 1+4, fallo imprime 0+0/No hay; recarga vuelve a 1+4 | PASS reproducción; FAIL estados H01/H03, E148/E149. No se bloqueó escritura |
| Tab/Escape/Roboto/contraste/reduce | Tab contenido; Escape termina BODY; Roboto renderizado; blanco/naranja 2.977:1; reduce conserva enter/transition 0.3s | PASS mediciones; FAIL criterios H04/H05/H07 E70/E97/E146/E150. E70 móvil inicial de 300ms no se usa para afirmar Escape roto; repetición de 1200ms lo cierra |
| Datos secundarios del documento cargando | E153 muestra Sin piezas transitorio; E154 muestra pieza correcta en misma visita, sin escribir | Observado; H01 carga secundaria sin estado fiel. No pérdida de pieza |
| Escritura offline/concurrente/repetición cierre, borrado, inactiva, aviso resolutivo, expiración | No ejecutados | SKIPPED: casos/reglas/control de efecto no disponibles dentro de fixtures usados |
| Usuarios/lector/cámara/zoom/dispositivos reales | No ejecutados | SKIPPED: sin participantes o dispositivos disponibles |

Entradas directas se identifican: formularios de preparación; consulta pública inicial de documentos existentes; reabrir visita guardada; páginas de costura y fuentes. E151 abre el sheet de movimiento, **no el documento**; E153 ejecuta su enlace y E154 acredita datos estables. E102 conserva formulario inicial, **antes de crear**; E118 conserva Cerrando… antes del éxito E119. Estos estados no se contabilizan como resultado cerrado.

## Límites restantes

No hubo verificación de cuentas puras, denegaciones HTTP por rol puro, responsable humano, usuario del taller, firma real, cámara/dispositivo físico, lector, zoom global, atomicidad/concurrencia, recuperación de escritura fallida, acción Enterado/resolución con aviso nuevo ni CHECK completo. Captura embebida sólo se abrió sin guardar (E54); el wizard es el recorrido completo ejecutado. Los 404 son hechos de acceso a relaciones en esta cuenta, no prueba de borrado, causa de integridad o inexistencia universal de historia.

La fuente de versión pública es la declaración de despliegue del usuario, no atestación independiente de SHA. Navegador y perfil temporal cerrados/eliminados; se conservan únicamente capturas y fuentes sanitizadas, sin contraseña, token, cookie ni imagen de credenciales.
