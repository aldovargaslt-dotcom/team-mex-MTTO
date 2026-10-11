# SPEC-MTTO-UX-001 — Sprint 1: estados fiables y recuperación de mantenimiento

## Status

**Approved — núcleo autorizado por el usuario («Si, autorizo», chat, 2026-10-11); D-FIRMA sigue Proposed y fuera de implementación.** Preparado por petición del usuario el 2026-10-11. Fuente de prioridades: solicitud del chat. Auditoría leída desde `ef46c7078fcbfbcf42c7e80b15be1fa831b4efc6`, rama de origen `codex/auditoria-ux-ui-mantenimiento`; README, informe, hallazgos, backlog, matriz, fichas y encargo revisados. Ninguno aprueba implementación. Rama de preparación `codex/mtto-ux-sprint-1`, basada en ese commit; `web`/`api` idénticos a 39ce14d.

## Problema y objetivo

Encontrar → reanudar → capturar → revisar → cerrar → reconstruir exige distinguir ausencia real de una consulta incompleta. El código actual de Órdenes convierte fallos en listas vacías, muestra piezas antes de hidratar su relación y confunde ausencia por filtro con ausencia de órdenes. Inicio restringe la fila de error a la columna de icono. Texto blanco sobre naranja de marca tiene contraste insuficiente.

Base: `39ce14db9b287ad46074900e8028b1a127cd166c`, rama `work`, inicialmente limpia. No hay diferencia de commit con la auditoría declarada; eso no demuestra igualdad con la instancia pública. Evidencia: [EWO-029](../evidence/EWO-029.md).

## Alcance aprobado del núcleo

1. H01/B10: estados por recurso en Inicio, Órdenes (lista, detalle y piezas), Nueva orden (unidades/choferes), documento cerrado del wizard, Unidades, Existencias, Consumo (movimientos y pendientes), Movimientos, Por recibir, Andon y Alertas/campanita en los roles ya autorizados. Es un inventario explícito de superficies H01; no modificar CHECK ni vistas Logística. Recuperación por recurso, sin vaciar datos válidos de fuentes sanas; datos previos sólo con aviso de desactualización. En capturas actuales, impedir afirmar disponibilidad/ausencia mientras falla el catálogo que la soporta. No cambiar validaciones ni permitir guardar cantidades basándose en stock desconocido.
2. H02/B11: fila de error de Inicio con estructura propia y ancho de texto suficiente; mantener exactamente el patrón y estructura de filas normales.
3. H04/B13: texto navy sobre naranja normal, hover naranja claro con contraste comprobado; indicadores de foco con contraste ≥3:1. Conservar Roboto, navy `#24284D`, naranja `#EA7515` y componentes actuales. Actualizar documentación del par de colores afectado, sin sustituir el sistema visual. Revisar consumidores compartidos para evitar overrides blancos. La variante Button compartida afecta otros consumidores: inventariar y probar sus pares/estados antes de aprobar el diff; no dar por auditada una pantalla por cambiar un token.
4. H10/B16b: vacío por búsqueda/tipo distinto de vacío de la cola y de ausencia global; acción **Quitar filtros** en búsqueda/tipo, conserva cola y rol. Si otra cola autorizada tiene resultados, ofrecer cambiar de cola sin afirmar ausencia global.
5. H12/B16a: preparar propuesta accesible concreta, contrato, dependencias y criterios; **no implementar ni dar por aprobada la equivalencia**. Ver decisión D-FIRMA abajo.
6. H11/B17a: diagnóstico independiente y presentación de disponibilidad en OtLink para Movimientos/Por recibir. Conservar identificador, distinguir carga/404/403/fallo transitorio y enlazar sólo resultados válidos. Sin reconstruir historia ni modificar datos. Causa pública permanece desconocida hasta acceso read-only confiable; 404 puede enmascarar ausencia o restricción.

Actores: Supervisor en captura; Supervisor y Administrador en lectura según permisos existentes. Mecánico y Logística no reciben nuevas acciones ni navegación.

## Comportamiento y estados

Cada consulta conserva identidad de recurso/rol y estado `loading / ready / empty / error / partial`. Una relación tiene su propio estado: no depende de que ya exista el detalle padre. Desechar respuestas tardías de otro recurso/rol; limpiar selección visual incompatible al navegar, sin borrar trabajo guardado.

