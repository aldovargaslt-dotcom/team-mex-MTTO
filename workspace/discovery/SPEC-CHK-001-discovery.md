# 1. Executive summary

Discovery de `SPEC-CHK-001`, sobre commit `bdafcd8` (`Merge pull request #83`). Estado: **propuesta para revisión; no implementación ni decisiones de arquitectura aprobadas**. Se inspeccionó código, contratos, entidades, pruebas y documentación; no se consultó una base de datos desplegada. El estado descrito es el del checkout, no una certificación de producción.

Entradas: SPEC y handoff adjuntos, dos copias idénticas del DESIGN adjunto y siete pantallas visibles en la conversación. Los adjuntos están en `/workspace/attachments/`; no se incorporaron como SPEC/ADR aprobados al repositorio. No existe `docs/design/check-operativo/` en este checkout. Las pantallas se identifican por su orden y contenido, sin afirmar que sus PNG estén persistidos en el repo.

La SPEC determina el comportamiento objetivo; el código y los ADRs determinan restricciones y estado actual. DESIGN determina la intención visual del incremento. Las contradicciones se registran y no se convierten silenciosamente en decisiones.

**Conclusión:** el feature requiere una evolución de Mantenimiento, autorización e integración con Flota/Logística. No es un cambio de formulario. Existen piezas reutilizables —Visita, transacciones, índice parcial, outbox, pads táctiles, cámara, categorías A–E, tablas y diálogos—, pero faltan CHECK, hallazgos, dictamen, asignación, almacenamiento privado, scheduler, readiness y documentos/póliza.

Los cinco riesgos principales son:

1. ADR-015 impone un borrador por unidad para todo mantenimiento; la SPEC permite múltiples PREVENTIVE/CORRECTIVE. Hay que aprobar su sustitución parcial, no conservar el índice anterior sin revisar su predicado.
2. `VisitaCerrada` alimenta Inventario, Andon y Salud. Cerrar un CHECK no debe equivaler a haber realizado mantenimiento ni reiniciar su cadencia.
3. Solo existen roles SUPERVISOR, ADMIN_DIRECTIVO y LOGISTICA con autenticación stub. No hay usuarios/técnicos identificados de forma confiable para una cola propia o una firma atribuible.
4. No existe módulo de pólizas/documentos ni validación de vencimiento. La regla que la SPEC pide preservar es funcionalidad nueva en este checkout.
5. Los viajes de Logística y movimientos de patio tienen ciclos independientes. Su relación con CHECK debe explicitarse; no sincronizarlos como efecto lateral del nuevo tablero.

Recomendación: extender el agregado existente en `api/src/visitas`, con una extensión CHECK y contratos específicos; conservar APIs y formulario de mantenimiento mediante compatibilidad explícita. No crear un segundo catálogo de unidades ni declarar un nuevo bounded context de inspecciones. La decisión definitiva de modelo y ownership requiere ADR.

Verificación de esta ejecución: lectura y contraste de fuentes **PASS**; estado inicial de git limpio **PASS**; tests, builds, E2E y ejecución UI **SKIPPED** porque el entregable es discovery y no se cambió implementación. Las pruebas existentes se localizaron, no se ejecutaron. No se afirma aprobación visual de la UI actual.

# 2. Current-state architecture

API NestJS + TypeORM + PostgreSQL; web Next.js App Router + React + shadcn/Tailwind y TanStack Table. Monolito modular, integración por puertos y outbox. ADR-002 prohíbe FKs/JOINs entre módulos; Flota usa IDs opacos hacia Kernel/Mantenimiento. No Prisma, SQLite ni servicio de inspecciones independiente.

Rutas de esta sección son relativas a `/workspace/team-mex-MTTO`. “Canonical” describe el ownership actual; las tarjetas de dominio siguen provisionales salvo las decisiones explícitas de los ADRs.

| Concepto | Estado, tablas y archivos principales | API / frontend | Pruebas / condición |
|---|---|---|---|
| Vehicle / Fleet identity | `api/src/unidades/unidad.entity.ts`, `unidades.service.ts`; `public.unidades`, `tipos_vehiculo`; UUID, número interno, placas, VIN, tipo, foto | `/unidades`, `/unidades/:id/hub`, `/unidades/tipos`; `web/src/app/unidades/`, `UnidadForm`, `UnidadTipoMark` | `api/test/slice1.e2e-spec.ts`, `catalogo-demo.e2e-spec.ts`; canonical Kernel |
| Movement / yard Fleet | `api/src/flota/flota-engine.ts`, `flota-rules.ts`, `typeorm-flota-store.ts`; `flota.movimientos`, `movimiento_firma`, `unidad_operativa`, `sitios` | `POST /flota/movimientos`, `GET /flota/tablero`, `/flota/unidades/:id`, `/flota/movimientos/hoy`; `web/src/app/flota/unidades/[id]/page.tsx` | `flota-engine.spec.ts`, `api/test/flota.e2e-spec.ts`; canonical patio |
| Logistics journey | `api/src/logistica/logistica.service.ts`, `logistica-rules.ts`; escribe `public.unidades.ops_estado`, `salida_at`, `ambito`, `destino`, `chofer_id`; no schema propio | `/logistica/unidades`, `/logistica/salidas/:id`, `/logistica/regresos/:id`; `LogisticaDashboard`, `/logistica`, `/flota` | `logistica-ops-rules.spec.ts`, `logistica-rules.spec.ts`, `api/test/logistica.e2e-spec.ts`; canonical ciclo independiente |
| WorkOrder / Maintenance | `api/src/visitas/visita.entity.ts`, `visitas.service.ts`, `enums.ts`; `public.visitas`, `visita_trabajos`, `visita_piezas` | `POST /unidades/:id/visitas`, `GET/PATCH/DELETE /visitas/:id`, `POST /visitas/:id/cerrar`; `/ordenes`, `/unidades/[id]/visitas/[visitaId]` | `close-rules.spec.ts`, `visitas-invariant.service.spec.ts`, `slice2.e2e-spec.ts`; Visita es el agregado canonical detrás de “Orden” |
| Inspection / Checklist | No inspección técnica persistida. `trabajos-catalogo.ts` es selección de trabajos A–E, no condición física | `/catalogo/trabajos`; wizard de mantenimiento | `trabajos-catalogo.spec.ts`; Salud tiene dimensión inspections con soporte N/A, no un CHECK implementado |
| Finding | No entidad, clasificación, preparación ni trazabilidad a correctiva | Observaciones libres de Visita no equivalen a un hallazgo | NEW |
| Signature | `visita-firma.entity.ts`: CHOFER/JEFE; `flota/entities/movimiento-firma.entity.ts`: CHOFER/AVAL; Data URL y createdAt | `web/src/components/SignaturePad.tsx`, integrado en wizard y movimiento | Cierre en `slice2.e2e-spec.ts`; movimiento en `flota.e2e-spec.ts`; canvas reutilizable, persistencia insuficiente para CHECK |
| Evidence / uploads | `visita-foto.entity.ts`: Data URL, id, createdAt; máximo 8 en `dto/update-visita.dto.ts`; foto de catálogo aparte en Unidad | `ImageDropzone`, `OrdenCaptura`, wizard, PATCH completo de fotos | DTOs y E2E de visitas; no object storage/upload pipeline |
| Document / policy | No tabla ni servicio de documentos/póliza encontrado; no fecha de vencimiento en Unidad | Sin API/UI de vigencia | NEW; no afirmar que la validación ya existe |
| Role / Permission | `api/src/auth/{auth.guard,roles.guard,roles.enum,current-user}.ts`; X-Role y X-User-Id opcional; sin entidad User | `web/src/lib/role.tsx`, `RoleGate`, selector localStorage y `AppShell` | Roles en slice1/slice2/flota/logistica E2E; canonical stub, no identidad autenticada |
| Vehicle State | `common/estado-unidad.enum.ts`: ACTIVA/INACTIVA; `ops-estado-unidad.enum.ts`: DISPONIBLE/EN_RUTA; patio aporta salida abierta y sitio | Tablero y badges de catálogo/viaje | Dos semánticas explícitas; no enum EN_PATIO/EN_TALLER persistido |
| Operational Readiness | No cálculo Lista/Pendiente/Bloqueada/Despachada; Salud es un score distinto | UI filtra ACTIVA + DISPONIBLE para salida; no evidencia de aptitud técnica | NEW; no convertir score en readiness |
| Blocking rules | `visitas/close-rules.ts`, `flota/flota-rules.ts`, `logistica/logistica-rules.ts`; cierre exige unidad activa, chofer, km, tipo, trabajo y dos firmas; Andon al salir es aviso suave | Guards y APIs; no `blocks_operation` | C/O/F/L existentes; no bloqueo por correctiva o póliza |
| Scheduler / Jobs | Sin scheduler/cron/worker de CHECK, ni dependencia `@nestjs/schedule`. Alertas sin regreso se evalúan al listar/mutar Logística | No command runner de generación diaria | NEW; evaluación por lectura no es un job |
| Audit | createdBy/createdAt/updatedAt/cerradoAt; historial de movimientos. Auditoría de duplicados antes de índice en `visitas-invariant.service.ts` | No ledger completo de eventos CHECK | La auditoría de índice no sustituye auditoría de negocio |
| Events / outbox | `api/src/kernel/outbox/outbox.service.ts`, `outbox-event.entity.ts`; `public.outbox_events`; handlers síncronos con manager | `kernel/events/visita-cerrada.ts`; consumidores Inventario, Andon, Salud | `outbox.service.spec.ts`, `visita-cerrada.spec.ts`, `api/test/assert-visita-cerrada-outbox.ts`; no dispatcher periódico de pendientes |
| Notifications | Schema `notifications`, inbox/read/dedupe; `notifications.service.ts`, adapters, engine, enums | `/notifications`, badge/read/read-all; `Campanita` y `/notificaciones` | `inbox-engine.spec.ts`, `notifications.e2e-spec.ts`; productores CHECK y segmentación por rol faltantes |
| Realtime | `Campanita.tsx` hace polling cada 20 s. Dashboard y Órdenes cargan al montar/actuar; no SSE/WebSocket encontrados | Fetch mediante `web/src/lib/api.ts` | No garantía de progreso en vivo del CHECK |
| DB preparation / migrations | `db/postgres-options.ts`: synchronize default true; `ensure-schemas.ts` crea schemas; índice de Visita se instala en bootstrap | Sin directorio de migrations versionadas ni scripts de migración en package API | ADR-015 describe preparación focal; política general de producción UNKNOWN |

