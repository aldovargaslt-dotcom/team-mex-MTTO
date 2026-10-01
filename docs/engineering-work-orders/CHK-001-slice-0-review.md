# CHK-001 — Slice 0 review package

## Estado y alcance

Approved — owner aprobó paquete Slice0 y adoptó R01–R05 el2026-10-01; D01–D14/adicional permanecen cerradas. SPEC/ADRs/contract/migration/UX y scopes EWO están aprobados documentalmente. EWO015 Ready técnico, ejecución retenida por instrucción explícita de no productioncode. EWOs016–022 Draft por dependencias/preflight, no decisión pendiente.

No source de producción, migrations ejecutables ni configuración runtime modificados. No base de datos, storage/provider/auth/scheduler instalados. No destructive SQL ni tests E2E ejecutados.

## Entregables

| Pedido | Artefacto durable |
|---|---|
| 1. Visita evolution / ADR015 partial supersession | [ADR-016](../adr/016-visita-check-evolution.md); nota de supersession enlazada en ADR015 preserva cuerpo histórico |
| 2. Movement seam | [ADR-017](../adr/017-check-movement-seam.md); conserva loops/CHOFER+AVAL y puertos de salida |
| 3. Auth identity | [ADR-018](../adr/018-mecanico-auth-signature-identity.md); matriz y TrustedActor en [contrato](../contracts/CHK-001-contract.md) |
| 4. Documents ownership | [ADR-019](../adr/019-vehicle-insurance-policy.md); POLIZA_SEGURO/fecha/owner/puerto fail-closed |
| 5. Storage/migrations/scheduler | [ADR-020](../adr/020-check-storage-migrations-scheduler.md) |
| 6. SPEC consolidada | [SPEC-CHK-001](../specs/SPEC-CHK-001.md), AC01–36 y decisiones incorporadas |
| 7. Approved context | Apéndices target vs as-is en context/domain, ICM/AGENTS; sin declarar BC nuevo |
| 8. Migration/backfill | [Plan](../migrations/CHK-001-visita-backfill-plan.md), slot legacy, índice parcial nuevo y pasos M001–006 |
| 9. EWOs Slices1–8 | [EWO-015](EWO-015.md) a [EWO-022](EWO-022.md), EWO015 Ready técnico,016–022 Draft por dependencias; ejecución retenida |
| 10. Remaining owner items | Ninguna OWNER_DECISION_REQUIRED; R01–R05 adoptadas abajo |
| Review/support | [UX](../design/ux-check-operativo-v1.md), [evidencia](../evidence/CHK-001-slice-0.md), discovery original preservado como histórico |

## OWNER_DECISION_REQUIRED — estado final

**Ninguna decisión de owner sin resolver.** R01–R05 quedan adoptadas a continuación; D01–D14 no se reabren. Numeric PSI/datos/provider/config real son inputs de ejecución, no preguntas de dominio que bloqueen implementación de EWO015.

## R01–R05 adoptadas — owner, 2026-10-01

El owner aprobó el paquete Slice0 y estas políticas; son target aprobado, no configuración desplegada ni permiso para producción. D01–D14 permanecen sin cambios.

| ID | Política V1 adoptada |
|---|---|
| R01 | Facility configurable por vehículo; despliegue inicial puede usar un facility Team Mex. Timezone America/Mexico_City. Día operacional calendario local 00:00–23:59, implementado como intervalo [00:00, 00:00 del día siguiente) para incluir segundos/fracciones del último minuto. DAILY_AUTOMATIC sólo vehículo ACTIVA, físico EN_PATIO/disponible para preparación y sin CHECK activo. No auto generar EN_RUTA, EN_TALLER o INACTIVA. |
| R02 | Hard blockers: aceite motor crítico, refrigerante crítico, fuga visible severa, llanta severa/ponchadura y PSI fuera de límites críticos configurados. No crítico→FIT_WITH_OBSERVATION; hard→UNFIT, sin override operable. Rangos normales/críticos por posición son configuración de vehículo/tipo, no screenshots. |
| R03 | MECANICO puede claim CHECK no asignado en facility autorizado. Logistics/Admin asignan dentro de ese facility. Invalidation explícita MECANICO por hallazgos técnicos, LOGISTICA por incidentes/eventos operativos; ambos con motivo. Scope/actor no demostrable→deny. |
| R04 | Flota/Patio posee physical state EN_PATIO/EN_RUTA/EN_TALLER/INACTIVA. EN_TALLER sólo transición operacional explícita registrada, no existencia de Corrective. Divergencia journey/patio se expone como inconsistencia; jamás reconciliación silenciosa. |
| R05 | Defaults de urgencia de retorno configurables: retraso positivo <=2h ATTENTION; >2h CRITICAL. Hard operational blocker, UNFIT o documentación requerida inválida→CRITICAL. CHECK requerido/en progreso o FIT_WITH_OBSERVATION→ATTENTION. Sin causa activa→NORMAL. Thresholds en configuración persistida/versionada, no constantes hard-coded de dominio. |