- Carga inicial: texto específico y región `aria-busy`; no cero, ausencia, ni skeleton obligatorio.
- Éxito: datos confirmados de ese recurso; cuentas sólo sobre datos cargados. Parcial: conservar filas sanas y avisar qué fuente/unidades faltan; cero filas cargadas no implica cero global.
- Error inicial: contexto + **Reintentar**, sin bloque vacío simultáneo. Reintento conserva filtros y selección válida; foco permanece en el control y resultado se anuncia con `role=status`.
- Relación piezas: usar líneas persistidas para cantidad y origen incluso si faltan nombres de catálogo; mostrar **Nombre de refacción no disponible** y **Reintentar piezas**. Stock ausente es desconocido, nunca `0`. Documento no se pierde porque falle Inventario.
- Vacío: sólo después de éxito completo. Distinguir catálogo global, cola y búsqueda/tipo. URL y botón **Quitar filtros** borran `q` y `tipo`; cola y permisos permanecen.
- Recuperación de guardado/cierre: conservar datos introducidos, anunciar fallo y permitir reintento manual; no repetir automáticamente escrituras ni cierre.

## Reglas y fronteras

Se preservan `RECIBIDA`, regla vigente de ticket sin introducir ni retirar obligatoriedad, mantenimiento preventivo, firmas CHOFER y JEFE y reglas de cierre/stock. Comprobante de COMPRA_EXTERNA no es entrada de stock. Nada de permisos, migraciones, datos históricos, CHECK, Logística, indicadores, costeo o refactors generales. Animaciones, transiciones y skeletons diferidos.

Mantenimiento e Inventario mantienen ownership y composición UI de IDs opacos (ADR-001/002). Propuesta visual no modifica API; D-FIRMA puede requerir una SPEC/ADR y EWO posteriores. No cambiar archivos de CHECK por reutilización de SignaturePad.

## D-FIRMA — propuesta que requiere decisión de producto

**Propuesta concreta:** cada firmante obligatorio puede elegir **Firmar con nombre y confirmación**. El formulario accesible presenta la visita/unidad, trabajos, consumos y evidencia que está aceptando; solicita nombre completo del firmante y una confirmación explícita inicialmente desmarcada: **Confirmo que revisé esta visita y que esta es mi firma como chofer/jefe.** Acción **Confirmar firma**, posibilidad de revisar/borrar antes del cierre, resumen textual posterior de quién firmó y con qué método. Campos y errores accesibles por teclado/lector, sin dibujar ni depender del canvas. Se requieren las dos firmas y el cierre sólo se habilita con ambas válidas. Cambiar el contenido firmado invalida la confirmación correspondiente; determinar qué campos lo componen antes de aprobar.

Esto preserva intención de aceptación y dos posiciones obligatorias, pero **cambia el medio de firma manuscrita a firma electrónica nominal**: no está autorizado ni se afirma equivalencia jurídica/operacional. No dibujar texto en PNG para simular la firma actual. Persistir explícitamente método, nombre declarado, posición, intención, fecha y vínculo/versionado del contenido; no atribuir al chofer la identidad de la sesión del Supervisor. Conservar firmas manuscritas anteriores y lectura actual. Identidad verificada del firmante, firma asistida o autenticación separada quedan como decisiones explícitas, sin deducirlas del rol. Si la regla exige trazo manuscrito exclusivamente, esta opción no cumple y deberá acordarse otra vía asistida con participantes reales.

**Decisión requerida:** ¿se acepta nombre + confirmación por cada firmante como equivalente operacional y qué atribución se exige? Antes de implementar: decisión owner, análisis de contrato/ADR, seguridad, preservación de antiguos registros y prueba con usuarios con necesidades de acceso. Estimación separada; aprobación del núcleo no aprueba D-FIRMA.

## Criterios canónicos y plan de prueba