Catálogo A–E: cinco categorías, once ítems; no configuración de ejes, posiciones o tolerancias PSI. `OrdenCaptura` permite piezas/fotos en abiertas; mantenimiento mantiene siete pasos. `/ordenes` carga unidades y después visitas por cada unidad (N+1), no una consulta global paginada. No asignación de técnico ni prioridad persistida.

Documentación que requiere cautela: AGENTS, DESIGN raíz y tarjetas históricas dicen nav Logística solo `/flota`; `AppShell` y SPEC-LOGISTICA-DASHBOARD-001 aprobada implementan Inicio `/logistica` + Movimientos `/flota`. Se usa el código y SPEC más reciente para describir el estado actual, registrando el desfase.

EWO-011 está Closed con evidencia histórica de pruebas. EWO-012/013 están Verification con proof/PNG/Visual QA pendientes; EWO-014 está Proposed. Ninguno autoriza este nuevo dominio CHECK ni se amplía su alcance desde discovery.

# 3. Domain mapping

| SPEC | Concepto real / dirección propuesta | Restricción |
|---|---|---|
| vehicle_id | `Unidad.id`, llamado `unidadId` en contratos actuales | No nueva tabla Vehicle; resolver catálogos por su dueño |
| WORK_ORDER | Actualmente `Visita`, UI “Orden” | Evolucionar el agregado, no sustituir silenciosamente el significado de WO |
| PREVENTIVE | Persistencia `TipoVisita.PREDICTIVO`, UI ya lo muestra “Preventivo” por EWO-012/013 | La etiqueta ya está resuelta; la normalización de datos/enum es una migración explícita |
| CORRECTIVE | `TipoVisita.CORRECTIVO`, con trabajos/piezas/chofer y firmas CHOFER/JEFE | Una preparada no debe exigir diagnóstico/trabajos/horario para nacer |
| CHECK | Nueva extensión del agregado, `work_order_type=CHECK` | Reglas distintas de mantenimiento; jamás heredar ≥1 trabajo A–E o doble firma del wizard |
| PENDING/ASSIGNED/IN_PROGRESS | No equivalente persistido; BORRADOR engloba abiertas | No inventar autor/asignado/iniciado en históricos |
| COMPLETED/CANCELLED | CERRADO representa cierre de mantenimiento; cancelación no existe | Migrar con compatibilidad; cancelar no debe borrar el registro |
| FIT/FIT_WITH_OBSERVATION/UNFIT | Resultado nuevo, distinto de status y score Salud | COMPLETED + UNFIT es válido; no deducir UNFIT por “correctiva” |
| Condition / PSI | Nuevos hechos físicos y configuración de llantas | Confirmación humana explícita; cálculo de rangos en backend |
| Finding | Derivado determinísticamente de condición | Origen estable; editar condición no genera duplicados ni deja clasificaciones obsoletas |
| blocks_operation | Propiedad nueva de mantenimiento | Razón/actor y auditabilidad; tipo CORRECTIVE no es bloqueo |
| Operational date | Fecha operativa nueva | No asumir jornada a medianoche del host o zona del usuario |
| Signature | Canvas existente; nueva firma mecánica y snapshot técnico | Chofer/aval del movimiento y chofer/jefe de mantenimiento siguen siendo firmas distintas |
| State / Readiness / Check / Urgency | Read model compuesto desde dueños actuales y CHECK | Ningún `status` único debe mezclar los cuatro ejes |

Se propone ownership de condición, evidencia, hallazgos y firma CHECK en Mantenimiento, junto al agregado existente. Flota conserva movimiento/custodia; Logística compone lectura y coordina salida; Kernel conserva identidad. Es una propuesta, no una reclasificación DDD aceptada. Documents necesita definir dueño mínimo para póliza, sin catálogo documental general fuera de alcance.

# 4. Gap analysis

Leyenda: EXISTS = capacidad requerida ya presente; EXTEND = reutilizable pero incompleta; CHANGE = comportamiento existente incompatible; NEW = ausente; UNKNOWN = política o estado no demostrable. Riesgo A/M/B = alto/medio/bajo. Rutas y símbolos constituyen evidencia estática, no prueba ejecutada.