Los valores numéricos PSI, listado real de vehículos/facilities, hora de invocación del scheduler y credenciales/provider son inputs de configuración de ejecución. No son nuevas OWNER_DECISION_REQUIRED: contratos config/validación/fail-closed definidos. No inventar PSI ni tomar las 2h del mock: las 2h están autorizadas aquí por owner.

## Inputs técnicos de despliegue (no OWNER_DECISION_REQUIRED de dominio)

Seleccionar/configurar provider de identidad confiable, issuer/audience/role mapping, endpoints y permisos S3/MinIO, bucket privado/retención de firmados, credenciales secretas, migration DB target/backup/runner, límites MIME/bytes, cleanup grace y polling SLA. Contratos fijan interfaces y fail-closed; no se copian secretos al repo. Elección del adapter concreto y ensayos pertenecen al EWO/operación autorizado; no se afirma setup listo.

## Gates y dependencias de EWOs

- EWO015 Slice1: Ready técnico, contrato/migration/adapters/auth foundation aprobados; no ejecutar hasta autorización específica y preflight de DB/toolchain. No depende de físicos/docs/S3 reales de slices posteriores.
- EWO016 Slice2: depende015; R01 adoptada. Daily sólo fuente física EN_PATIO demostrada; puerto/fuente aún no lista⇒disabled/skip sin dependencia circular ni inferir físico.
- EWO017 Slice3: depende015/016; R02/03 adoptadas y UX aprobada; numericPSI provisionado en ejecución.
- EWO018 Slice4: depende017 y storage configurado; no signed deletions.
- EWO019 Slice5: depende017/018; REQUIRES_WORK ya auto opt-in resuelto.
- EWO020 Slice6: depende019, trusted identity y private storage configurados; R01/02/03 adoptadas.
- EWO021 Slice7: depende020; incluye documentary capability mínima + physical/urgency composition, R04/05 adoptadas, numeric/config fixture real por workflow.
- EWO022 Slice8: depende021; guards en ambos gateways, documentary source/readiness ya disponible; full regression/activation.

No circularidad: documentos mínimos se implementan con Slice7 antes de integrar autorización de movimientos Slice8. Captura/piloto no equivale a feature productivo completo. No nueva salida operativa habilitada hasta Slice8 safety/identity/doc gates.

## Review checklist

- [x] D01–D14/adicional trazables y sin reapertura.
- [x] Visita única, CHECK1:1, evento sin efectos mantenimiento.
- [x] ADR015 sólo supersession parcial explícita, no rewrite.
- [x] Legacy slot compatible y N maintenance sin restricción global.
- [x] 2–5/tags/canvas/immutability/stub boundaries definidos.
- [x] R01–R05 y inputs runtime diferenciados.
- [x] Contract/migration/UX y paquete Slice0 aprobados por owner.
- [x] R01–R05 políticas adoptadas; inputs reales se provisionan en futuros slices, no se afirman desplegados.
- [x] EWO015 técnicamente Ready con scope y S1-T01–11/gates precisos.
- [ ] Autorización de ejecutar slices, retenida; aprobación Slice0 no la sustituye.

Actualización final terminada; detenerse conforme al owner, sin productioncode. Evidencia documental en enlace arriba; no testing/runtime PASS inferido de docs.


## Respuesta de readiness / alcance / merge de EWO015

EWO015 **sí implementation-ready técnicamente**. No producción/source autorizado aún, ni test/runtime hecho por docs. Scope exacto: evolución Visita/CHECK1:1, canonical type/status/version, legacy slot/adapters201/200/Nmaintenance, migrations TypeORM foundation public/audit/backfill/índices/caller filtros, facility/calendar config foundation, MECANICO/TrustedActor+guards/boundary y API create/read. CI/build/migration test wiring acotado. Exclusiones: scheduler/claim/condition/storage/finding/prepared/firma/invalidación/physical/doc/Torre/dispatch, módulos de slices posteriores.

[S1-T01–11 y gates exactos antes de merge](EWO-015.md#testing-requirements): unit/regresión/build, PostgreSQL E2E completo, migration rehearsal aislado synchronize=false, carrera real1/409, índices/backfill/rollback/drain, auth/scopes y calendario, legacy envelope/efectos; CI APIunit/E2E+web lint/build más APIbuild/migration gates; evidencia AC/recovery/review completos sin SKIPPED obligatorio. Runtime preflight targetdisposable previo; merge no deploy/productivemigration. UIproof SKIPPED porque no UI tocada, no por entorno roto.
