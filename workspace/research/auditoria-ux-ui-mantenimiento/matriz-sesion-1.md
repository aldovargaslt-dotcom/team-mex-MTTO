> Registro histórico de la sesión local anterior al acceso público. El estado vigente está en [informe](informe.md) y [matriz](matriz-cobertura.md). Las afirmaciones de inaccesibilidad de este archivo pertenecen sólo a esa sesión.

# Matriz de mantenimiento — preparación y cobertura

Versión fijada: `39ce14db9b287ad46074900e8028b1a127cd166c`, rama `work`. Checkout limpio al inicio. Fecha de preparación: 2026-10-10 America/Los_Angeles (2026-10-11 UTC). Esta matriz se creó antes de recorrer la UI.

Al preparar esta matriz el plan no estaba en el checkout. Después de recibir su ubicación se leyó en `7b149ca82a6cb8005797b956ad53ad224563b5fb` (E44) y se [contrastaron sus acuerdos](contraste-plan.md). La preparación inicial se conserva; no se altera retrospectivamente qué se sabía antes de navegar. Documentación de auditoría autorizada, implementación excluida.

Estados: **observado** sólo para el estado efectivamente visto; **pendiente** para validación aún no ejecutada; **inaccesible** cuando un requisito de acceso/datos impide completar; **no aplicable** para capacidades fuera del perfil/alcance. Observar un error no significa haber completado la tarea.

| ID | Perfil | Tarea / responsabilidad a contrastar | Pantalla / recorrido previsto | Estados requeridos | Preparación |
|---|---|---|---|---|---|
| M01 | Ambos | Acceder y reconocer perfil | `/` → elección de rol → shell | sesión, selección, error, expiración | Pendiente: sólo acceso local de prueba; OIDC no configurado |
| M02 | Mecánico | Identificar trabajo elegible/asignado | `/` → Mecánico → `/mi-trabajo` | carga, vacío, error, pendiente/asignado/en progreso | Pendiente: código CHECK no acredita funcionamiento |
| M03 | Mecánico | Tomar/iniciar/continuar chequeo | bandeja → `/checks/:id` | claim, conflicto, captura, revisión, firma | Inaccesible inicialmente: sin actor confiable ni tablas CHECK |
| M04 | Mecánico | Ejecutar mantenimiento tradicional | órdenes / wizard de visita | borrador, trabajos, piezas, cierre | No aplicable al permiso tradicional declarado: controlador excluye MECANICO; confirmar proceso humano pendiente |
| S01 | Supervisor | Priorizar mantenimiento | `/inicio` → aviso → `/andon` → unidad | carga, vacío, error, aviso abierto/enterado/resuelto | Pendiente: no API activa |
| S02 | Supervisor | Encontrar unidad y reconocer estado | `/unidades` → ficha `/unidades/:id` | búsqueda, filtros, vacío, error, activa/inactiva | Pendiente |
| S03 | Supervisor | Encontrar/reanudar orden | `/ordenes` → borradores/cerradas → detalle | filtros, selección, sin resultados, errores parciales | Pendiente |
| S04 | Supervisor | Crear visita y capturar datos/trabajos | Nueva orden / ficha → captura | preventivo/correctivo, chofer, km, validaciones | Inaccesible inicialmente: requiere API y borrador; no se crearán datos |
| S05 | Supervisor | Documentar observaciones/fotos | captura / wizard | sin evidencia, carga, archivo inválido, recuperación | Inaccesible inicialmente: requiere visita |
| S06 | Supervisor | Registrar consumo | visita → Piezas | stock suficiente/insuficiente, compra externa, opcional | Inaccesible inicialmente: requiere visita y API |
| S07 | Supervisor | Revisar, firmar y cerrar | Firmas → Confirmar → cerrado | firma, bloqueo, error, éxito, no editable | Inaccesible inicialmente: requiere datos de prueba aislados y API |
| S08 | Supervisor | Reconstruir historia y evidencia | unidad → visita cerrada → piezas/fotos/firmas | historia con/sin datos, relación, lectura | Pendiente: SQL sólo lectura posible; UI requiere API |
| S09 | Supervisor | Ver existencias y comprobantes asociados | Inventario → Stock / Consumo / Movimientos / Pendientes | carga, vacío, error, bajo/agotado, filtros, detalle | Pendiente: sólo costura con mantenimiento, sin auditoría completa de almacén |
| S10 | Supervisor | Atender notificación | campanita → `/notificaciones` → destino | badge, carga, error, leído/no leído | Pendiente: no se marcarán leídas |
| S11 | Supervisor | Supervisar CHECK nuevo | ficha / CHECK / revisión/asignación | autorización, patio, conflicto, firma | Inaccesible inicialmente: separado del mantenimiento tradicional |
| X01 | Ambos | Uso operativo móvil/escritorio y accesibilidad | shell + pantallas accesibles | 1440×900, 390×844; teclado, zoom, foco, contraste, objetivos | Pendiente: Chromium virtual, sin dispositivo físico ni usuarios |
| X02 | Ambos | Análisis y medición | historia unidad / consumo / demoras | fuentes, definiciones, período, falta de datos | Pendiente: no inventar KPI ni tendencia |
| X03 | Ambos | Carga, skeleton, transición y animación | recorridos anteriores | inicial, espera, fallo, recuperación, reduced-motion | Pendiente; implementación diferida |
| X04 | Usuarios reales | Confirmar tareas, responsabilidades y comprensión | entrevistas + pruebas por tareas | éxito, errores, recuperación, entorno real | Pendiente: no hay participantes; revisión experta no sustituye prueba con usuarios |
| X05 | Logística | Auditoría del módulo siguiente | — | — | No aplicable a esta primera etapa |