| Requisito SPEC / AC | Estado y evidencia | Archivos afectados propuestos | Riesgo / dependencia / comentario |
|---|---|---|---|
| §1–2 tipos CHECK/PREVENTIVE/CORRECTIVE | CHANGE: `visitas/enums.ts` solo PREDICTIVO/CORRECTIVO | Visita, enums, DTOs, web types/format | A; ADR de evolución y compatibilidad; UI Preventivo ya existe |
| §2.2 cinco orígenes | NEW: Visita no tiene source | Extensión CHECK, create DTO/command | M; validar origen por caller autorizado, no aceptar DAILY desde cliente arbitrario |
| §3,18 cola propia/roles | CHANGE: auth stub, sin Mecánico ni asignado; roles actuales en guards | auth, identidad, CHECK permissions, role/AppShell | A; decisión identidad/rol y reglas claim/asignación |
| §3,14 firma chofer independiente | EXTEND: Flota CHOFER+AVAL ya obligatorias; no vínculo CHECK | Flota DTO/entity/service, CHECK read port | A; conservar ambas firmas y definir vínculo al ciclo correcto |
| §4 lifecycle y resultado | CHANGE: BORRADOR/CERRADO; no result | Visita/enums, CHECK engine y DTOs | A; no inferir etapas históricas; separar cierre de aptitud |
| INV-001, AC-01, §12,16 | CHANGE: índice único BORRADOR global y outcome 200 EXISTING_DRAFT | invariant, create CHECK, QueryFailed handling | A; CHECK necesita índice parcial por tipo/status y 409 enriquecido; mantener contrato legacy |
| INV-002, AC-02 múltiples mantenimientos | CHANGE: ADR-015/`createDraft` impiden segundo mantenimiento | invariant, VisitasService.createDraft, hub, selectores | A; supersession aprobada + selector cuando ya no hay un único borrador |
| INV-003, AC-08 | NEW: no blocks_operation ni readiness | Visita, reglas operativas, Logística | A; no convertir CORRECTIVO ni Andon vencido en bloqueo por tipo |
| INV-004, AC-09, §10.4 | EXTEND: requireDraft impide editar cerrada a nivel servicio | check commands, DB guards, evidencia/firma | A; update/delete actuales no toman lock compartido con cierre; falta protección de hijos y objetos |
| INV-005, §11 | NEW: no scheduler/date/idempotency | daily command, runner, registro generación | A; jornada/elegibilidad y despliegue por definir |
| INV-006, AC-06, §9.1 | NEW: observaciones libres no derivan hallazgo | condition/finding rules + entidades | M; upsert por origen estable y revision; no doble captura |
| §6 exactamente cuatro pasos | CHANGE para CHECK: wizard actual tiene siete | CheckWizard, VisitStepper | B; mantener siete para mantenimiento; progreso backend específico |
| §7.1–7.2 fluidos/fugas | NEW: A–E contiene trabajos, no estados físicos | ConditionStep, DTO/engine | M; sólo aceite, agua aplicable, refrigerante y fugas; sin preconfirmación |
| §7.3 PSI/estado llantas | NEW: no posiciones ni rangos | unidad/tipo config vía puerto; CHECK tires | A; datos aprobados por unidad/tipo, unidades PSI, extremos y ausencia de config; no usar valores mock |
| §8.1, AC-03/04 min2 max5 | CHANGE: fotos visitas ≤8, sin mínimo de cierre | CHECK evidence command + UI | A; regla exclusiva de CHECK; serializar registro de uploads para no admitir sexta concurrente |
| §8.2, AC-05 cobertura | NEW: VisitaFoto no tiene tags | evidence metadata/rules/step | M; unión de tags puede satisfacer tres conceptos con dos fotos; sin OCR obligatorio |
| §8.3 storage privado/metadata | CHANGE: Data URL en public.visita_fotos y firmas | storage port/adapter, evidence/firma entities | A; proveedor/retención por decidir; MIME/bytes/hash/actor/time verificados en servidor |
| §9.2 clasificación | NEW: sin Finding | finding engine/entity/DTO | M; OBSERVATION/FIXED_DURING_CHECK/REQUIRES_WORK auditables |
| §9.2, AC-07 preparar Corrective | EXTEND: existe visita CORRECTIVO, pero exige chofer/km/tipo al crear | prepared action + mantenimiento factory | A; preparación sin inventar diagnóstico/partes/asignado; creación al cierre depende opt-in |
| §10.1 revisión exception-first | NEW: Confirmar actual es mantenimiento | ReviewStep, summary DTO | M; normales compactos y excepciones expandidas; detalles bajo disclosure |
| §10.2 propuesta dictamen/override | NEW | result rules + reason/audit + review UI | A; matriz técnica UNFIT y overrides no resueltos; firma confirma valor visible |
| §10.3 canvas táctil | EXTEND: `SignaturePad` dibuja mouse/touch a PNG 640×180 | SignaturePad + blob transport + signature service | A; no hay hash snapshot ni actor fiable; canvas puede emitir PNG vacío si no hubo trazo |
| §10.4 cierre atómico | EXTEND: VisitasService.close + Outbox transaction | CHECK complete command, Corrective factory, outbox | A; firma/evidencia deben corresponder a revision firmada; blob store fuera de txn SQL |
| §12 manual y modal | EXTEND: patrones Dialog/Sheet y NuevaOrdenDialog; errores fetch pierden body | CHECK create/controller, `web/src/lib/api.ts`, ActiveCheckDialog | M; conservar error code y detalle ganador para deep link, sin formulario deshabilitado |
| §13, AC-10 cuatro ejes Torre | NEW sobre listUnidades/filaTablero reutilizables | Logística read model, reglas, /flota y dashboard | A; EN_RUTA ⇒ Despachada; bloqueo/aptitud no cambia custodia; freshness visible |
| §13 urgencia/KPI bloqueadas | NEW: SIN_REGRESO actual no es prioridad completa | read-model filters/KPIs | A; derivación de urgencia pendiente; conteos de unidades únicas por causas bloqueantes |
| §14 check-out/check-in | EXTEND: dos ciclos existentes con firma patio, sin CHECK ref | Flota+Logística+CHECK ports | A; no sincronizar loops ni sustituir aval; validar todos los puntos de salida |
| §15, AC-11 póliza <=CURRENT_DATE | NEW: búsqueda en source/test no encuentra póliza/vencimiento | documents policy owner, salida guards | A; dueño, zona fecha, documento faltante y transacción por definir |
| §17, AC-12 auditoría | EXTEND: timestamps/outbox existentes, sin ledger CHECK | CHECK audit append-only + eventos | A; actor/motivo/source e invalidación sin editar contenido firmado |
| §18 Admin configuración/read audit | EXTEND: admin catalog y lectura; sin config CHECK | config endpoints + permissions | M; Admin no modifica firmados; verificar permisos en API |
| §19 conservar mantenimiento A–E | EXISTS: catálogo 5 categorías/11 ítems y wizard | Reusar catálogo y wizard; adaptar sólo contratos necesarios | M; proteger fotos8/piezas/doble firma de mantenimiento, no aplicar reglas CHECK |
| §20–21 aceptación/tests | EXTEND: Jest rules+E2E y proof UI; no tests CHECK | check specs/E2E, regresiones existentes | A; trazabilidad propuesta en §11; ningún AC nuevo validado aún |
| §22 políticas pendientes | UNKNOWN: repo no establece vigencia, invalidación o UNFIT | política/ADR/config después decisión | A; §13 del informe; no resolver desde imágenes |
| §23 no-goals | EXISTS como límite solicitado; repo excludes inspections v0 | Contexto/SPEC/ADR de incremento | M; nuevo alcance debe quedar aprobado; sin IA/OCR/telemetría/scheduling completo |
| §24 slices con evidencia | EXTEND: WORKFLOW/EWO/evidence existen | Nuevos EWOs tras revisión | B; no reutilizar EWO-011/014 para este feature |

Conflictos materiales:

| ID / clasificación | Contradicción y evidencia | Tratamiento propuesto |
|---|---|---|
| C01 REPO_MISMATCH / MIGRATION_RISK | INV-002 contra ADR-015 e índice `visitas_un_borrador_por_unidad_uidx` global | Nuevo ADR conserva la exclusividad CHECK y cambia mantenimiento; no drop antes de protección nueva |
| C02 REPO_MISMATCH | Estados/ownership individual contra SPEC-SUPERVISOR-EXPERIENCE-001 §AC-09/10 y exclusiones de asignación | Documentar alcance nuevo y compatibilidad Supervisor; decisión de identidad |
| C03 REPO_MISMATCH | “Preservar póliza” contra ausencia de implementación/documentos | Diseñar capacidad mínima y pruebas nuevas; no declarar AC-11 existente |
| C04 REPO_MISMATCH / OWNER_DECISION_REQUIRED | State único esperado en mock contra loops de ADR-008/011 | Resolver fuente para Torre y vínculo de movimientos sin unificación automática |
| C05 VISUAL_MISMATCH | Cola mock “Todas(4)”/“4 activas”, chips 2 pendientes+1 en curso y tres cards visibles | Conteos desde misma consulta/scope; si hay tarjeta fuera de viewport, explicitarlo; jamás seed con esos conteos |
| C06 VISUAL_MISMATCH | Fotos 2 en Evidencia vs 3 en Firma; traseras 70/68 en condición vs resumen “70” | Resumen deriva de persistencia por posición y misma revision; ejemplos no son un snapshot consistente |
| C07 VISUAL_MISMATCH | ABCS incluye batería/combustible en modal y habla 6 puntos vs 4 posiciones mock | A sólo fluidos/fugas aprobados; combustible es evidencia; posiciones desde configuración real, no del modal |
| C08 VISUAL_MISMATCH | Paso Firma muestra normales expandidos/radios y CTA sin canvas visible | SPEC exige exception-first, dictamen propuesto + Cambiar y firma canvas real; diseñar estados ausentes |
| C09 SPEC_AMBIGUITY / OWNER_DECISION_REQUIRED | Screenshot promete crear COR-0421 automáticamente; SPEC “puede preparar” y §22 pendiente | No asignar folio definitivo ni crear OT antes de decisión; preparar contexto, crear sólo al cierre según política |
| C10 REPO_MISMATCH / OWNER_DECISION_REQUIRED | DESIGN adjunto Inter, ADR-003/layout/globals Roboto; DESIGN raíz es un índice distinto | No cambio global silencioso; definir si Inter aplica al feature o se migra sistema; radios YAML y prosa del adjunto también difieren (2/4 frente a 4/6 px) |
| C11 VISUAL_MISMATCH | DESIGN prohíbe naranja sólido para badges; mock “ACTIVO”/tags naranja y sombras | Mantener pares warning desaturados, CTA único y bordes; registrar adaptación en UX |
| C12 SPEC_AMBIGUITY | §8 condiciona evidencia obligatoria, AC-03 exige rechazo al avanzar/cerrar; no política de excepción | Definir cuándo es obligatoria; hasta decisión no habilitar bypass |
| C13 REPO_MISMATCH | AGENTS/DESIGN raíz indican /flota único, pero SPEC-dashboard y AppShell usan /logistica como Inicio | Actualizar contexto mediante decisión explícita de navegación; preservar comportamiento actual mientras se diseña Torre |

