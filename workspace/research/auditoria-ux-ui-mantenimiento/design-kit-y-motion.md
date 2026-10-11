# Mapa de problemas compartidos y design kit

Propuesta posterior a evidencia; no cambios de tokens/componentes. Conservar navy `#24284D`, naranja `#EA7515`, Roboto y componentes Team Mex adecuados. E146 confirma Roboto público. SAP/Fiori aporta mensajes, jerarquía/listado→objeto y trazabilidad; no copiar sus procesos. Carbon/Material complementan, Taste opcional sin bloqueo.

| Patrón compartido | Pantallas/evidencia/hallazgo | Conservar / consolidación propuesta | Criterio de contraste y límite |
|---|---|---|---|
| Disponibilidad fiel | Órdenes/selector/Andon/Alertas/Consumo/Movimientos local; público E148→E149, documento E153→E154; H01 | FormAlert/lista/tabla/empty; contratos carga, datos, vacío exitoso, fallo, parcial y dato anterior | Error/carga no afirman cero/Sin piezas; explícita fuente faltante. No exige skeleton para corregir fidelidad |
| Vacío filtrado | Órdenes E94 vs E53/E73; H10 | Filtros actuales, recuperación/limpiar y copy contextual | Diferenciar vacío global/0 coincidencias; conservar cola/filtro/contexto |
| Recuperación | Público E143/E148 sólo recarga; Mi trabajo local con Reintentar; H03 | Button/lecturas propias de cada pantalla | Error→reintento→éxito sin duplicar escritura; auth/permiso no se resuelven con reintento infinito |
| Fila de atención | Inicio E51/E52 normales y E143/E144 parcial; H02 | inbox-list/inbox-copy, variante con/sin icono | Error usa ancho de texto, normal mantiene jerarquía; no poner mensaje en columna de 36px |
| Contraste y jerarquía de acción | Nueva orden local, Adjuntar ticket E130/E150; H04/H15 | Navy/naranja/Button y variantes existentes | Texto ≥4.5:1 normal, estados/foco; un primario sólido por vista, fila secundaria. No toda acción debe naranja |
| Overlays/foco | Nueva orden/filtro/sheet de movimiento, E70/E97/E150/E151; H05/H07 | RadixDialog/Sheet, títulos/descripción/portal/hits | Trap, Escape/Cancelar/Cerrar restauran foco, scroll/recorte; reduced-motion en etapa diferida |
| Navegación por capacidad | Mecánico E90–E92, H06; contraste de roles H09 | AppShell/RoleGate, selección de perfil y retorno | Control corresponde a permiso existente; comprobar puro/multirol sin conceder permiso nuevo |
| Identidad y trazabilidad | Hub/documento/historial E119–E129; movimiento E151–E154; pendiente 404E83; H11/H13 | Identidad unidad/placas/tipo; documento único, secciones, OtLink | ID unívoco y origen/disponibilidad de relación, tipo de última visita explícito; no enlace a404 sin explicación |
| Evidencia y firmas | Wizard/closed E112–E121; pendiente E130–E139; H12/H14 | Fotos opcionales, cantidades/orígenes, reglas vigentes; preservar medios y estado | Mecanismo accesible equivalente para firmas por acordar; estado/acción de comprobante coherentes; no obligatoriedad de ticket inventada |
| Selección navegación/filtro | Colas azules, periodos/filtros navy; H08 | Tabs cuando navegación, ListFilter cuando filtro | Definir semántica con usuarios/datos antes de uniformar; elegido reconocible además de color y teclado |
| Tabla móvil/detalle | Consumo E85/E141, Movimientos E151, Historial E129 | Scroll interno de tabla, sheet de detalle, etiquetas UOM | Columna fuera del primer ancho no significa pérdida; probar descubrimiento del scroll/retorno/lector antes de rediseñar |
| Definiciones/estados de análisis | Mix/cadencia/Salud/Consumo; H01/H13/H14 | Representaciones actuales que apoyan reconstrucción | Snapshot≠tendencia, intervalo documental≠reparación, comprobante≠stock; fuente/período/UOM/frescura/faltantes |

Estas familias consolidan problemas vistos, no imponen normalización a pantallas no observadas. El kit deberá registrar anatomía/variantes/estado/semántica/teclado/recovery por patrón; la lista es backlog de documentación posterior, no librería implementada ni Figma creada.

## Oportunidades de carga, skeletons, transiciones y animaciones — diferidas

| Oportunidad | Evidencia y propósito | Dependencia / criterio futuro |
|---|---|---|
| Carga secundaria de piezas en documento | E153 muestra Sin piezas mientras catálogo resuelve; E154 línea correcta. Evitar falsa ausencia al completar relación | Fidelidad de estado entra mantenimiento H01; skeleton/forma visual **diferidos**, evaluar espera/espaciado antes de elegir |
| Listados/colas/selector/hub | La primera sesión sólo observó error; datos públicos disponibles, sin latencia controlada cuantificada | Skeleton estructural sólo si latencia real justifica; no ocultar error ni aparentar datos; medir espera/CLS y lector |
| Guardado/paso/cierre | Guardando…/Cerrando…observados, E118 transitorio→E119 hub. Cambiar paso guarda PATCH | Mantener feedback de operación y bloqueo mientras guarda; probar desconexión/duplicación antes de animaciones; no simular confirmación antes del servidor |
| Selección de fila/documento/retorno | Movimiento: fila→sheet→visita y Nueva orden → diálogo; foco BODY | Corregir retorno de foco según H05; transición visual posterior preserva identidad/contexto/scroll y preferencia reduce |
| Fotos/ticket/firmas | Imagen sintética cargada y trazo a confirmado; no cámara real ni carga de archivo fallida | Feedback de archivo/progreso sólo con estado real; no decorar/cambiar evidencia. Espera/fallo/lector/archivo grande por medir |
| Reduced-motion | E150 media query reduce true, enter/transition 0.3s; H07 | Implementación de motion **P3 diferida**. OPERATE_CRAFT pide cero con reduce y habitual 150–250ms; acordar comportamiento de apertura/cierre sin desplazar el primer sprint |

No se midió rendimiento, duración de espera, CLS o mejora de tiempo humano; no se inventan umbrales ni se declaran skeletons obligatorios. Accesibilidad de firmas es barrera actual P1 independiente de motion y no se difiere por estar asociada a un canvas.

## Referencias aplicadas

- [SAP/Fiori: mensajes](https://www.sap.com/design-system/fiori-design-web/v1-151/foundations/best-practices/global-patterns/messaging/messaging), [list report/object page](https://developers.sap.com/concepts/fiori-list-report-object-page/): información de estado y relación lista→objeto→documento, sin copiar flujo.
- [Carbon: empty states](https://carbondesignsystem.com/patterns/empty-states-pattern/): vacío contextual y recuperación; uso complementario.
- [Material: accesibilidad](https://m3.material.io/foundations/accessible-design/overview): consideración de acceso/estado, sin reemplazar Team Mex.
- Reglas locales: [OPERATE_CRAFT](../../../docs/design/OPERATE_CRAFT.md), [VISUAL_QA](../../../docs/design/VISUAL_QA.md), [DESIGN_SYSTEM](../../../docs/design/DESIGN_SYSTEM.md), [PAGE_PATTERNS](../../../docs/design/PAGE_PATTERNS.md), [UX_PRINCIPLES](../../../docs/design/UX_PRINCIPLES.md) y [botones semánticos](../../../docs/design-system/ui-semantic-button-pastels-v0.md). Precedencia local registrada; solución a reglas de producto pendientes no inferida de SAP/Carbon/Material.
