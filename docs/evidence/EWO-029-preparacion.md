# Evidencia — EWO-029, preparación del sprint

## Resumen

**Preparación; sin implementación, aceptación humana, merge ni despliegue.** Fecha de trabajo 2026-10-11 (America/Los_Angeles; registros de CDP usan UTC). Producto `39ce14db9b287ad46074900e8028b1a127cd166c`; auditoría `ef46c7078fcbfbcf42c7e80b15be1fa831b4efc6`. Rama de preparación `codex/mtto-ux-sprint-1` basada en auditoría; diferencia `web`/`api` con producto **vacía**. Checkout inicial limpio. SPEC/UX/EWO propuestos; aprobación explícita pendiente.

Entorno cloud Debian, Node24.19.0, Chromium headless/CDP; Next dev localhost3000. API no iniciada, DB preexistente no consultada/modificada, no fixtures persistidos ni escrituras públicas. Interceptación `Fetch.fulfillRequest` sólo `/backend` local con respuestas sintéticas. `API_URL` apunta a puerto local sin API para evitar conexiones accidentales. Sesión local development, role picker Supervisor; eso no verifica OIDC ni permisos de cuenta pura.

Fuentes leídas primero AGENTS/ICM, contexto mínimo por etapa; seis documentos + encargo de auditoría recuperados de rama indicada. Consultados E83 (404), E114 (canvas), E148 (Consumo) y E153 (piezas), sin cargar mapas ajenos. Las aprobaciones históricas y EWO-028 no cubren esta ejecución.

## Reproducciones iniciales

[Registro CDP](mtto-sprint-1/baseline-cdp.json), [script reproducible](mtto-sprint-1/reproduce-baseline.mjs), PNG en [carpeta](../screenshots/mtto-sprint-1/). Script requiere Next local3000 y Chromium con remote-debugging9222, perfil temporal, sin Playwright. Fixtures `PRUEBA-UX-001/test-*` sólo existen en memoria del navegador, no son registros de mantenimiento. Los PNG locales usan fallback de Roboto por fallo de descarga; no prueban tipografía pública ni aprobación visual final. Indicador Next dev en capturas iniciales no es DevTools, pero tapa Inicio móvil; retirado sólo como chrome de desarrollo en capturas adicionales, no mediante código de producto.

| Caso inicial / AC | Resultado de reproducción | Evidencia y límite |
|---|---|---|
| H01 Órdenes, error inicial / AC-01 | PASS reproducción; **FAIL comportamiento actual** | `antes_ordenes_error_d1440/m390.png`: 503 + No hay órdenes + sugerencia de crear. |
| H01 relación secundaria / AC-03 | PASS reproducción; **FAIL comportamiento actual** | `antes_piezas_cargando_d1440.png`: línea persistida qty1, catálogo retrasado6s → Sin piezas; catálogo luego responde. Cambio rápido/móvil/documento wizard pendientes. |
| H02 Inicio total/parcial / AC-05 | PASS reproducción; **FAIL comportamiento actual** | `antes_inicio_error_d1440/m390.png`, `antes_inicio_parcial_d1440/m390.png`; error en columna estrecha, fila stock sana intacta. |
| H10 búsqueda cerradas / AC-07 | PASS reproducción; **FAIL comportamiento actual** | `antes_ordenes_filtro_d1440/m390.png`: una orden cargada, búsqueda sin coincidencia → No hay órdenes cerradas, sin Quitar filtros. Caso original 3 correctivos→Preventivo queda pendiente. |
| H04 normal / AC-06 | PASS medición; **FAIL contraste actual** | DOM normal CTA blanco#FFF sobre naranja#EA7515, 14px. Contraste sRGB2.977:1; navy/naranja4.748:1; navy/hover#D4670F3.868:1. Es necesario resolver ambos estados; foco/disabled posteriores no verificados. |
| H12 / AC-08 | PASS propuesta documental; **FAIL capacidad actual por teclado según código/auditoría** | SignaturePad sólo mouse/touch; E114 registra dos canvas. D-FIRMA propone nombre+confirmación, cambios de medio/atribución/versionado explícitos; no implementada ni aprobada. |
| H11 / AC-09 | PASS diagnóstico parcial, **SKIPPED causa pública actual** | E83 evidencia autenticada dos404; OtLink oculta todos los fallos como texto OT corta. GETs actuales sin sesión dan401, no revalidan404. No borrar/reparar/enlazar falsamente. |

## H11 — disposición de referencias

Casos auditados: `f1c4ef48-04cf-4f4e-adeb-ae3a7b0bae2f` y `106f7dce-f53c-424a-ab9c-6e1676a31164`, Supervisor seleccionado en cuenta multirol, GET `/backend/visitas/:id`404 en E83. Efecto: OT corta sin enlace ni explicación; otros casos nuevos sí enlazan.

Causas **posibles, no confirmadas**: ausencia de visita; tipo fuera de `maintenanceTypes` o estado null (predicado de findDetalle); ocultación de borrador a ADMIN_DIRECTIVO efectivo; datos/entorno distintos. GET público autenticado y acceso autorizado a metadatos permitirían discriminar; sesión previa eliminada y entorno actual no contiene conexión/secret público. GET anónimo actual devuelve401 en ambos, por lo que la causa sigue abierta. No inferir que la visita se borró, que exista autorización para recuperar historia ni que todos los registros estén corruptos.