Los cinco gates de habilitación del screenshot desktop no son cinco pasos CHECK. Pueden existir como explicación de readiness sin alterar el wizard de cuatro pasos. “ABCS/Llantas/Evidencia/Hallazgos/Firma” no debe convertirse en un segundo wizard de cinco pasos.

# 5. Visual-to-code mapping

| Visual | Equivalente y reutilización comprobada | Extensión necesaria / responsive |
|---|---|---|
| 01 Mechanic Work Queue | `/ordenes`: cola, búsqueda, filtros en URL, split desk; `StatusBadge`, `UnidadTipoMark`, UI Card/Input/Button; AppShell/RoleGate | No assignment ni rol Mecánico. Nueva lectura paginada/counts coherentes, selector Chequeos/Mantenimiento y claim transaccional. Mobile lista → detalle; QR/escáner/perfil del mock no tienen implementación ni autorización adicional en SPEC |
| 02 Condition | `VisitStepper` configurable y gramática A–E del wizard; `Field`, NativeSelect/Input, FormAlert | Nuevo ConditionStep A fluidos/fugas + B llantas; controles explícitos, expansión sólo anomalías, PSI y posiciones configuradas. No reusar catálogo de trabajos como respuestas físicas. Mobile dos celdas PSI por fila cuando quepan y flujo vertical |
| 03 Evidence | `ImageDropzone` usa capture=environment; previews en `OrdenCaptura` y wizard | Reemplazar transporte Data URL por objetos privados; tags multiconcepto, 2–5, lectura odómetro/combustible sin OCR obligatorio, retomar/reemplazar sin violar snapshot. Preview/retake/zoom como estados nuevos; timestamp del servidor |
| 04 Findings | `FormAlert`/disclosure/Badge y detalle de Orden; CORRECTIVO existente | Nueva entidad y clasificación derivada; preparación heredada de contexto, evidencia referenciada, no formulario de diagnóstico. Mostrar preparada sin folio final reservado ficticio |
| 05 Review & Signature | `SignaturePad` ya soporta touch; stepper y sticky `.wizard-actions`; detalle cerrado de Visita | Resumen exception-first, propuesta de dictamen, razón de override cuando corresponda, canvas validado, snapshot/hash/version y cierre transaccional. “Volver a editar” antes de firma invalida revisión previa; tras firmar sólo lectura |
| 06 Active CHECK Logistics Modal | Dialog/Sheet Radix, NuevaOrdenDialog como patrón de existente; ficha patio `/flota/unidades/[id]` | Endpoint activo/progreso/actor/start/result, 409 con OT existente; modal desktop/sheet mobile; deep link lectura Logística separado de wizard editable. Tiempo deriva de startedAt; no “18min” fijo |
| 07 Control Tower | `/flota` DataTable/TanStack, filtros URL, lookup patio + ops; `/logistica` dashboard con sheets y movimientos hoy | Nueva composición server-side State/Readiness/Check/Urgency/blocking reasons; KPI y filtros sin confundir “Despachada” con prioridad. Mobile cards, desktop tabla densa, tablet scroll acotado; no indicador “en vivo” sin refresco real |

En imágenes también cambian económicos de la misma placa entre vistas. Son datos ficticios de referencia; el código usará identidad Kernel, no una traducción de esos identificadores. “Todo conforme” y “sin daños” del mock representan acciones ya tomadas en el ejemplo, no valores iniciales.

# 6. Proposed schema changes

**Modelo preferido para revisión:** ampliar `public.visitas` como identidad OT existente y agregar una extensión 1:1 de CHECK; conservar nombre físico/IDs y adaptar APIs legacy. No añadir otra tabla maestra `work_orders` paralela. Alternativa: padre de OT con Visita como ejecución de mantenimiento; sólo elegirla si el ADR demuestra que la extensión vuelve ambiguo el agregado. Esa alternativa implica backfill de IDs y dos lifecycles y tiene mayor costo.

| Tabla/capacidad propuesta | Campos / constraints esenciales |
|---|---|
| `public.visitas` ampliada | `work_order_type`, `work_order_status`, `assigned_user_id`, `assigned_at`, `started_at`, `cancelled_at`, `blocks_operation`, razón/actor del bloqueo, `version`; preservar unidad_id, legacy tipo/estado y trabajos/piezas |
| `public.check_inspections` | UNIQUE `visita_id`, origen, operational_date, evidence_required, current_step 1..4, result nullable, reviewed_version, completed_at, policy/config versions, signed_snapshot JSONB y snapshot_hash; validity/invalidation según decisión |
| `public.check_condition_items` | Inspección, clave ítem, valor físico, nota, confirmador, fecha/revision; UNIQUE inspección+clave; normal no confirmado por default |
| `public.check_tire_measurements` | Inspección, posición, PSI numérico y condición visual, configuración/rango snapshot; UNIQUE inspección+posición; medidas no negativas y unidad explícita |
| Config llantas | Capacidad propiedad de Unidad/Tipo con override por unidad, posiciones y rangos válidos; consulta por puerto; confirmar dueño/formato en ADR, no asumir cuatro ruedas ni PSI mock |
| `public.check_findings` | ID, inspección, clave de origen estable, hechos/nota derivada, clasificación nullable hasta resolver, revisión origen, correctiva preparada/creada; UNIQUE inspección+clave de origen |
| `public.check_evidence` | Inspección, storage_key único, MIME, byte_size, SHA-256, server timestamp, actor, coverage_tags, estado upload/registro; sólo READY cuenta para cobertura |
| `public.check_signatures` | UNIQUE inspección; signer_user_id, nombre snapshot, fecha servidor, storage_key/hash, signed_snapshot_hash, canvas_width/height >0, método TOUCH_CANVAS, revisión firmada |
| Preparación/vínculo correctiva | Inspección+finding_id y selección opt-in si aplica; source_check_id/finding_id en nueva CORRECTIVE; UNIQUE derivación por hallazgo para evitar doble creación; evidencia por referencia autorizada |
| `public.check_audit_events` | Append-only, event_id UNIQUE, actor, timestamp, unidad_id, visita_id, source, reason, revision, metadata; índices visita+time, unidad+time |
| `public.check_daily_generations` | UNIQUE unidad_id+operational_date; check_id; evita repetir jornada incluso si CHECK se completa/cancela; tratamiento de regeneración a decidir |
| `flota.movimientos` | `source_check_id` opaco nullable para backfill histórico, obligatorio sólo para movimientos nuevos sujetos a política; sin FK hacia public |
| Documents mínimo | Registro de póliza por unidad, fecha_vencimiento tipo DATE, estado/version/object key si aplica; schema/owner pendiente, sin FK cruzada ni catálogo maestro general |
| Identidad/asignación | Referencia a usuarios reales/proyección mínima aprobada; no convertir `Chofer` en usuario ni confiar en stub localStorage |

`work_order_status` sería autoridad del ciclo nuevo; `estado` BORRADOR/CERRADO queda como compatibilidad durante migración, actualizado únicamente en el mismo comando transaccional. No deben existir dos escritoras independientes. Constraints y adapters impedirán inconsistencias; los endpoints legacy excluirán CHECK y rechazarán su edición/cierre. La forma final de retirar el campo duplicado pertenece al ADR/rollout.

Backfill candidato: CORRECTIVO→CORRECTIVE; PREDICTIVO→PREVENTIVE preservando el valor legacy, según mapeo UI ya aprobado; CERRADO→COMPLETED. Un BORRADOR histórico no prueba asignación o inicio: puede migrarse a PENDING como política de transición explícita, sin inventar actor/fecha. Confirmar ese backfill antes de ejecutarlo. No asignar aptitud FIT a históricos de mantenimiento ni asumir que están no bloqueantes sin política aprobada.

DDL conceptual del invariante nuevo (nombres sujetos al ADR):

```sql
CREATE UNIQUE INDEX check_un_activo_por_unidad_uidx
ON public.visitas (unidad_id)
WHERE work_order_type = 'CHECK'
  AND work_order_status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS');
```

Cambiar el índice BORRADOR global sólo después de instalar/verificar el nuevo y auditar datos. El bootstrap actual debe dejar de reinstalar el índice viejo. La legacy API `EXISTING_DRAFT` ya no puede seleccionar arbitrariamente una visita entre N mantenimientos: requiere contrato compatible definido en el ADR (legacy limita su propia creación hasta migrar callers; la nueva creación soporta N desde el slice 1 completo).

Índices adicionales: cola `(assigned_user_id, work_order_status, updated_at, id)`, unidad/historial, source_check_id/finding_id, eventos por agregado y generación diaria. Constraints: CHECK exige extensión/source; resultado separado de lifecycle; COMPLETED CHECK exige firma/snapshot; CANCELLED no elimina; `blocks_operation` independiente del tipo. Reglas de conteo/cobertura entre hijos requieren validación transaccional y, para protección directa de DB, triggers/procedimientos focales: un CHECK SQL simple no cuenta otras filas.

