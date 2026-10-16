# INV-001 — Verificación del paquete documental

## Alcance

Consolidación solicitada tras respuestas Q1–Q9 de GrillMe. Fecha de referencia: 2026-10-15 en zona de cliente. No implementación, migración, prueba de entorno productivo ni despliegue.

Artefactos principales: [SPEC Inventario](../specs/SPEC-INV-001.md), [SPEC Unidades](../specs/SPEC-MTTO-UX-002.md), [PRD](../prds/PRD-INV-001.md), [ADR propuesto](../adr/026-inventario-costos-historicos.md), [contrato técnico](../contracts/INV-001-costos.md). EWOs UI existentes enlazados y conservados Draft.

## Resultados

| Comprobación | Estado | Resultado |
|---|---|---|
| Enlaces relativos en ocho documentos del paquete | PASS | 66 referencias existentes |
| Espacios finales/formato de esos documentos | PASS | Sin incidencias |
| Criterios canónicos | PASS | Inventario AC01–36; Unidades AC01–17 presentes |
| `git diff --check`, cwd repositorio | PASS | Sin incidencias en diff tracked; archivos nuevos comprobados con Python |
| Ejemplos numéricos con enteros half-up en Python | PASS | Nueve grupos descritos debajo |
| Lint/build/API/E2E/proof-ui/Visual QA funcional | SKIPPED | Cambios documentales, sin código de producto ejecutado |
| Migración/backfill/despliegue | SKIPPED | No solicitados ni realizados |

Ejemplos comprobados, importes en MXN:

- $116 incluido16% y $100 excluido16% → neto100, IVA16, total116.
- $1,392 incluido16% → neto1,200, IVA192.
- $0.01 incluido16% → neto0.01, IVA0.00 por redondeo explícito.
- Neto100 al8% → total108; al0% →100.
- Stock10×100 + entrada10×120 →20 piezas, valor2,200, promedio110.
- Consumo3 → costo330, saldo17 piezas y1,870.
- Saldo3 piezas con valor total$1.00, salidas de1:0.33,0.34,0.33; agotamiento deja valor0.
- Retorno de dos piezas con costo original total$0.67: parcial0.34 y final0.33; no supera original.

El script comprobó existencia de rutas en links Markdown, ausencia de trailing whitespace y secuencia de AC; no verificó semántica de navegador, render de Markdown, autorización API ni comportamiento transaccional implementado. La aritmética de especificación no equivale a pruebas unitarias de una funcionalidad existente.

## Riesgos visibles y handoff

ADR/contrato siguen Proposed para revisión: selección de fecha efectiva de retorno, límites técnicos de tasa/rango y estrategia de regularización están escritos como diseño, no respuestas atribuidas al usuario. Definir esquema/migración física, adapters y pruebas en el EWO financiero antes de ejecutar. No declarar UI A dependiente de una API financiera inexistente, ni conceder idempotencia al endpoint legacy por documentar uno nuevo.

Siguiente acción: revisión/aceptación del paquete técnico y autorización del alcance de ejecución correspondiente. No hay aprobación inferida de runtime, migración externa o deploy.
