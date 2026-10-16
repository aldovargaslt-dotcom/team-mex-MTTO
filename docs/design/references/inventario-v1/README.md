# Inventario v1: referencias de flujo y UI

Propuesta visual, datos ilustrativos. No es UI implementada ni evidencia de pruebas. Fuente canónica: [SPEC-INV-001](../../../specs/SPEC-INV-001.md).

El usuario aceptó la **distribución** de estas referencias en el chat del 2026-10-15 («Me gusta la distribución; Spec it»). Ubicación, interacción y adaptación quedan especificadas en [UX de Inventario](../../../design-system/inventario-flujo-costos-v1.md); esta aceptación no aprueba fotos ficticias, nuevos permisos o decisiones financieras pendientes.

- [Diagrama Mermaid editable](flujo-inventario.mmd)
- [Refacciones y ficha](refacciones-ficha.png)
- [Entrada en escritorio y celular](entrada-desktop-mobile.png)
- [Comprobantes](comprobantes.png)

Ejemplo de entrada: stock previo 10 piezas netas a $100, entrada de 10 piezas por $1,392 IVA incluido al 16%, neto $1,200, IVA $192, nuevo stock20 y promedio neto $110. Compra externa ilustrativa: 3 piezas netas a $120 = $360, IVA $57.60, total $417.60.

Las miniaturas de productos son decoración ilustrativa, no una nueva capacidad de fotografías del catálogo. El formulario conserva sin resolver la obligatoriedad de proveedor/documento; no copiar el label opcional como regla aprobada. Los títulos/tamaño de letra, estados, foco, contraste y responsive se ajustarán al sistema real. En refacciones Activa es estado del catálogo y Bajo es condición de stock, conceptos separados.

El costo de ajustes, stock inicial, permisos y redondeo siguen sujetos a las decisiones de la SPEC. El diagrama no establece una regla adicional de cierre por costo faltante ni implica que recibir documento completa el costo. La comprobación documental y la financiera son independientes. Con costo desconocido mostrar cobertura incompleta, no cero.