Inmutabilidad propuesta: guards de servicio + locks + triggers que impidan UPDATE/DELETE del contenido, firmas, evidencia y hallazgos de CHECK firmado, incluso vía cascades. Invalidación/corrección posterior se registra aparte; no reescribe snapshot. Objetos privados sin reemplazo de key y sin borrado por endpoints de inspección firmada; acceso de servicio separado de permisos de cleanup. Política de retención/storage es una decisión operativa pendiente.

Migrations: scripts versionados y reversibles donde no impliquen perder datos, aprobados para este incremento; no asumir que synchronize es seguro. Preparación expand → backfill auditado → constraints → contratos → contract. Deshabilitar synchronize en despliegue controlado conforme a plan aprobado, con snapshot/backups verificados. El framework/runner concreto y política de producción todavía son UNKNOWN.

# 7. Proposed commands / API

Todos son nombres propuestos, no endpoints presentes. Mantener `/visitas` de mantenimiento y añadir una fachada CHECK sobre el mismo dueño.

| Comando / lectura | API candidata | Autoridad y comportamiento |
|---|---|---|
| CreateVehicleCheck | `POST /unidades/:unidadId/checks` | LOGISTICA autorizada; valida catálogo y origen permitido; 201 o 409 ACTIVE_CHECK_ALREADY_EXISTS con id/folio/status/deeplink/progreso |
| GetActiveVehicleCheck | `GET /unidades/:unidadId/checks/active` | Lectura Logística/Admin y mecánico según scope; sin formulario técnico editable |
| ListMyWork | `GET /checks?scope=mine&status=&q=&cursor=` | Backend filtra identidad/asignación; metadata counts por mismo scope; incluir pendientes tomables si política permite |
| Assign/ClaimCheck | `POST /checks/:id/assign` / `POST /checks/:id/claim` | Rol asignador por definir; claim con compare-and-set, un ganador; no confiar assigned_user_id enviado libremente |
| StartCheck | `POST /checks/:id/start` | Actor permitido, transición válida, startedAt del servidor |
| SaveCondition | `PATCH /checks/:id/condition` | Expected version, validación física/config, derivación/upsert hallazgos en misma txn |
| Upload / register evidence | `POST /checks/:id/evidence/uploads`, `POST /checks/:id/evidence`, `DELETE /checks/:id/evidence/:evidenceId` | Autoriza key/check, verifica objeto/tamaño/MIME/hash, tags y máximo5; delete sólo antes de firma |
| ClassifyFinding / PrepareCorrective | `PATCH /checks/:id/findings/:findingId` | Clasifica y prepara contexto; no diagnóstico; audit y dedupe |
| StartReview | `POST /checks/:id/review` | Revalida pasos, devuelve snapshot candidate hash/version, dictamen propuesto y razones; cambio de datos invalida esa revisión |
| CompleteSignedCheck | `POST /checks/:id/complete` | Signature object y hash/review version, result visible y override reason; sólo mecánico autorizado; revalida todo y firma/cierra atómicamente |
| Cancel / Invalidate | `POST /checks/:id/cancel`, `POST /checks/:id/invalidations` | Motivo obligatorio; cancelación antes de cierre; invalidación append-only tras cierre, políticas pendientes |
| GenerateDailyVehicleChecks | Command runner interno | Cuenta servicio/scheduler autorizado, mismo create domain; operational_date explícita, sin endpoint público diario manipulable |
| GetControlTower | `GET /logistica/torre-control` | Composición batch por puertos: state/readiness/check/urgency/reasons/asOf; filtros+counts coherentes; sin N+1 por fila |

Preparar firma como upload privado antes del cierre, validando contenido no vacío y dimensiones; servidor verifica objeto y calcula su hash. No se acepta un hash calculado sólo por UI ni se escribe un binario en tabla principal. El candidato de revisión debe incluir exactamente dictamen, condición, PSI/config, evidencia, clasificaciones y selección de correctivas que se van a firmar.

Guardar borrador permite incompletitud, pero avanzar a paso siguiente usa validación backend de ese paso. Cerrar siempre repite las validaciones completas. `If-Match`/expectedVersion impide sobrescribir otra sesión; 409 VERSION_CONFLICT permite recargar. Repetir cierre con misma idempotency key retorna el resultado original; distinto contenido/revision se rechaza.

`web/src/lib/api.ts` necesita conservar `code` y payload de errores: actualmente lanza `HttpError(status,message)` y descarta la OT activa. No cambiar el 200 EXISTING_DRAFT legacy a 409 sin versionar sus consumidores.

Movimientos: un puerto `OperationalReadinessPort`/`SignedCheckReadPort` verifica aptitud vigente y póliza del lado servidor en cada salida aplicable. Invocarlo en `LogisticaService.registrarSalida` y en `FlotaService.registrar` para SALIDA, conforme al alcance decidido; proteger también cualquier ruta alternativa que pueda iniciar salida. ENTRADA no se bloquea por póliza vencida cuando sólo retorna/cierra una salida; exigencias CHECK_IN exactas requieren decisión. Una consulta UI de readiness nunca es autorización de salida.

# 8. Proposed event / audit model

Reusar OutboxService y su EntityManager. Nuevo envelope versionado CHECK con eventId, type, schemaVersion, occurredAt servidor, actor, unidadId, visitaId/checkId, revision, source, operationalDate y reason cuando aplique. No publicar Data URL ni blobs; referencias opacas y datos mínimos.

Eventos auditables exigidos: CHECK_CREATED, CHECK_ASSIGNED, CHECK_STARTED, CHECK_FINDING_CREATED, CHECK_FINDING_CLASSIFIED, CHECK_REVIEW_STARTED, CHECK_SIGNED, CHECK_COMPLETED, CHECK_CANCELLED, CHECK_INVALIDATED, CORRECTIVE_PREPARED_FROM_CHECK y CORRECTIVE_CREATED_FROM_CHECK. Agregar condición/evidencia/dictamen modificado como eventos de auditoría técnicos cuando cambien contenido/revisión. Registro de actor sistema explícito para scheduler.

Cierre: lock agregado → validaciones/expectedVersion → congelar JSON canónico y SHA-256 → firma y dictamen → completar → crear/vincular correctivas autorizadas → ledger y outbox, dentro de una transacción SQL. Si falla crear correctiva, firma o outbox, no se cierra parcialmente. Los objetos ya subidos permanecen temporales; cleanup idempotente sólo de objetos sin referencia y tras margen aprobado, evitando carrera con cierre.

**CHECK_COMPLETED no emite VisitaCerrada.** El envelope actual y sus efectos sobre stock/cadencia/Andon se preservan para cierre real de mantenimiento. También hay que filtrar CHECK de `UnidadesService.ultimoKmCerrado`, historial de mantenimiento, `VisitasService.ultimoKmCerrado` y lecturas Salud para evitar contaminación al compartir tabla. Un CHECK puede aportar odómetro por puerto específico si se aprueba, sin significar mantenimiento realizado.

El outbox actual ejecuta handlers dentro del request y deja pendientes los tipos sin handler; no tiene worker de replay. Se propone definir handlers y entrega/retry idempotente para CHECK, con processed eventId por consumidor y ledger separado del inbox. No asumir entrega exactly-once ni envío externo atómico. Notificaciones fuera de txn sólo tras commit y vía mecanismo durable aprobado; handlers locales transaccionales deben usar el mismo manager.

Notifications se amplía por un adapter CHECK, enums/source events y deeplink específico a lectura autorizada. `SourceModule.LOGISTICA` hoy siempre enlaza a sin-regreso, por lo que no sirve tal cual. Deduplication por CHECK+evento/revisión, no por vehículo para todos los cierres. Agregar audiencia/rol antes de anunciar “notificar a Logística”: el inbox actual no ofrece segmentación de negocio por rol; read state por userId no es autorización de audiencia. No usar ni unificar las dos fábricas Andon notify; default noop intacto. No enviar Slack/email/WhatsApp desde discovery.

# 9. Proposed frontend architecture

Reutilizar AppShell, RoleGate, VisitStepper, SignaturePad, ImageDropzone, Field/FormAlert, Dialog/Sheet, Button/Input/Badge y DataTable. Mantener wizard de mantenimiento y gramática A–E. Crear componentes por feature, no duplicar primitivas.

Propuesta de rutas: `/mi-trabajo` para actor mecánico aprobado; `/checks/[id]` con exactamente cuatro pasos y modo lectura por permiso; enlace desde `/ordenes` para CHECK si se aprueba esa integración; solicitud y modal desde `/flota`/dashboard existente. No enrutar Logística al wizard de visitas protegido de Supervisor. Preservar query/returnTo interno y back/forward de patrones existentes.

