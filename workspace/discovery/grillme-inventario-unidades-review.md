# GrillMe — revisión de Inventario y Unidades

## Estado y alcance

Revisión documental y de código dirigido, sin implementación. Usuario solicitó GrillMe y respondió explícitamente Q1–Q9. Fecha de referencia del chat: 2026-10-15, zona de cliente. Revisión incluye SPEC-INV-001, SPEC-MTTO-UX-002, sus UX y EWO-038/039. No certifica UI funcional ni puntúa imágenes como producto probado.

## Acuerdos de las rondas

| Pregunta | Respuesta | Regla consolidada |
|---|---|---|
| Q1 · Varias órdenes | Sí | Una continuable: directo; varias: selector autorizado |
| Q2 · Apertura valorizada | Sí | Admin valida corte/cantidad/valor; consumos anteriores pendientes sin retropropagación |
| Q3 · Costos tardíos | Sí | Supervisor completa pendientes; Admin autoriza correcciones; trazabilidad y periodo original regularizado |
| Q4 · Adjunto posterior | Sí | Adjuntar tras RECIBIDA con auditoría y sin efectos de stock/costo; requiere backend |
| Q5 · Descuento/flete | Solo total | Total por refacción/operación; unitario derivado; sin campos ni reparto automático separados |
| Q6 · Ajustes y retornos | Sí | Merma al promedio conocido, sobrante pendiente Admin, retorno de orden al costo histórico disponible |
| Q7 · Proveedor/comprobante | Sí | Proveedor obligatorio en compras nuevas; comprobante puede quedar pendiente |
| Q8 · Recepción sin precio | Sí | Permitir entrada física, costo pendiente y promedio incompleto hasta regularización |
| Q9 · Devolución a proveedor/cambio/garantía en primera entrega | No | Fuera de primera entrega; excepción física documentada por ajuste/revisión sin simular flujo financiero |

Las decisiones anteriores de promedio ponderado, MXN, con/sin IVA, 16% editable, Salud compacta y kilometraje de consulta siguen vigentes. Retorno de orden al almacén no equivale a devolución al proveedor.

## Hallazgos resueltos en documentos

- La API actual de entrada no ofrece idempotencia: EWO-038 ya no promete que solo UI garantice exactamente una aplicación tras timeout. Ante resultado incierto no reenvía automáticamente; garantía completa requiere backend separado.
- El código del hub puede llegar a Al corriente pese a errores de fuentes. SPEC exige desconocido/error explícito y hechos confirmados conservados.
- choferNombre no representa responsable de mantenimiento: label Chofer. Fecha de cierre no acredita fecha física de lectura de odómetro.
- El primer reporte financiero se acota a Costo de refacciones; no total de mantenimiento con mano de obra/otros inexistentes.
- AC de lista/ficha se ajustó a ancho suficiente y fallback Sheet; no obliga split-pane a todo escritorio.
- Adjunto posterior y costo tardío se distinguen de recepción documental y corrección financiera; no se declaran capacidades actuales.

## Resultado

La dirección de operación está consolidada para el alcance acordado. Se pueden preparar los cortes UI A con límites explícitos. B financiero aún necesita diseño técnico verificable; aceptar reglas de negocio no lo convierte en Ready ni autoriza ejecución/deploy.

Antes de ejecutar B, concretar: ADR/ownership de importes y snapshots; contrato de permisos y operaciones; idempotencia/concurrencia; precisión/redondeo/residuos y validación de tasas/comprobantes; apertura/regularización de stock desconocido; ajustes/retornos/correcciones append-only; datos históricos y reconciliación de reportes. No asignar estas decisiones técnicas al usuario si pueden resolverse y justificarse con evidencia de ingeniería. Si aparece una nueva elección de negocio material, volver a plantearla explícitamente.

## Fuentes y próximos artefactos

- [SPEC Inventario](../../docs/specs/SPEC-INV-001.md): 36 AC canónicos.
- [SPEC Unidades](../../docs/specs/SPEC-MTTO-UX-002.md): 17 AC canónicos.
- [EWO-038](../../docs/engineering-work-orders/EWO-038.md) y [EWO-039](../../docs/engineering-work-orders/EWO-039.md): Draft, sin ejecución.
- [UX Inventario](../../docs/design-system/inventario-flujo-costos-v1.md) y [UX Unidades](../../docs/design-system/ficha-unidad-v1.md).

Siguiente paso: consolidar contrato/decisión técnica financiera y ajustar los artefactos de ejecución, conservando separados UI A y costos B. No se implementa trabajo final desde GrillMe.
