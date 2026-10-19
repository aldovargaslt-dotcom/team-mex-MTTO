# Análisis de mantenimiento — discovery con GrillMe

Fecha cliente: 2026-10-18. Rondas Q1–Q14 respondidas; consolidación pendiente de
confirmación final de entendimiento compartido. No es SPEC ni autorización de implementación.

Actualización: Q15/Q16 respondidas y propietario solicita «hazle spec».
Dirección consolidada en [PRD](../../docs/prds/analisis-mantenimiento-v1.md) y
[SPEC-AN-MTTO-001](../../docs/specs/SPEC-AN-MTTO-001.md), Proposed con AC canónicos
y pendientes técnicos explícitos. Esta nota conserva historia de discovery;
la solicitud de documentación no constituye aprobación de implementación.

## Decisiones del usuario

Actualización de cierre: el propietario confirma las recomendaciones para cerrar
contratos: Directivo configura horarios, Supervisor consulta/solicita; utilización
porcentual solo con cobertura temporal completa; servicio externo de varios días
se reconoce en fecha de conclusión, piezas propias conservan consumo. El diseño
concreto queda en [contrato técnico](../../docs/contracts/AN-MTTO-001-technical.md)
y [ADR030 Proposed](../../docs/adr/030-maintenance-analysis-contracts.md), sin código.

- Usuarios: directivo y supervisor de mantenimiento.
- Objetivos: identificar unidades con gasto elevado, explicar tiempo sin operar
  y apoyar planeación con tendencias por sistema. El equipo interpreta posibles
  causas como ruta, carga o pavimento; el software presenta evidencia.
- Revisión semanal con tendencia mensual.
- Costo: refacciones más servicios externos; excluye mecánicos internos.
- Supervisor de mecánica registra servicios externos.
- Aceptado desglose por sistema; Sin desglose cuando no hay detalle.
- Separar mantenimiento, retención por otra causa y disponible sin uso;
  preservar Sin información.
- Q9: facturas externas pueden incluir piezas; identificarlas y vincular
  registros existentes para evitar duplicación. Si la empresa suministra las
  piezas, sumar su consumo y el servicio externo.
- Q10: distinguir revisión/ajuste, reparación y cambio de componente; analizar
  sistema + tipo de trabajo, frecuencia y km entre reparaciones/cambios cuando
  haya evidencia suficiente. Requiere ampliar el catálogo.
- Q11: utilización contra horario esperado de operación, parametrizable; horario
  concreto pendiente. Sin configuración no presentar porcentaje definitivo.
- Q12: costo atribuido al periodo de realización del servicio, comparación sin
  IVA y desglose de impuestos/total. Importe desconocido permanece pendiente;
  completarlo actualiza su periodo conservando fecha de captura.
- Q13: horario general de flota con excepciones por tipo de unidad o unidad,
  días laborables y franjas horarias. Cambios con fecha de vigencia; cambiar
  horarios futuros no reescribe porcentajes históricos. Periodos sin
  configuración identificados explícitamente.
- Q14: supervisor puede registrar servicio externo desde la unidad sin crear
  una orden interna adicional; asociar orden/parada existente cuando la haya.
  Capturar sistema, tipo de trabajo, proveedor, fecha, importe o costo pendiente,
  referencia/comprobante si está disponible. Guardar costo no finaliza el paro.
- Revisión visual posterior: el propietario solicita cambiar la paleta de los
  mocks y que Preventivo/Correctivo tengan identidad cromática consistente en
  toda la aplicación. Preferencia confirmada; colores concretos y tratamiento
  de otros conceptos pendientes de la nueva ronda GrillMe. No se ha implementado.
- Q15 resuelta: Preventivo azul `#2F5BB8`, Correctivo terracota `#C45D23` como
  identidad global, con estado/urgencia separados y selección de filtros neutra.
  La decisión reemplaza las convenciones locales divergentes; adopción pendiente.
- Q16 resuelta: servicios externos heredan Preventivo/Correctivo de la orden
  vinculada cuando exista; captura directa desde unidad solicita el tipo.
  Históricos sin evidencia quedan Sin clasificar, sin inferencia automática.

## Hechos revisados en código y documentación

- Inventario conserva costos de refacciones por unidad/visita y fecha efectiva,
  admite costo pendiente e importes neto/impuestos/total.
- Compra externa de piezas no representa servicio externo. No se encontró
  captura de servicios externos implementada; está propuesta en SPEC-UTIL-INPUTS-001.
- Trabajos clasificados A–E; llantas solo contempla calibración y rotación.
- No hay vínculo directo de cada costo de refacción a sistema/trabajo; una
  orden con múltiples sistemas no permite repartir automáticamente su gasto.
- Viajes durables existen en código; indisponibilidad completa por motivos y
  reporting siguen pendientes. Despliegue no verificado en esta sesión.

## Distribución propuesta para confirmación final

- Resumen: revisión semanal, gasto y pendientes de costear, utilización con
  cobertura visible, unidades destacadas por gasto/paros/recurrencia.
- Utilización e indisponibilidad: viajes, mantenimiento, otras retenciones,
  disponible sin uso y tiempo sin información; horario esperado configurable.
- Costos: refacciones + servicios externos, por periodo/unidad/sistema,
  costo por km cuando haya evidencia suficiente, impuestos desglosados.
- Tendencias por sistema: frecuencias, tipo de intervención, km entre
  reparaciones/cambios cuando existan datos suficientes; interpretación humana.
- Mantenimiento próximo y refacciones de mayor impacto apoyan planeación;
  los pendientes operativos enlazan a sus pantallas existentes.

## Brechas para especificación posterior

- Captura de servicios externos y prevención de doble conteo de piezas.
- Atribución de costos de piezas/servicios a sistema y ampliación del catálogo.
- Horarios versionados y reporting de utilización/indisponibilidad con cobertura.
- Diseño técnico, criterios verificables y aprobación de ejecución se tramitan
  por el flujo del repositorio tras confirmar el alcance; esta sesión no los sustituye.


## Resolución delegada para construcción — EWO-063

El propietario autorizó construir y aplicar recomendaciones pendientes. Se
verificaron fuentes reales antes de resolver: no ledger de motivos ni historia
de elegibilidad; sí costos/viajes/odómetros. Resultado: mostrar horas registradas
y cobertura faltante, sin porcentajes estimados; lectura scoped mediante puertos
de cada propietario; no mutar Salud/Andon/Logística/stock desde análisis.

Decisiones concretadas: semana ISO y día México; costo externo a la conclusión,
piezas al consumo; neto/IVA desconocido separado; claims de pieza versionados y
no solapados; corrección Admin con preview y motivo; horario versionado con
vigencia futura/actual; almacenamiento privado reutilizado; firma estable en
producción; rollback de evidencia prohibido y flags apagados por defecto.
[ADR030](../../docs/adr/030-maintenance-analysis-contracts.md) y
[evidencia](../../docs/evidence/EWO-063.md). No queda una decisión operativa nueva
pendiente de entrevista para este incremento; la historia ABC/UTIL es dependencia
de otra entrega y la activación externa requiere el procedimiento documentado.