## Cobertura al terminar esta sesión

La preparación anterior se conserva como registro de lo conocido antes de navegar. Este cuadro es el estado final. La primera columna de cobertura describe la UI efectivamente vista; la segunda evita confundir verla con completar una tarea. Evidencia indexada en [evidencia](evidencia/README.md).

| ID | Cobertura de pantalla/estado | Ejecución de tarea | Justificación y siguiente validación |
|---|---|---|---|
| M01 | Observado: selector y cambio de rol local E01/E19 | Observado sólo acceso de prueba; login real pendiente | OIDC sólo comprobado por HTTP sin actor E33; credenciales, expiración y multirol no disponibles |
| M02 | Observado: bandeja error E20/E22 y Reintentar E21 | Inaccesible: identificar trabajo real | Sin backend/actor/patio/CHECK; no confundir bandeja renderizada con capacidad operativa |
| M03 | Inaccesible: estados de CHECK con datos | Inaccesible | No se simularon registros ni autorizaciones; requiere entorno habilitado y separado de mejoras tradicionales |
| M04 | Observado: restricción en Órdenes E23 | No aplicable al permiso tradicional de MECANICO puro | Controlador de Visitas lo excluye. Responsabilidad real del mecánico pendiente de entrevista |
| S01 | Observado: Inicio/Andon en error E02/E17/E12 | Inaccesible: priorizar/atender aviso real | Falta cola con avisos; Enterado y resolución sin ejecutar |
| S02 | Observado: listado/hub error E07/E34 | Inaccesible: encontrar e inspeccionar unidad por UI | ID real sólo disponible mediante SQL; filtros/estados/detalle no cargados |
| S03 | Observado: Órdenes/filtros en fallo E03–E05/E15/E26/E39 | Inaccesible: elegir o reanudar orden | Cambiar filtro altera URL; sin filas no acredita resultado ni continuación |
| S04 | Observado: Nueva orden error/disabled E06/E16 | Inaccesible: crear y capturar visita | No unidad ni chofer seleccionables. Sin creación de registros; captura embebida y wizard pendientes |
| S05 | Inaccesible: fotos/observaciones en captura | Inaccesible | No visita abierta cargable; cámara, tamaño, carga y pérdida de datos pendientes |
| S06 | Inaccesible: Piezas del wizard | Inaccesible | Stock/compra externa/insuficiencia y efecto transaccional no ejecutados |
| S07 | Inaccesible: Firmas/Confirmar/éxito | Inaccesible | No firma humana ni cierre; reglas sólo inspeccionadas en código |
| S08 | Observado: error de visita E35/E36 y datos relacionados E30 | Inaccesible por UI; observado vínculo SQL parcial | Hay unidad→visita→trabajo/firmas/outbox; cero piezas/fotos impiden verificar esas ramas |
| S09 | Observado: error en pantallas de inventario E08–E10/E37/E38 | Inaccesible: relacionar consumo/comprobante real | Se limita a costura con mantenimiento; no auditoría completa de almacén |
| S10 | Observado: campanita→Alertas error E13/E14 | Inaccesible: abrir aviso y verificar leído/destino | E41 observa destino fuera de permiso para Mecánico; no se marcaron alertas |
| S11 | No aplicable a Supervisor puro según autorizaciones actuales | No aplicable; nuevos permisos fuera del sprint | Lectura/assign/review CHECK no admiten SUPERVISOR puro. Multirol y decisiones adicionales quedan separados |
| X01 | Observado: E15/E16/E20/E24/E25/E28/E29/E39 | Observado parcial; accesibilidad completa pendiente | Hits, contraste, teclado/escape y tamaños virtuales. Sin lector, zoom/reflow ni dispositivo real; Roboto renderizado pendiente por fallback E43 |
| X02 | Observado: E09 y estructura/historia E30 | Observado análisis de soporte; gráficos con datos inaccesibles | No datos suficientes para tendencias, costos, rendimiento ni reparación; mapa separado |
| X03 | Observado: error/overlay/reintento y reduced-motion E21/E27/E28 | Observado parcial; carga lenta/skeleton pendientes | No se midieron latencia/CLS ni se inyectó una respuesta ficticia. Motion diferido |
| X04 | Pendiente | Pendiente | Sin usuarios disponibles; confirmar proceso/responsabilidades primero, después prueba por tareas |
| X05 | No aplicable | No aplicable | Logística es el módulo siguiente, fuera de esta sesión |

