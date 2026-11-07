# UX — Sucursal de la unidad (alta, edición y ficha)

Spec UX de [EWO-067](../engineering-work-orders/EWO-067.md). Complementa el EWO; no autoriza ejecución. Plantilla: [UX_SPEC_TEMPLATE](../design/UX_SPEC_TEMPLATE.md). Contrato visual: [DESIGN_SYSTEM](../design/DESIGN_SYSTEM.md#contrato-visual-vigente--lectura-obligatoria-para-agentes).

Estado: **Propuesta** (2026-11-07), pendiente de revisión del propietario.

## Screen purpose

Indicar a qué sucursal pertenece una unidad al darla de alta, poder corregirlo después, y verlo en la ficha. La sucursal decide quién puede operar la unidad.

## Primary user

`ADMIN_DIRECTIVO`, desktop. Alta y edición de unidad ya son solo de administrador (`RoleGate adminOnly` en `unidades/nueva` y `unidades/[id]/editar`). `SUPERVISOR`, `LOGISTICA` y `MECANICO` solo **leen** la sucursal en la ficha; no hay campo editable para ellos.

## Questions the screen must answer

1. ¿Qué estoy viendo? La unidad y su sucursal.
2. ¿Hay algo mal? Falta la sucursal (solo posible en unidades anteriores al backfill).
3. ¿Debo actuar? Elegir sucursal al crear; confirmar al cambiarla.

## Primary action

Sin acción nueva. Se conservan `Crear unidad` (alta) y `Guardar cambios` (edición), con `Button` `default`. El campo **Sucursal** es obligatorio, por lo que ambos botones siguen el estado del formulario.

## Secondary actions

`Cancelar` (`secondary`), sin cambios.

## Information hierarchy

P0: identidad de la unidad (número interno, placas), como hoy.
P1: **Sucursal** (campo obligatorio en el formulario; dato visible en la ficha).
P2: tipo, estado, marca/modelo, año, VIN.
P3: foto y notas de ayuda.

Se calla: id técnico del facility (`monterrey`, `nuevo-laredo`…), zona horaria y versión. No se pintan.

## Pattern

[PAGE_PATTERNS §7](../design/PAGE_PATTERNS.md): formulario largo en página con `UnidadForm` dentro de una sola `Card`. No es un patrón nuevo: se agrega **un campo** al formulario existente.

## Clone

`UnidadForm` actual (`web/src/components/UnidadForm.tsx`). El campo se parece a **Tipo**: `Field` + `NativeSelect`, mismas etiquetas, mismo espaciado y mismo `required`.

## Field

- **Label:** `Sucursal` (nunca "Patio" ni "Facility").
- **Posición:** inmediatamente después de **Tipo** y antes de **Estado**, para que la identidad y la pertenencia queden juntas.
- **Control:** `NativeSelect` (como Tipo), opciones ordenadas por nombre, tal como las entrega el catálogo.
- **Placeholder (alta):** `Seleccione una sucursal`, opción vacía no válida. **Sin preselección**: una sucursal por defecto asignaría unidades a la sucursal equivocada sin aviso.
- **Valor inicial (edición):** la sucursal actual de la unidad.
- **Obligatorio:** `required`; mismo tratamiento visual que los demás campos obligatorios.

## States

- **loading** (catálogo de sucursales): `p.muted` en una línea, `Cargando sucursales…`; el select permanece deshabilitado.
- **empty** (el catálogo vino vacío): `No hay sucursales configuradas. Avise al administrador del sistema.` Se explica por qué no se puede guardar. Sin CTA, porque no existe pantalla para crearlas (YAGNI, EWO-067).
- **error** (falló la lectura del catálogo): `FormAlert` con `No se pudieron cargar las sucursales.` y botón `Reintentar` (`secondary`). El envío queda deshabilitado hasta que cargue.
- **error** (falló el guardado): el mensaje del API en `FormAlert`, como hoy. Para sucursal inválida: `La sucursal indicada no es válida.`
- **normal:** select con la sucursal elegida, sin tinte.
- **warning** (edición, el valor cambió respecto al guardado): `Note warn` bajo el campo: `Al cambiar la sucursal, solo el personal de la nueva sucursal podrá operar esta unidad.` Informativo; no bloquea el guardado. No se inventan reglas sobre órdenes en curso (EWO-067).
- **critical:** no aplica.

## Ficha de la unidad (lectura)

- Se agrega **Sucursal** como dato de metadatos junto a placas y tipo, con el mismo estilo que esos datos (P2 de la ficha). Texto simple, sin badge ni color: la sucursal es una pertenencia, no un estado ni una alerta.
- Si la unidad aún no tiene sucursal (anterior al backfill): `Sin sucursal asignada` en tono `muted`, sin pintar la ficha en alerta.
- No se agrega a la lista de unidades ni filtro por sucursal en este corte (YAGNI). Si se necesita, es otro corte con su spec.

## Interaction notes

- Elegir sucursal no abre diálogos ni confirmaciones adicionales; el aviso de cambio es inline.
- Teclado: el select es nativo, con foco visible, hover y `disabled` ya definidos por la primitiva compartida.
- Sin motion nuevo.

## Mobile / responsive

- Desktop 1440: una columna dentro de la rejilla de dos columnas del formulario; Sucursal comparte fila con Estado según el orden actual.
- 1024: sin cambios; el formulario ya usa la rejilla compacta.
- 390: el select ocupa todo el ancho, alto táctil ≥44 px (la primitiva `NativeSelect` ya cumple). El administrador usa principalmente desktop; se revisa en móvil por regla del contrato.

## Contrato de datos que esta spec asume

- El catálogo de sucursales llega como lista `{ id, name }` ordenada por nombre. El formulario no hardcodea nombres.
- La unidad devuelve su sucursal (`id` y `name`) en los datos que ya usa la ficha y el formulario de edición.
- Origen del catálogo: **decisión de implementación pendiente** (ver "Escalación" de EWO-067). Hoy solo `/admin/users/options` lo expone y está pensado para administración de usuarios; usarlo para el formulario de unidades acopla dos pantallas. La opción preferida es una lectura propia de sucursales dentro del dominio de unidades. No lo decide esta spec.

## Fuera / Don't

- No exponer ni editar el id, la zona horaria ni la versión del facility.
- No crear pantalla de administración de sucursales.
- No usar la palabra "Patio" para la sucursal: `EN_PATIO` es un estado físico de Flota, otro concepto.
- No agregar color, badge ni icono nuevo para la sucursal.
- No tocar Flota, Logística ni el wizard de visita.

## Proof

PNG en `docs/screenshots/` con viewports 1440 y 390, vía [SCREENSHOT_WORKFLOW](../design/SCREENSHOT_WORKFLOW.md) y `proof-ui` (sin Playwright):

- `unidad-sucursal-nueva-1440.png`, `unidad-sucursal-nueva-390.png`
- `unidad-sucursal-editar-cambio-1440.png` (con el aviso de cambio)
- `unidad-sucursal-ficha-1440.png`, `unidad-sucursal-ficha-sin-asignar-1440.png`
- `unidad-sucursal-error-catalogo-1440.png`

Revisión independiente según [WORKFLOW — UI review chain](../WORKFLOW.md#ui-review-chain).