| ID | Dado / cuando / entonces | Verificación necesaria |
|---|---|---|
| AC-01 | Consulta inicial pendiente o fallida → no aparece cero ni “No hay”; error específico y reintento accesible. | Forzar latencia/503 por cada superficie en desktop/móvil. |
| AC-02 | Una fuente o unidad falla → filas sanas permanecen, falta identificada, sin total/ausencia global; reintentar recupera. | Inicio y lista Órdenes; fallo parcial con/sin filas. |
| AC-03 | Visita cargada y catálogo de piezas pendiente/fallido → no “Sin piezas”, cantidades/origen persistidos legibles, estado y recovery propios. | Primera apertura, cambio rápido de orden, falla/recovery y documento cerrado. |
| AC-04 | Todas las fuentes cargan sin filas → vacío verdadero pertinente; datos cargados → filas y contadores correctos. | Cero real, cola vacía con otra cola poblada, éxito normal. |
| AC-05 | Inicio muestra error → texto legible sin columna de 36px; filas normales conservan estructura; foco/reintento legibles. | 1440×900, 1024×768 y 390×844, error total/parcial + normal. |
| AC-06 | Acción en estados normal/hover/foco → texto ≥4.5:1, foco e identificación necesaria ≥3:1; navy/naranja/Roboto conservados. | Valores calculados + estilos computados + screenshots; disabled distinguible. |
| AC-07 | Búsqueda/tipo oculta filas existentes → “Sin coincidencias con estos filtros”; Quitar filtros devuelve resultados, conserva cola/rol y actualiza URL. | Caso original: 3 borradores Correctivo→filtro Preventivo→0 coincidencias→Quitar filtros→3; además sólo texto, sólo tipo, ambos, teclado y móvil; Atrás conserva navegación coherente. |
| AC-08 | Se prepara alternativa de firma → propuesta describe dos firmantes, consentimiento, persistencia, atribución, revisión y limitaciones; ninguna regla implementada sin aprobación. | Revisión documental y decisión owner; no se contabiliza como firma accesible ya entregada. |
| AC-09 | Referencia visita falla → diagnóstico registra rol/status/ruta sin PII, distingue hipótesis; UI diferencia carga/404/403/transitorio, conserva ID y sólo enlaza visita disponible; no se reescriben datos ni historia. | GETs read-only de los IDs E83 cuando haya sesión autorizada; propuesta loading/404/403/error/retry. |
| AC-10 | Supervisor usa registros propios identificados PRUEBA-UX-SPRINT1 → guarda/reanuda, consume stock suficiente, rechazo insuficiente sin cierre/consumo, compra externa, ticket/evidencia, dos firmas actuales, cierre y consulta persistidos. | API/DB descartable, click-through + readback unidad/visita/trabajos/consumos/fotos/firmas y movimientos; comprobante no añade stock. |
| AC-11 | Navegación por rol y teclado → sin nuevas capacidades, foco visible/restaurado al cerrar overlays/limpiar filtros, targets móviles 44px, sin pérdida de captura. | Supervisor/Admin, teclado Tab/Enter/Escape, shell y overlays pertinentes. |

## Referencias y dependencias

[UX](../design-system/ux-mantenimiento-sprint-1.md), [EWO](../engineering-work-orders/EWO-029.md), [Mantenimiento](../../domain/mantenimiento/CONTEXT.md), ADR-001/002/003 y ADR-004 C/O/I. SAP/Fiori inspira estado de objeto, message strip, lista filtrable, mensaje de ausencia contextual y trazabilidad; usar componentes Team Mex equivalentes, sin instalar Fiori/Carbon/Material ni cambiar flujo. Carbon/Material complementan mensajes/foco. Taste no es gate.

Dependencias resueltas: seis documentos leídos; commit de auditoría verificado, código de producto sin diferencias. Evidencia afectada E83/E114/E148/E153 consultada, sin cargar mapas ajenos. No se encontró SPEC/EWO aprobado que cubra este sprint: EWO-028 autoriza consolidación anterior, no estas correcciones. Núcleo SPEC/UX/EWO-029 aprobado en este chat. Pendientes: D-A04/D-FIRMA y acceso autenticado read-only para verificar causa H11. Instancia identificada en informe; sesión anterior eliminada, no reutilizada ni credenciales copiadas. PRD nuevo no requerido: corrección de recorridos existentes; D-FIRMA fuera de implementación de este núcleo.

## Reconciliación con auditoría

H01 incluye E148 (Consumo, movimientos fallidos → 0+0 falso) y E153 (piezas cargando). H02 E143/E144; H04 E150; H10 E94; H11 E83; H12 E114. B12 sólo recuperación de las lecturas listadas; B14 retorno de foco de Nueva orden incluido por ser parte de AC-11; B16d jerarquía de Adjuntar ticket como secundario incluida en Por recibir, sin cambiar regla de comprobante. B15 navegación Mecánico, H13/H14 semántica, B17c indicadores/drill-down y H07 motion quedan fuera. Contradicciones H09 no autorizan ampliar capacidades. No usar registros AUD-UX de auditoría como pruebas nuevas ni como historia real.