Componentes nuevos: MechanicWorkQueue, CheckWizard, CheckConditionStep, CheckEvidenceStep, CheckFindingsStep, CheckReviewSignatureStep, ActiveCheckDialog, CheckProgressSummary, ReadinessBadge y BlockingReasons. Un controller/hook de feature mantiene carga/guardado/version/conflicto; decisiones de dominio vienen en DTOs de backend, no se duplican en React.

Separar avance de step activo del cumplimiento real: el VisitStepper actual marca todo índice anterior como done; para CHECK debe aceptar completion por paso para no mostrar evidencias válidas sólo porque se navegó. Progreso de lista/modal/Torre viene del mismo read model, cuatro pasos siempre, startedAt real y datos incompletos explícitos.

Responsive: móvil <768 una columna, acciones >=44px, footer sticky con safe area y espacio que evita tapar última fila/canvas; tablet formularios dos columnas y tabla con scroll sólo en región apropiada; desktop max1040 y patrón de cola380+detalle según DESIGN. Objetivo teclado/foco/labels/errores asociados, radios de clasificación accesibles, status textual además de color y permisos sin fugas de datos en hidden controls.

Revisión muestra normales compactos, anomalías expandidas y Ver detalles; dictamen propuesto no exige confirmación adicional. Una acción primaria hacia delante por viewport. El canvas y sus controles son visibles antes de enviar; no basta el CTA del screenshot. No dar “En línea” por ausencia de error ni prometer persistencia offline: retry de red e idempotencia forman parte del diseño, offline durable no está autorizado.

Torre: endpoint compuesto en servidor con consultas batch por dueño, filtros, cursor y conteos de unidades únicas; DTO separado para física/readiness/check/urgencia y causas con source/version. Polling configurable inicialmente, pausa al ocultar pestaña, cancelación de requests obsoletos y refresco tras comandos; mostrar asOf y estado stale/error. No copiar automáticamente 20s de Campanita como SLA. SSE/WebSocket sólo si se necesita y se aprueba una decisión adicional.

No hay que hacer un restyle global hacia Inter dentro del feature sin resolver C10. Aplicar tokens aprobados y documentar adaptación de las imágenes en nueva spec UX. EWO-014 propuesto no prueba disponibilidad de skeleton compartido; estados loading/empty/error de CHECK deben incluirse explícitamente en su propio EWO.

# 10. Concurrency strategy

1. **Create scheduler vs Logística:** ambos llaman al mismo servicio; precheck para UX más índice parcial PostgreSQL como autoridad. Insert+extensión+audit/outbox en txn. Dos solicitudes que observaron cero activos: una confirma, otra recibe 23505 del índice CHECK, rollback y consulta ganador fuera de txn abortada. API manual devuelve 409 con OT; runner registra conflicto y no crea. No traducir todo 23505 a ACTIVE_CHECK.
2. **Idempotencia diaria:** UNIQUE unidad+jornada en registro duradero más exclusividad activa. Completar/cancelar no libera el registro de generación. Reintentos del mismo job devuelven/skipped el resultado original; otro source aún compite por índice activo. No usar mutex de proceso como protección entre réplicas. Elegibilidad y jornada vienen de política aprobada.
3. **Claim/asignación:** compare-and-set con version/status y assigned_user_id; un ganador. Unassigned PENDING puede coexistir con otros mantenimientos. Autoridad de asignación por definir.
4. **Editar vs firmar:** todos los escritores de condición/hijos toman el mismo lock de agregado (`FOR UPDATE`) y revisan status/version. Cierre bloquea primero, revalida hijos y candidato; edición concurrente invalida reviewed_version. Firmado no puede modificarse vía API, otro hijo, DELETE ni cascada.
5. **Quinta/sexta foto:** lock inspección al reservar/registrar evidencia, contar objetos elegibles y manejar reservas expiradas; dos registros concurrentes desde cuatro fotos nunca producen seis. URLs emitidas no equivalen a evidencia registrada. Uploads anteriores no deben adjuntarse después de firma.
6. **Doble cierre/Corrective:** lock + idempotency key/hash y UNIQUE por finding. Una firma, un snapshot y una creación por derivación; rollback conjunto en fallos. Replay outbox no vuelve a crear OT.
7. **Readiness vs salida:** validar en backend con versión vigente de CHECK/documento/bloqueos y coordinar writers relevantes de unidad con una estrategia de lock/versión por puertos. Una validación leída antes de la txn permite TOCTOU (invalidación/póliza/bloqueo mientras se despacha); el ADR de seam debe cerrar esa ventana sin JOIN cross-module. Validación de fecha también al autorizar, sin confiar en fecha del navegador.

Caso obligatorio reproducible: dos conexiones PostgreSQL y barrera para que scheduler y manual intenten creación simultáneamente → 1 creación y 1 conflicto, COUNT activos=1. Si el runner detecta ya existente en precheck, registra skip explícito; ese caso distinto no reemplaza la prueba de carrera real. Si el ganador completa/cancela antes de la consulta del perdedor, el comando perdedor no reintenta crear silenciosamente: devuelve conflicto de operación/version con contexto recuperable, según contrato aprobado.

# 11. Test strategy

Es estrategia futura; no resultados de ejecución. Usar Jest/ts-jest, reglas puras, stores in-memory y E2E Supertest/PostgreSQL existentes. TDD antes de cada slice; characterizations del comportamiento legacy antes de alterar invariantes. No introducir Playwright.

| Grupo / AC | Pruebas propuestas y ubicación |
|---|---|
| Domain AC-01/02/08 | `api/src/visitas/checks/check-rules.spec.ts` y `api/test/checks.e2e-spec.ts`: sin activo crea; activo bloquea PENDING/ASSIGNED/IN_PROGRESS; tras completar/cancelar permite; CHECK+PREVENTIVE+varias CORRECTIVE coexisten; blocker true/false independiente tipo |
| Lifecycle AC-09 | transiciones legales/ilegales, COMPLETED+UNFIT, cancel reason, sin firma no cierra, identidad/assigned scope, override permitido/prohibido y razón |
| Concurrencia AC-01 | Dos conexiones/barrera scheduler vs manual, una 201/una409, índice real verificado; dos claims; cierre vs patch/delete; retry doble cierre/correctiva única |
| Scheduler INV-005 | misma jornada antes y después de completar/cancelar no duplica; siguiente jornada según política; activo manual impide; dos réplicas; crash/retry; límites de jornada y DST de zona aprobada |
| Condición AC-06 | Todo conforme no preseleccionado; anomalía crea hallazgo sin texto repetido; editar origen no duplica; clasificación obsoleta detectada; normales retirados antes de firma y audit coherente |
| PSI §7.3 | límite inferior/superior y fuera rango, numérico inválido, configuración ausente, posiciones variables, override por unidad; snapshot no cambia cuando config cambia después de firma |
| Evidencia AC-03/04/05 | 1 fail avanzar/cerrar; 2 con unión cobertura pass; 5 pass; 6 fail; cobertura incompleta fail; upload pendiente/objeto ajeno no cuenta; contenido MIME/bytes/hash inválido; concurrent quinta/sexta |
| Firma/inmutabilidad AC-09 | PNG vacío/trazo ausente fail; firma correcta cierra; firma atada a revision/hash visible; API y SQL directo rechazan rewrite/delete de agregado/hijos y objeto referenciado; invalidación append-only conserva original |
| Corrective AC-07/08 | preparación sin diagnóstico/partes/técnico/horario; hereda unidad/check/finding/evidence; política auto/opt-in acordada; rollback de creación falla; replay no duplica; no blocker implícito |
| Tower AC-10 | EN_RUTA⇒Despachada, State/Readiness/Check independientes, bloqueo por causa real, conteo único, filtros y resumen coherentes; stale no se presenta en vivo; inspección incompleta no apta por defecto |
| Póliza AC-11 | ayer y hoy bloquean, mañana vigente; documento ausente según política; API manipulada y ambas rutas de SALIDA rechazadas; fecha/jornada aprobada y rollover; entrada/cierre del viaje conservado |
| Audit AC-12 | cada evento exigido tiene actor/source/time/IDs/reason; outbox y cierre rollback juntos; consumidor idempotente, fallo/retry sin pérdida; audiencia/deeplink autorizados |
| Permissions §18 | Logística solicita/lee, no patch técnico/firma; mecánico own/claim según política; Admin config/audit, no firmado; otro actor no cambia asignado ni accede a objetos privados; scope se valida server-side |
| Frontend §6 y §20 | Walkthrough 390×844, 1024×768, 1440×900: contadores, 4 pasos, normal compacto, anomalía expande, findings derivados, cámara/tags/minmax, revisión/dictamen/canvas, modal409/deep link, back y retorno; loading/empty/error/conflicto/red/foco/44px |