Solución UI propuesta (AC-09): estado por ID `loading/available/unavailable404/forbidden403/error`; mostrar ID y motivo disponible, retry sólo temporal, sin link hasta GET exitoso. 404 dice **Referencia de visita no disponible para este acceso**, sin afirmar borrado; 403 dice acceso restringido. Mantener cantidades/estado/ticket y relacionar visita válida con su unidad real. Diagnóstico read-only posterior sin mutaciones ni SQL cruzado.

## Comandos y gates

| Comando / revisión | Resultado | Alcance |
|---|---|---|
| `git rev-parse HEAD`, `git status --short` inicial | PASS | 39ce14d, limpio. |
| `git fetch origin codex/auditoria-ux-ui-mantenimiento` | PASS | ef46c70 verificado; código web/api no cambia. |
| `git diff 39ce14d ef46c70 -- web api` | PASS | Sin diferencias; se conservó producto. |
| Primer arranque Next dev | FAIL | node_modules incompleto: faltaba jose; fuente Roboto no descargada. |
| `cd web && npm ci --no-audit --no-fund` | FAIL | Cache default fuera de writable root; sin modificación de lockfiles. |
| `cd web && npm ci --cache /tmp/mtto-npm-cache --no-audit --no-fund` | PASS | Dependencias del lock instaladas; no paquetes nuevos. |
| Next dev y `node reproduce-baseline.mjs` por Chromium/CDP | PASS | Reproducción local sintética, picker y click-through, 1440/390. No API/DB. |
| GET público de dos referencias sin sesión | PASS consulta; SKIPPED revalidación autenticada | Ambos401; no prueba de causa ni persistencia. |
| `cd web && npm run lint` / `npm run build` | SKIPPED | Sólo documentos/evidencia, código de producto intacto; obligatorios tras implementación. Fuente/build anterior no se da por verde. |
| API unit/E2E / verify.sh | SKIPPED | No cambio API ni base descartable preparada; no iniciar seeds/synchronize ni tests destructivos contra DB preexistente. Obligatorios pertinentes en ejecución. |
| proof-ui antes/después final | SKIPPED | Hay baseline parcial; no hay cambios aprobados ni después. Completar matriz y comparación tras aprobación. |
| ux-auditor independiente | PASS revisión documental limitada | [Informe independiente](mtto-sprint-1/ux-auditor-preparacion.md): OK para presentar paquete; producto actual no OK; pase posterior obligatorio. |
| Usuarios, lector real, móvil físico, cámara, zoom completo | SKIPPED | Sin participantes/dispositivo; no aceptación UX humana. |

## Estado por criterio canónico

AC-01 FAIL producto en Órdenes y Consumo, resto cobertura pendiente; AC-02 FAIL legibilidad/recovery parcial aunque conserva filas sanas; AC-03 FAIL; AC-04 SKIPPED matriz de vacío verdadero/success completa; AC-05 FAIL también d1024; Roboto real pendiente; AC-06 FAIL normal, resto SKIPPED; AC-07 FAIL, matriz original/tipo/recovery SKIPPED; AC-08 PASS **preparación**, no firma accesible implementada; AC-09 parcial, UI actual FAIL y causa SKIPPED; AC-10 SKIPPED persistencia/recorrido propio (fixtures CDP no cuentan); AC-11 SKIPPED recorrido teclado/roles completos. Ninguno equivale a cierre del sprint.

## Handoff

[Paquete EWO-029](../engineering-work-orders/EWO-029.md), [SPEC](../specs/SPEC-MTTO-UX-001.md), [UX](../design-system/ux-mantenimiento-sprint-1.md). Preparación autorizada realizada, núcleo pendiente de aprobación, H12/D-A04 pendiente de decisión. No cambios a web/src/api/src, permisos, datos, reglas ni runtime público. Próximo paso: aprobación concreta del núcleo o ajuste de alcance; mantener diagnóstico read-only H11 independiente.

## Reproducción adicional concluida

[Registro adicional CDP](mtto-sprint-1/baseline-additional-cdp.json) y [script](mtto-sprint-1/reproduce-additional.mjs). H01 Consumo: Movimientos503 + pendientes200 con4 piezas → UI muestra0stock+0externo/No hay consumo; luego ambas fuentes200 →1stock+4externo. **PASS reproducción / FAIL comportamiento actual**, confirmado d1440/d1024/m390 con PNG `antes_consumo_error_*` y `antes_consumo_recuperado_*`. Recovery fue recarga manual, no botón existente; B12 permanece pendiente. H02 parcial también d1024 confirmado (`antes_inicio_parcial_d1024.png`): columna de error36px y fila normal conservada. Roboto local fallback aún limita revisión tipográfica.

El script adicional se corrigió para ignorar InterceptionId cancelado al navegar; ese fallo del harness no es fallo de producto. No ocultó estados de app; retiró sólo indicador Next de desarrollo.

Verificación documental de enlaces locales de SPEC/UX/EWO/evidencia: **PASS**, ninguno faltante. Git diff check: **PASS**. Revisión experta independiente incorporada y recomendación d1024 ya dispuesta; pruebas humanas **SKIPPED**.
