# ADR-028 — Vigencia ABC configurable por política heredada

## Status

**Accepted para la decisión de producto acotada**, 2026-10-17. Calendario exacto,
contratos, modelo/migración y scheduler siguen Proposed en
[SPEC-UNIDADES-READINESS-001](../specs/SPEC-UNIDADES-READINESS-001.md).
No autoriza implementación ni modifica downtime, permisos o evidencia histórica.

## Context

ADR017/020/025 y la SPEC ABC restringen vigencia al día operativo. El usuario
requiere Daily y Stock con intervalos diarios, semanales, mensuales o personalizados,
heredables de flota/categoría/unidad. Configurar solo recordatorios no cumple esto.

## Decision

1. La vigencia del ABC satisfactorio depende del intervalo configurado, no de una
   expiración diaria universal. Flota aporta default, categoría lo sustituye y
   excepción de unidad tiene precedencia. Daily/Stock no fuerzan un intervalo.
2. Separar dictamen, vigencia, retenciones y uso. Sin revisión hoy puede seguir
   vigente; llegar al vencimiento no produce nueva evidencia ni autoriza despacho.
3. Recheck resuelve solo obligaciones verificadas y no renueva la vigencia base.
   No extender firmas ni eliminar holds por un cambio de configuración.
4. Vencer durante viaje conserva viaje y muestra revisión vencida. Vencimiento
   por sí solo no crea downtime, correctivo ni movimiento físico. El siguiente
   despacho requiere revisión vigente y todos los demás gates existentes.
5. Calendario, custom, política efectiva y versionado de dueAt necesitan contrato
   antes de ejecución. No elegir silenciosamente un TTL ni zona de navegador.
   America/Mexico_City sigue como zona operacional existente.

### Supersession precisa

Sustituye solo la obligación universal de nuevo ABC al cambiar de día en ADR017
(Calendar V1), ADR025 decisiones 8–9 y SPEC ABC (calendar y ABC-09): nueva revisión
se exige al vencer la política aplicable, además de verificación pendiente.
Una política diaria puede conservar el calendario diario actual.

ADR020 necesita extensión de programación/identidad de períodos; esta decisión no
aprueba un diseño sustituto del scheduler. Preservar no duplicación/exclusividad
CHECK, seguro, identidad/facility, inspecciones activas, evidencias, revalidación
al despacho, motivos de downtime y retorno permitido.

## Alternatives Considered

- Solo recordatorios configurables, aptitud siempre diaria: descartado
  expresamente por el usuario; no satisface revisión espaciada de Stock.
- Intervalo fijo por Daily/Stock: descartado en GrillMe; configuración aplica a
  toda unidad y categoría, no solo a un grupo.

## Consequences / Risks

Requiere política versionada y vencimiento consistente entre lista, Torre,
autorización y salida física. Backfill no debe inventar vigencia de firmas
históricas. Un error de calendario puede prolongar aptitud indebidamente.

## Follow-up / Related Artifacts

Resolver G2–G6 del SPEC, contratos/safety matrix y AC afectados; autorizar EWOs
separados antes de build. [UX](../design-system/unidades-readiness-v1.md),
[GrillMe](../../domain/mantenimiento/unidades-readiness-grillme-2026-10-17.md).

## Ownership

Fecha: 2026-10-17. Usuario/owner confirmó en este chat durante especificación:
**“Use configurable validity, replacing the daily-only rule”**. Eso resuelve
vigencia configurable frente a recordatorios; no aprueba ingeniería ni otras
políticas pendientes. Mantenimiento conserva hechos técnicos; Flota/Logística
consumen vigencia por contratos, sin ownership nuevo.

## Implementación autorizada posterior — 2026-10-17

Usuario: “Go ahead and build it”. [EWO-056](../engineering-work-orders/EWO-056.md)
y [contrato](../contracts/UNIDADES-READINESS-001-contract.md) concretan calendario,
versionado al review/firma, herencia, scope de configuración y ledger de generación
por período. Histórico firmado mantiene deadline; no hay backfill de aptitud.
Ledger/reportes de downtime y despliegue conservan autorización separada.

## Sustitución posterior — 2026-10-18

Usuario solicita solo chequeo diario y desactivar Daily/Stock.
[ADR029](029-daily-only-unit-checks.md) sustituye política efectiva configurable;
firmas y configuraciones anteriores se conservan como hechos históricos.