Regresión real sobre archivos existentes: `slice1.e2e-spec.ts` (Kernel/roles/hub), `slice2.e2e-spec.ts` (mantenimiento/choferes/cierre y nuevo alcance de unicidad), `flota.e2e-spec.ts`, `logistica.e2e-spec.ts`, `inventario.e2e-spec.ts`, `andon.e2e-spec.ts`, `salud.e2e-spec.ts`, `notifications.e2e-spec.ts`, `alert-catalog.e2e-spec.ts`; reglas existentes de cierre/catálogo/outbox. Assert `VisitaCerrada` intacto y que CHECK no cambia cadencia ni consume stock. Tests O-04 de borrador único deberán evolucionar explícitamente con el nuevo ADR, no eliminarse para ocultar el cambio.

Gates por slice: unit focal+regresión pertinente, API build; E2E cuando cambie persistencia/HTTP/concurrencia; web lint/build para UI; `proof-ui` con PNG y pase independiente `ux-auditor` cuando haya UI implementada. Discovery no ejecuta ni reclama ese pase visual. Nuevos IDs CHK-* mapeados a AC y evidencia por EWO; CI final mantiene suite completa.

Precaución existente documentada para E2E: `api/test/setup-e2e.ts` usa DROP_SCHEMA=true y DB_NAME test, pero DATABASE_URL tiene precedencia. Ejecutar únicamente tras demostrar DB descartable; no basta cambiar DB_NAME. Usar Postgres nativo cloud de `.cursor/environment.json` / scripts existentes; no tercer camino ni modificación de entorno productivo. `npm run lint` API hace --fix: no usarlo como inspección de solo lectura.

# 12. Migration / rollout risks

| Riesgo | Control y condición de despliegue |
|---|---|
| Índice global reinstalado por réplica vieja | Migrar bootstrap/callers y despliegue coordinado; auditar estado de índice, no drop aislado ni mezclar versiones incompatibles |
| BORRADOR/CERRADO y tipos legacy | Backfill auditado, compatibility adapters y una sola autoridad transaccional; no asignar startedAt/técnico histórico; SELECT de mantenimiento excluye CHECK |
| Nuevos mantenimientos múltiples | Revisar create idempotency, CTA/hub, detalle y selector; no “primer borrador” arbitrario; crear casos coexistencia con datos históricos |
| synchronize true / migrations desconocidas | ADR/runner aprobado, ensayo en copia descartable, backup/recovery y rollout expand-contract; no ejecutar DDL productivo desde discovery |
| CHECK visto como mantenimiento completado | Evento específico y filtros; regresión Andon/Salud/Inventario y kilometraje/historial; no cambiar envelope legacy |
| Storage DB vs objetos | Staging/registro/finalización, objetos inmutables y cleanup sólo huérfanos; firma no concluida si objeto inaccesible; decisión de proveedor/retención |
| Identidad stub | No afirmar firma atribuible o cola propia productiva mientras userId es header opcional manipulable; configurar identidad aprobada y autorización por objeto |
| Falta de documentos/póliza | Crear fuente mínima y guards antes de habilitar nueva salida CHECK; definir faltante/no-vigente; no lanzar readiness “Lista” sin fuente documental confiable |
| Dos loops operativos | Mantener separación y mostrar origen; relación explícita de CHECK con movimiento/journey y ausencia histórica; no reparar inconsistencias con sincronización implícita |
| CurrentDate y operationalDate | Zona negocio/jornada acordadas y comprobables; cliente/host UTC no definen vigencia; conservar America/Mexico_City de patio cuando aplica |
| Outbox sin worker/audiencia | Diseñar entrega/retry y scope por rol antes de declarar avisos fiables; no I/O externo dentro de transacción |
| Nueva prioridad/validez/reglas UNFIT | Gate de producto antes de automatizar; no derivar de mock, score Salud ni tipo de OT |
| UI con verificaciones históricas pendientes | No tratar EWO-012/013 como Visual QA cerrada; nueva evidencia propia, sin absorber EWO-014 Proposed |
| Rollback tras firmas reales | Desactivar nuevas creaciones por flag conservando lectura/auditoría y objetos; no down migration que borre firmas/evidencias/correctivas ya creadas |

Despliegue inicial recomendado detrás de flags por capacidad/rol y piloto de unidades con configuración aprobada. Flags no relajan constraints ni permiten saltar evidencia/póliza. Scheduler sólo se activa después de identidad, datos de elegibilidad y jornada; cierre sólo cuando storage/immutability probados. Readiness puede observarse primero, pero no declararse autorización operativa antes de integrar guards de salida.

# 13. OWNER_DECISION_REQUIRED

Las opciones siguientes son propuestas; no decisiones inferidas. Los cinco puntos expresamente pendientes en SPEC no están resueltos por el repo.

| ID | Decisión requerida / por qué importa | Opciones encontradas o a revisar / impacto técnico |
|---|---|---|
| D01 | ¿DAILY_AUTOMATIC válido satisface CHECK_OUT? | Repo no tiene CHECK. Reusar y vincular snapshot reduce captura; CHECK_OUT separado requiere crear cuando no hay activo y gestionar vigencia; modifica gates/scheduler y relación movimiento |
| D02 | Vigencia exacta, jornada, zona, elegibilidad diaria | Patio usa America/Mexico_City para hoy, no vigencia CHECK. Jornada/TTL/eventos requieren fechas/expiración/config y tests rollover; no fijar “24h” ni horarios mock |
| D03 | Matriz que fuerza UNFIT y posibilidad/razón de override | Repo no tiene matriz; Salud critical no es dictamen. Config versionada y reglas server-side según condiciones aprobadas; define cierre/readiness y permisos de override |
| D04 | REQUIRES_WORK automático o opt-in al firmar | SPEC permite preparar; screenshot promete auto. Auto crea cada derivación elegible; opt-in persiste selección firmada. Ambos mantienen UNIQUE por hallazgo y creación atómica al cierre; no precrear OT final |
| D05 | Qué invalida un completado y quién puede hacerlo | Sin política actual. Eventos físicos/config/cambio material requerirían ledger/proyección y gates; nunca editar snapshot ni firma |
| D06 | Relación exacta de firma del chofer/CHECK con ambos loops | Repo SÍ resuelve que patio exige CHOFER+AVAL en salida y entrada; Logística usa salida/regreso sin pads. Mantener ambos pads y añadir referencia CHECK en patio conserva contrato; unificar loops o extender firma al viaje requiere ADR/producto; no reemplazar AVAL con mecánico |
| D07 | Rol Mecánico, identidad confiable, asignador, claim y cola propia | SUPERVISOR es rol actual del wizard; no User entity. Mapear responsabilidad a Supervisor autenticado o nuevo MECANICO requiere autorización/config/scopes y navegación; header stub no prueba quién firmó |
| D08 | Modelo OT/Visita y supersession ADR-015 | Extender Visita es propuesta preferida; padre OT sería alternativa. Resolver status/legacy y 0..N mantenimiento exige backfill/índices/contrato create y selección UI; no mantener restricción global contra SPEC |
| D09 | Dueño de póliza, faltante, fecha negocio y autorización de salida | No módulo encontrado. Fuente mínima local o puerto a fuente documental autorizada; define fail behavior y ambas APIs; plazo <=fecha debe bloquear, sin gracia inventada |
| D10 | Fuente State Torre y tratamiento EN_TALLER/inconsistencia viaje-patio | opsEstado y patio independientes; ACTIVA/INACTIVA no es física. Read model explicando ambos o estado físico explícito requieren precedencia/config/ADR; no derivar EN_TALLER sólo de tener una correctiva |
| D11 | Urgencia: causas/precedencia y relación con regresos vencidos | Actual SIN_REGRESO binario, sin Crítica/Atención/Normal general. Definir reglas y KPIs del backend; no copiar horas/prioridades de screenshot |
| D12 | Cuándo evidencia es obligatoria y casos “no aplica” | §8 condicional vs AC-03 general. Hacerla obligatoria en todos los CHECK iniciales o excepciones explícitas; snapshot policy y validadores condicionados, sin bypass implícito |
| D13 | Proveedor storage privado, retención y runner/migration deployment | Repo usa Data URL, synchronize y outbox síncrono. Selección operativa define adapter/config/cleanup/restore/replay; discovery no configura servicios ni inventa infraestructura |
| D14 | Fuente tipográfica/tokens y navegación del incremento | DESIGN adjunto Inter vs ADR Roboto; root nav /flota desfasada vs código /logistica. Aprobar alcance de DS y ubicación Torre antes de restyle/nav; preservar resto app |