No se calcula un porcentaje global de cobertura: contar pantallas de error como tareas completas exageraría el alcance. Ninguna operación de mantenimiento de extremo a extremo está verificada.

## Inventario gradual del resto de la aplicación

El plan pide inventario global gradual; la etapa profunda autorizada sigue siendo mantenimiento. La lectura dirigida `rg --files web/src/app -g page.tsx` identifica **29 entradas de página en código**, no 29 pantallas usables ni el total de estados/componentes. No se infieren roles o tareas efectivas de un nombre de ruta. La adaptación básica desktop/mobile de toda la aplicación sigue pendiente fuera de las capturas indicadas arriba.

| Grupo / rutas presentes en código | Cobertura en esta primera etapa | Qué falta / justificación |
|---|---|---|
| Acceso y shell: `/`, `/inicio`, `/notificaciones` | Observado en estados detallados P01/P02/P10/P16 | Login OIDC, otros perfiles y datos/expiración pendientes |
| Mantenimiento: `/ordenes`, `/andon`, `/unidades`, `/unidades/[id]`, `/unidades/[id]/visitas/[visitaId]` | Observado sólo fallo/restricción y pasos accesibles, matriz M/S | Flujos normales/pendientes/históricos/vacíos exitosos, carga y persistencia inaccesibles |
| Mecánico/CHECK: `/mi-trabajo`, `/checks/[id]` | Bandeja error observada; detalle inaccesible | CHECK usable/habilitado no acreditado; carril separado de capacidades nuevas |
| Inventario relacionado: `/inventario`, `/inventario/stock`, `/inventario/consumo`, `/inventario/movimientos`, `/inventario/pendientes` | Observado fallo en costura con mantenimiento | Casos con consumos/compras/evidencia inaccesibles; módulo completo fuera de esta etapa |
| Gestión de unidades y catálogos: `/unidades/nueva`, `/unidades/[id]/editar`, `/tipos`, `/choferes` | Pendiente; no observado | Inventario documental de rutas, no reparto de permisos confirmado. Profundidad posterior según tareas/dependencias |
| Catálogos de inventario: `/inventario/proveedores`, `/inventario/familias` | Pendiente; no observado | No necesarios para los fallos accesibles de la costura evaluada; revisión de almacén posterior |
| Logística/Flota: `/logistica`, `/flota`, `/flota/unidades/[id]`, `/flota/sitios`, `/flota/ranking`, `/flota/alertas` | No aplicable a sesión actual; pendiente en cobertura global | Siguiente etapa profunda; tareas salida/regreso/historia y permisos a confirmar entonces |
| Configuración: `/configuracion/usuarios`, `/configuracion/alertas` | Pendiente; no observado | Roles/tareas efectivas no comprobados; no incluido en primer sprint de mantenimiento |

Para cada grupo pendiente, desktop/mobile, estados y permisos no observados siguen pendientes individualmente; este inventario no concede cobertura visual o funcional. No se agregan permisos de Administración/Logística por inferencia.
