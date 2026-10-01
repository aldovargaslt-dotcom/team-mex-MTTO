# Diseño de Team Mex MTTO

Este documento es la **puerta de entrada** al diseño de producto y de interfaz de Team Mex MTTO. No reemplaza las especificaciones funcionales, los ADR ni los briefs aceptados: indica dónde encontrar la fuente de verdad correcta antes de diseñar, implementar o revisar una experiencia.

## Qué estamos diseñando

Team Mex MTTO es una herramienta operacional para mantenimiento de flota. Ayuda a Supervisor, Administración y Logística a entender qué unidad necesita atención, registrar visitas y piezas, consultar alertas, operar movimientos de patio y ver el estado y la salud de una unidad.

La descripción autoritativa del producto, sus actores, alcance v0 y no-objetivos está en [`context/PRODUCT.md`](context/PRODUCT.md). El vocabulario compartido está en [`context/GLOSSARY.md`](context/GLOSSARY.md).

## Principios de diseño

- **Operación primero.** La acción principal, el estado actual y la siguiente decisión deben ser evidentes.
- **Jerarquía antes que decoración.** Cada pantalla debe distinguir información primaria, secundaria y de apoyo sin competir por atención.
- **Lenguaje del dominio.** La interfaz conserva los términos operacionales definidos por el producto; **WO** siempre significa el wizard de visita.
- **Estados explícitos.** Carga, vacío, error, éxito, permisos y datos incompletos forman parte del diseño.
- **Consistencia por primitivas.** Se reutilizan tokens y componentes existentes antes de crear variantes locales.
- **Accesibilidad y uso real.** Contraste, foco, objetivos táctiles y comportamiento responsive se verifican en la interfaz renderizada.

La guía completa está en [`docs/design/UX_PRINCIPLES.md`](docs/design/UX_PRINCIPLES.md), [`docs/design/VISUAL_HIERARCHY.md`](docs/design/VISUAL_HIERARCHY.md) y [`docs/design/UI_ANTI_PATTERNS.md`](docs/design/UI_ANTI_PATTERNS.md).

## Dirección visual y sistema

La UI usa Next.js App Router, shadcn/ui y Tailwind, con tokens Team Mex. La decisión técnica vive en [`docs/adr/003-shadcn-tailwind.md`](docs/adr/003-shadcn-tailwind.md).

| Necesidad | Fuente de verdad |
|---|---|
| Dirección visual del producto | [`docs/design/VISUAL_DIRECTION.md`](docs/design/VISUAL_DIRECTION.md) |
| Tokens y primitivas | [`docs/design/DESIGN_SYSTEM.md`](docs/design/DESIGN_SYSTEM.md) y `web/src/app/globals.css` |
| Patrones de páginas existentes | [`docs/design/PAGE_PATTERNS.md`](docs/design/PAGE_PATTERNS.md) |
| Principios de experiencia | [`docs/design/UX_PRINCIPLES.md`](docs/design/UX_PRINCIPLES.md) |
| Jerarquía P0–P3 | [`docs/design/VISUAL_HIERARCHY.md`](docs/design/VISUAL_HIERARCHY.md) |
| Patrones que se deben evitar | [`docs/design/UI_ANTI_PATTERNS.md`](docs/design/UI_ANTI_PATTERNS.md) |
| Must / Don’t de cortes aceptados | [`docs/design-system/README.md`](docs/design-system/README.md) |

Los briefs de `docs/design-system/` son históricos y específicos de cada corte. No deben generalizarse ni convertirse en una nueva regla global sin una decisión explícita.

## Cómo diseñar un cambio

Para una pantalla nueva o un cambio no trivial de layout, jerarquía o acciones:

1. Identificar la spec funcional, el ADR y el brief del área mediante [`ICM.md`](ICM.md).
2. Escribir una spec UX con [`docs/design/UX_SPEC_TEMPLATE.md`](docs/design/UX_SPEC_TEMPLATE.md).
3. Implementar con las primitivas y tokens existentes.
4. Recorrer la experiencia y capturar evidencia según [`docs/design/SCREENSHOT_WORKFLOW.md`](docs/design/SCREENSHOT_WORKFLOW.md).
5. Hacer un pase independiente de Visual QA con [`docs/design/VISUAL_QA.md`](docs/design/VISUAL_QA.md).
6. Corregir los hallazgos de mayor impacto y registrar la evidencia en `docs/evidence/` y `docs/screenshots/`.

Una corrección menor de copy no requiere una spec UX completa. Una implementación no trivial sí requiere un Engineering Work Order aprobado, con ID `EWO-xxx`; ese artefacto no se abrevia como WO.

## Reglas por área

- **Mantenimiento:** `/unidades` y el wizard de visita pertenecen a Supervisor/Admin; no son el escritorio de Logística.
- **Logística:** la navegación principal lleva a `/flota`. El tablero de viaje se rige por [`docs/specs/fleet-tablero-viaje-v0.md`](docs/specs/fleet-tablero-viaje-v0.md) y su brief visual. La asignación chofer↔unidad sigue aparcada.
- **Inventario y Andon:** no se fusionan visual ni conceptualmente; sus ownership y schemas permanecen separados.
- **Salud:** el Health Score es calculado y explicable; no es un tercer estado editable de la unidad.
- **Alertas y campanita:** el catálogo de tipos, los avisos Andon y el inbox son conceptos distintos. No se unifican sus schemas.

Las reglas completas y el contexto exacto que debe cargarse antes de cada cambio están en [`AGENTS.md`](AGENTS.md) e [`ICM.md`](ICM.md).

## Límites

El diseño no debe introducir por sí solo nuevas reglas de negocio, ownership, conceptos de dominio o decisiones arquitectónicas. Si una propuesta necesita cualquiera de ellos, debe volver a shaping, spec o ADR antes de implementarse.

También permanecen fuera de v0 el multi-almacén, lotes, costeo, órdenes de compra formales, kardex pesado, relación ítem↔placa, reserva de stock en borrador, GPS, rutas y TMS.

## Índice completo

El índice operativo del sistema UI/UX está en [`docs/design/README.md`](docs/design/README.md). Ese documento define el flujo vigente de implementación y revisión; este archivo solo facilita descubrirlo desde la raíz del repositorio.
