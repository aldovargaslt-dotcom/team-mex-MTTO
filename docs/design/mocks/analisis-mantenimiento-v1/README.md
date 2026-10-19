# Análisis de mantenimiento — entrega conceptual v1

Diseño y documentación únicamente, 2026-10-18 (fecha cliente). Datos ficticios.
Sin implementación ni cambios a dependencias, rutas, API o permisos.

Comportamiento y AC canónicos del incremento:
[SPEC-AN-MTTO-001](../../../specs/SPEC-AN-MTTO-001.md), Proposed. Estos mocks son
referencias de composición del Resumen, no capturas de capacidades implementadas.

Actualización posterior Q15/Q16: estos PNG conservan la paleta exploratoria
turquesa/violeta. No representan la nueva identidad global aprobada de Preventivo
azul `#2F5BB8` y Correctivo terracota `#C45D23`; la spec y contrato están actualizados.
Las series de estos PNG comparan conceptos de costo, no tipos de mantenimiento.

- [Resumen desktop](resumen-desktop.png).
- [Resumen móvil](resumen-mobile.png).
- [Especificación UX](../../../design-system/ux-analisis-mantenimiento-mock-v1.md).
- [Decisiones de producto](../../../../workspace/discovery/maintenance-analysis-grillme.md).
- [Revisión conceptual](revision-conceptual.md).

`resumen-desktop-concepto-v1.png` conserva el primer pase, anterior a las
correcciones de nomenclatura, enlaces y etiquetas. Las dos imágenes sin sufijo
concepto son la entrega final de esta iteración, no aprobación humana final.

## Cómo leer los mocks

La tabla y cifras de síntesis muestran la semana12–18octubre; el gráfico mensual
es contexto de seis meses con octubre parcial. Los costos pendientes no son cero.
La gráfica por sistema cuenta órdenes concluidas que incluyen ese sistema, no
fallas ni cambios de piezas. No existe atribución causal automática.

Desktop adopta shell, escala compacta y subnavegación de módulo del producto.
Móvil es una composición vertical extendida que explica apilamiento y navegación,
no una captura de viewport390. El registro de4accesos inferiores se conserva;
Análisis se propone desde el menú global, con selector de sección en contexto.

## Cobertura de este pase

- Dirección Impeccable Operate, fuentes locales y hermano existente: revisados.
- Spec UX: escrita para Resumen; otras secciones definidas a nivel de información.
- Revisión independiente de concepto: primer pase y corrección acotada.
- Normal/parcial: representados en mocks; otros estados documentados en spec.
- Imágenes generadas: medidas, tipografía y tonalidades aproximadas. Los valores
  normativos están en el contrato y la spec, no se extraen de píxeles del mock.
- `Reparaciones frecuentes` debe ser texto neutral: el generador lo tiñó en
  desktop. No hay regla aprobada que convierta frecuencia por sí sola en alerta.

No ejecutado/no aplicable a imagen: ui-implementer, better-ui sobre código,
proof-ui/click-through, verificación de teclado, contraste de DOM, overlays,
motion, responsive ejecutable, lint/build/tests y Visual QA formal de aplicación.
No se atribuye resultado PASS a esos gates.

Verificación documental: `git diff --check` sin errores de espacios en los
archivos seguidos; enlaces locales de entrega comprobados por existencia.
Aceptación visual del propietario pendiente.