No hace falta decidir estas preguntas para conservar el informe; sí resolver las que bloquean cada slice antes de implementar su comportamiento. No se eligió ninguna opción por silencio del usuario.

# 14. Recommended implementation slices

| Slice | Incremento vertical revisable | Dependencia / criterio de salida |
|---|---|---|
| 0 — decisiones y contratos | Resolver D07/08/09/10/13, registrar ADR de evolución/seams, SPEC/UX y EWOs aprobados; backfill/compatibilidad propuestos concretos | No renombrar dominio ni tocar producción durante discovery; D01–05/11–12/14 resueltas antes de sus capacidades |
| 1 — CHECK identity + creación/exclusividad | Visita ampliada/extensión, migration ensayada, índice parcial, creación/lectura API, coexistencia 0..N mantenimiento y compatibilidad | AC-01/02/08, DB real/concurrencia y caller legacy; no firmar ni despachar todavía |
| 2 — manual + daily + audit | Solicitud Logística/modal409, command runner diario idempotente, audit y outbox | D02/elegibilidad e identidad; una creación/un conflicto, jornada no repetida tras cierre |
| 3 — queue + Condition | Cola del actor/claim, cuatro pasos, config llantas, captura hechos y derivación base hallazgos | D07 y config física; Todo conforme explícito, PSI backend, conteos; primera experiencia usable de captura |
| 4 — Evidence | Upload privado/registro, metadata/tags/preview/retake y validación2–5 | D12/13; AC-03/04/05 incluyendo sexta concurrente y objeto ajeno |
| 5 — Findings + preparation | Clasificación por origen, contexto heredado/preparado, factory correctiva compatible mantenimiento | D04; AC-06/07/08; no diagnóstico ni crear antes de firma |
| 6 — Review/signature/immutable close | Dictamen propuesto, snapshot/version, canvas, cierre+correctiva+audit/outbox y lectura firmada | D03/04/05, storage/identity; AC-09/12 y carreras/rollback; signed immutable demostrado |
| 7 — Tower/readiness/refresh | Read model State/Readiness/Check/Urgency, KPI causas, polling/asOf y lectura Logística | D02/03/05/09/10/11/14; AC-10, no salida operativa sin documental/guards |
| 8 — movements + policy + hardening | Vínculo firmado, póliza dura y revalidación en rutas salida, entrada/check-in, regresión completa | D01/06/09 y continuidad loops; AC-11, guards backend+TOCTOU y todos los módulos regresión |

Documento/póliza se diseña en slice0 y se integra como fuente de readiness antes de habilitar slice7 operativamente; sus hard guards se completan antes de habilitar salidas en slice8. Un piloto de captura CHECK puede preceder a despacho, pero no representa feature completo. Cada slice incluye tests, evidencia y rollback propio; no dividir en “todo backend” seguido de “todo frontend”.

# 15. Files expected to change

**Archivo creado por esta ejecución:** `workspace/discovery/SPEC-CHK-001-discovery.md`. Ningún source, migration, seed, API ni UI fue modificado. Lo siguiente es una lista de impacto prevista, no cambios ya ejecutados.

| Área | Archivos existentes probables |
|---|---|
| Agregado/compatibilidad mantenimiento | `api/src/visitas/{visita.entity.ts,enums.ts,visitas.service.ts,visitas.controller.ts,visitas.module.ts,visitas-invariant.service.ts}`, DTOs create/update y `close-rules.ts` sólo donde compatibilidad lo exija |
| Catálogo/hub/historial | `api/src/unidades/{unidades.service.ts,unidad.entity.ts,tipo-vehiculo.entity.ts}`, `api/src/common/hub-policy.ts`; filtrar CHECK de historial/cadencia y añadir config por puerto |
| Auth/identity | `api/src/auth/{roles.enum.ts,auth.guard.ts,current-user.ts,roles.guard.ts}`, wiring de identidad por decidir, `api/src/app.module.ts` |
| Flota/movimiento | `api/src/flota/{flota.service.ts,flota-engine.ts,flota-rules.ts,flota-types.ts,flota-store.ts,typeorm-flota-store.ts,flota.module.ts}`, `dto/flota.dto.ts`, `entities/movimiento.entity.ts` |
| Logística/Torre | `api/src/logistica/{logistica.service.ts,logistica.controller.ts,logistica-types.ts,logistica-rules.ts,logistica.module.ts}`, DTOs |
| Eventos/notificaciones | `api/src/kernel/outbox/{outbox.service.ts,outbox.module.ts}` si requiere runner/txn interfaces; `api/src/notifications/{enums.ts,inbox-types.ts,inbox-rules.ts,notifications.module.ts,notifications.service.ts,typeorm-inbox-store.ts}` para CHECK/audiencia/manager |
| DB/deploy | `api/src/db/{postgres-options.ts,ensure-schemas.ts}`, `api/package.json`, `docker/init.sql`, `.github/workflows/verify.yml` y run scripts únicamente conforme migration/runner aprobado |
| Integraciones de mantenimiento | `api/src/salud/salud.service.ts` y adapters/lecturas si necesitan filtrar CHECK; `api/src/andon/andon.service.ts`, `inventario.service.ts` sólo si integración lo requiere; preservar VisitaCerrada y no cambiar notify dual-stack |
| Web shared/API | `web/src/lib/{api.ts,types.ts,role.tsx,format.ts}`, `web/src/components/{AppShell.tsx,RoleGate.tsx,VisitStepper.tsx,SignaturePad.tsx,ImageDropzone.tsx,StatusBadge.tsx}` |
| Web superficies | `web/src/app/ordenes/page.tsx`, `web/src/app/flota/page.tsx`, `web/src/app/flota/unidades/[id]/page.tsx`, `web/src/components/LogisticaDashboard.tsx`, hub `web/src/app/unidades/[id]/page.tsx`; wizard legacy sólo para compatibilidad/protección contra CHECK |
| Design/UI | `web/src/app/globals.css` scoped CHECK y tokens aprobados; `web/src/app/layout.tsx` sólo si se aprueba cambio tipográfico; no restyle global automático |
| Tests actuales | `api/src/visitas/visitas-invariant.service.spec.ts`, `close-rules.spec.ts`, `api/test/{slice1.e2e-spec.ts,slice2.e2e-spec.ts,flota.e2e-spec.ts,logistica.e2e-spec.ts,notifications.e2e-spec.ts}`; ampliar regresiones indicadas en §11 cuando toque cada seam |
| Fuentes duraderas tras aprobación | `docs/specs/`, `docs/adr/README.md` y nuevo ADR de siguiente ID disponible (hoy último015), supersession de ADR-015, `context/`, `domain/` e ICM sólo por hechos nuevos aprobados; no reescribir ADRs aceptados |

Archivos/directorios **nuevos propuestos** (nombres orientativos, todavía inexistentes):

- `api/src/visitas/checks/`: entidades inspection/condition/tires/finding/evidence/signature/audit/daily-generation, engine/rules, commands/controller/DTOs/ports y pruebas focales.
- `api/src/kernel/events/check-events.ts` o ubicación del dueño definida por ADR; evento nuevo, no mutación del envelope VisitaCerrada.
- Adapter CHECK de Notifications y capacidad de audiencia autorizada.
- Storage port/adapter y Documents policy según dueño aprobado; no se fija un schema nuevo sin ADR.
- Runner de GenerateDailyVehicleChecks y migrations focales versionadas bajo ubicación acordada.
- `web/src/app/mi-trabajo/page.tsx`, `web/src/app/checks/[id]/page.tsx` y `web/src/components/checks/` con componentes descritos en §9.
- `api/test/checks.e2e-spec.ts` y pruebas de policy/storage/scheduler/readiness bajo sus dueños.
- SPEC-CHK-001 y UX aprobados en `docs/specs/` / `docs/design/`, nuevos EWOs por slice y evidencia en `docs/evidence/`; referencias PNG en `docs/design/check-operativo/` cuando estén disponibles como archivos.

El descubrimiento queda terminado y se detiene en revisión, conforme al handoff. El siguiente paso es decidir los puntos bloqueantes y aprobar los artefactos de implementación; no se inició código de producción.


> Historical discovery approved by owner on 2026-10-01. Original analysis/questions above are preserved as historical evidence; D01–D14 are now answered in [Slice0 review](../../docs/engineering-work-orders/CHK-001-slice-0-review.md). R01–R05 también adoptadas por owner; no remaining owner decisions. EWO015 técnicamente Ready con ejecución retenida. Slice0 documents target decisions/contracts, not executed feature code.
