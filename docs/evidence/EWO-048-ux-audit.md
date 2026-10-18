# EWO-048 — Auditoría UX independiente

Veredicto: **OK visual / PASS** para la retirada del destino global Mantenimiento vencido. Sin hallazgos accionables confirmados en el delta inspeccionado.

Revisor: subagente `ux-auditor`, independiente del implementer. Solo lectura de runtime; este dictamen es el único archivo escrito por el auditor. Sin Playwright. La evidencia de EWO-047 no se utiliza como prueba actual.

## Autoridad y alcance

Se abrieron EWO-048, el diff actual de AppShell/WorkspaceSidebar, el registro `EWO-048-browser.json` y las cuatro capturas actuales. Se aplicaron las instrucciones de `.cursor/agents/ux-auditor.md`, VISUAL_QA, gramática de navegación/filtros y fuentes locales del sistema UI leídas en esta sesión.

La petición del propietario y el EWO sustituyen la conservación histórica de `/andon` como destino secundario. El diff elimina únicamente ese destino de NAV_ITEMS y su entrada/import de icono. No se propone rediseñar Inicio, modificar reglas, borrar la ruta compatible ni crear otro centro de alertas.

## Resultados

| Criterio | Resultado y evidencia actual |
| --- | --- |
| AC-01 | **PASS visual**: sidebar expandida y menú móvil de Supervisor/Admin no contienen Mantenimiento vencido ni otro acceso global Andon. El registro actual también informa PASS para riel plegado y menú800. |
| AC-02 | **PASS visual/documental acotado**: las capturas de Inicio conservan filtro Mantenimiento, condición activa con unidad TM-104 y acción contextual «Atender mantenimiento». Se contrastó código existente de `alert-catalog.service.ts:359` (href de unidad con `vista=mantenimiento`) e `inbox-rules.ts:41` (aviso de unidad al hub, fallback `/andon`); `web/src/app/andon/page.tsx` permanece. No hay edición de esas fuentes en el delta. |
| AC-03 | **PASS visual**: Inicio, Órdenes, Unidades, Inventario y Configuración siguen presentes. Admin conserva Movimientos, Choferes y Usuarios; campanita/sesión permanecen visibles. El diff no cambia restricciones de otros roles. |

La excepción y la acción se identifican con claridad; retirar el acceso global no borra el término legítimo «Mantenimiento vencido» de la alerta. No se detecta recorte ni regresión visual causada por la retirada. No se inventan hallazgos para alcanzar una cuota.

## Capturas inspeccionadas

Abiertas individualmente mediante `view_image`; paths relativos a `docs/screenshots/`:

- `ewo048_supervisor_inicio_d1440.png`
- `ewo048_supervisor_menu_m390.png`
- `ewo048_admin_inicio_d1440.png`
- `ewo048_admin_menu_m390.png`

## Registro y límites

Se leyó el registro focal actual: **41 comprobaciones PASS**, con role picker, Supervisor/Admin en1440/390/800, riel plegado, filtros, campanita, destinos y vínculo contextual. Los checks browser son del implementer; no se repitieron independientemente por el auditor. Las cuatro capturas se inspeccionaron de forma independiente y no acreditan por sí solas todos los clicks del registro.

El transporte HTTP es un **fixture local descartable**, no una API productiva. Se comprueba la presentación y destino de la acción; no se afirma completar una atención de mantenimiento, resolver la alerta, verificar eventos ni ejecutar autorizaciones productivas. La continuidad de campanita/inbox y roles se sustenta en el diff acotado y registro actual, sin declarar una regresión integral del producto. No se ha ejecutado lint/build en este pase independiente; sus resultados corresponden a la evidencia canónica del implementer.

**Hold SD / visual OK humano pendiente**, conforme al EWO y VISUAL_QA. Este dictamen no autoriza push ni despliegue.
