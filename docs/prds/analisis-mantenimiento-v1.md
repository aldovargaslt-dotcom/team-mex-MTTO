# Análisis de mantenimiento v1 — intención de producto

## Estado y autoridad

Proposed, fecha cliente2026-10-18. Propietario: usuario de esta conversación.
Dirección de producto confirmada en GrillMe Q1–Q16; solicitud actual: «okay,
entonces, hazle spec». Autoriza documentación, no implementación ni despliegue.
La SPEC enlazada es fuente de comportamiento y AC; este PRD no duplica criterios.

## Problema y resultado esperado

Directivo y supervisor necesitan revisar cada semana qué unidades concentran
gasto, qué explica su tiempo sin operar y qué sistemas requieren intervenciones
frecuentes. Hoy la información está repartida entre órdenes, inventario, viajes
y alertas. Faltan captura general de servicios externos y atribución de costos
por sistema. Datos desconocidos pueden impedir comparaciones válidas.

Resultado: encontrar una señal, compararla con unidades/periodos pertinentes y
abrir la evidencia que la explica. El equipo interpreta causas como carga,
ruta o pavimento; no se atribuyen automáticamente por software.

## Usuarios y alcance

- Directivo y Supervisor: cuatro vistas Resumen, Utilización, Costos y Tendencias
  por sistema; lectura dentro del alcance autorizado.
- Supervisor de mecánica: registra servicios externos desde unidad, vinculados
  a orden/parada cuando exista. Captura económica independiente de liberación.
- Horarios configurables: general y excepciones por tipo/unidad con vigencia.
  Directivo configura; Supervisor consulta y solicita ajustes por canal existente.
  No se presenta porcentaje de utilización si la cobertura temporal es incompleta.
- Costos: refacciones consumidas + servicios externos, sin mecánicos internos,
  comparación sin IVA y desglose de impuestos/total; pendientes visibles.
  Servicios de varios días se reconocen al concluir; piezas propias conservan
  su fecha de consumo. IVA desconocido no se presume cero.
- Tendencias: tipo Preventivo/Correctivo, sistema y revisión/ajuste/reparación/
  cambio; frecuencia, costo atribuible y km entre intervenciones con evidencia.
- Identidad de tipo: Preventivo azul #2F5BB8, Correctivo terracota #C45D23 en
  toda la app, manteniendo estado/urgencia independientes.

## Proceso y evidencia actual

Código revisado: `api/src/visitas/visita.entity.ts`, `trabajos-catalogo.ts`,
`api/src/inventario/entities/cost.entity.ts`, `inventory-costs.service.ts`,
`api/src/logistica/journey.entity.ts`. Hay órdenes, trabajos, costos de piezas,
odómetros y viajes durables; despliegue no verificado. Compra externa de piezas
no representa servicio externo. No existe relación directa costo→sistema.
El ledger completo de indisponibilidad sigue dependiendo del incremento ABC/UTIL.

## No objetivos

ERP/contabilidad/compras, mano de obra interna, productividad de mecánicos,
GPS/TMS, predicción de fallas, atribución causal de desgaste, stock estimado,
seguridad/liberación desde un gráfico o reconstrucción ficticia de historia.
No reemplazar Análisis de Inventario ni añadir dashboard a Inicio/Flota.

## Medición de éxito

Evaluar cobertura de costos conocidos y clasificados, cobertura temporal de
reportes, conciliación resumen/detalle y posibilidad de rastrear una cifra a
registros. Línea base y objetivos numéricos aún desconocidos; no inventar metas
ni prometer ahorro. Revisión de utilidad por directivo y supervisor.

## Dependencias y riesgos

Completar captura y reglas de servicio externo, clasificación, horarios y
reporting mediante contratos de propietarios existentes. Sin nuevo bounded
context, schema ni permisos implícitos. Captura tardía cambia periodos anteriores
y debe ser visible. Costos faltantes, horarios desconocidos y odómetros inválidos
impiden métricas completas; una gráfica no elimina esa incertidumbre.

## Artefactos

- [SPEC-AN-MTTO-001](../specs/SPEC-AN-MTTO-001.md).
- [Contrato propuesto AN-MTTO-001](../contracts/AN-MTTO-001-contract.md).
- [Diseño técnico para revisión](../contracts/AN-MTTO-001-technical.md) y
  [ADR030 Proposed](../adr/030-maintenance-analysis-contracts.md).
- [UX](../design-system/ux-analisis-mantenimiento-mock-v1.md).
- [Discovery](../../workspace/discovery/maintenance-analysis-grillme.md).
- [ADR025](../adr/025-abc-utilization-downtime.md),
  [ADR027](../adr/027-logistica-durable-journeys.md).
- [Contrato visual](../design/DESIGN_SYSTEM.md).
- EWO: no creado; requieren resolución de contratos y aprobación acotada.
