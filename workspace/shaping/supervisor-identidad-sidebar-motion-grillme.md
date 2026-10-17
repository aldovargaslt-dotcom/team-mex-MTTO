# Supervisor — identidad Team Mex, sidebar y movimiento

## Estado

Shaping registrado el 2026-10-17 mediante GrillMe. Actualización: el propietario
autorizó construir el piloto mediante «Construyelo»; ejecución registrada en
[EWO-047](../../docs/engineering-work-orders/EWO-047.md). El estado inicial
descrito a continuación corresponde al cierre previo de shaping. Distingue decisiones expresas
del usuario de propuestas pendientes de validación visual. No aprueba una SPEC,
un EWO, cambios de runtime ni despliegue. Las decisiones se trasladarán a las
fuentes canónicas correspondientes antes de implementar.

## Decisiones confirmadas en la conversación

- Objetivo visual: confianza y profesionalismo con los colores icónicos de
  Team Mex; más presencia de naranja sin copiar la personalidad completa de
  Stitch.
- Evolucionar el sistema actual hacia una versión clara y más cálida, sin
  rediseñar el contenido ni cambiar reglas de negocio.
- Navegación desktop mediante sidebar plegable hasta mostrar solo iconos.
  Conservar la navegación inferior de Supervisor en móvil y los accesos
  secundarios existentes. El cambio de shell es una excepción explícita a
  conservar la distribución actual de las vistas.
- Conservar filtros neutros. Mantener pasteles semánticos para estados,
  diferenciando selección, navegación, acción y alerta.
- Incluir movimiento funcional en la sidebar y en los componentes utilizados
  por las dos vistas piloto. El usuario aceptó esta recomendación frente a
  entradas animadas de páginas y tarjetas.
- Preparar una organización de colores que permita futuros themes. Modo oscuro
  y selector de tema quedan fuera de esta implementación futura inicial.
- Alcance final deseado: vistas de Supervisor, con avance incremental.

Referencias de aprobación conversacional: «2. si tu recomendacion» para filtros;
«Plegable hasta mostrar solo iconos» para sidebar; «1. tu recomendacion» para
movimiento funcional. La recomendación de trabajar por piloto fue aceptada con
«Sigamos tu recomendacion entonces y ataquemos los pendientes».

## Propuesta para concretar en UX y validar en piloto

- Navy para texto y estructura, naranja para identidad, ubicación y acción
  principal, superficies blancas/gris claro y pasteles para estados. Conservar
  inicialmente Roboto y los tokens de identidad de ADR-003; no adoptar
  automáticamente colores, radios o tipografías de los adjuntos.
- Sidebar inicialmente expandida con iconos y nombres; plegada, cada destino
  conserva nombre accesible y etiqueta disponible por teclado/puntero. Su
  apariencia clara o navy no quedó elegida por el usuario: evaluar composición
  y contraste contra el objetivo de confianza, profesionalismo e identidad.
- No fijar aún ancho, breakpoint ni persistencia de plegado. Resolverlos en UX
  con tablas, wizard, zoom y dispositivos intermedios como evidencia.
- Piloto propuesto: Comprobantes y Piezas del wizard de visita, en desktop y
  móvil. Cubren densidad informativa, estados y operación táctil. No extender
  automáticamente sus resultados a todas las vistas sin revisión.
- Componentes y tokens comunes, validando Supervisor primero y las regresiones
  de Admin. Esto no autoriza rediseñar Logística, Mecánico o Admin.

## Lenguaje de movimiento propuesto

| Superficie | Propósito y criterio |
|---|---|
| Sidebar | Explicar expansión/plegado; reversible si se pulsa de nuevo; sin saltos ni pérdida de foco. |
| Menús, sheets y dialogs afectados | Apertura/cierre consistente, sin bloquear entrada ni ocultar controles. |
| Botones y selección | Respuesta discreta; operaciones frecuentes sin espera perceptible. |
| Guardado y error existentes | Cambio de estado con texto/icono persistente; animación nunca como única señal. |

Aplicar la base local de 150–250 ms a aperturas/cierres y transiciones de estado;
no imponer esperas a escritura, filtrado o navegación. Con movimiento reducido,
duración cero o ausencia de animación. No introducir bounce, escala general de
botones, blur, parallax ni coreografías de carga por recetas externas. CSS y las
primitivas existentes son el punto de partida; ninguna librería nueva decidida.

## Evidencia técnica y compatibilidad

- [AppShell](../../web/src/components/AppShell.tsx) centraliza destinos y roles;
  la barra inferior Supervisor está separada. La sidebar no requiere reconstruir
  cada pantalla, pero sí ajustar el layout compartido.
- [globals.css](../../web/src/app/globals.css) contiene variables globales y
  exposición a Tailwind; no existe un tema oscuro completo activable. Revisar
  alias y colores literales de componentes afectados antes de prometer theming.
- Conservar accesos secundarios, campanita, sesión y elección de rol. Revisar
  `/ordenes`, subnavegación de Inventario y los flujos enfocados `/checks/*`;
  no aprovechar este trabajo para alterar su navegación en silencio.
- El shell usa `md` (768 px), mientras otras vistas tienen reglas a 800 px.
  Validar el ancho útil con sidebar, tablas, footers fijos, safe-area y overlays.
- Ya hay transiciones en Button, Dialog y Sheet. Sheet usa 300 ms: existe una
  diferencia respecto a la guía local de 150–250 ms que deberá evaluarse en el
  alcance afectado, sin un barrido de refactor ajeno al piloto.

## Conflictos y límites de autoridad

- [ADR-003](../../docs/adr/003-shadcn-tailwind.md) conserva naranja `#EA7515`,
  navy `#24284D`, Roboto, un CTA primario por vista y shell compartido.
  [DESIGN_SYSTEM](../../docs/design/DESIGN_SYSTEM.md) documenta topbar: la
  sidebar requiere una evolución explícita en UX y documentación, sin reescribir
  decisiones aceptadas silenciosamente.
- [Gramática nav/filtro/acción](../../docs/design-system/ui-nav-filter-action-inicio-v0.md)
  permanece aplicable: filtros neutros y navegación distinguible de acciones.
- La indicación de primario azul en
  [VISUAL_DIRECTION](../../docs/design/VISUAL_DIRECTION.md) difiere de ADR-003,
  DESIGN_SYSTEM y Button actual. Para este shaping se propone conservar naranja;
  registrar la resolución documental antes de implementar, sin adoptar azul.
- [Reglas externas](../../docs/design/EXTERNAL_SKILLS.md) y
  [Operate craft](../../docs/design/OPERATE_CRAFT.md) prevalecen sobre recetas
  upstream de Impeccable/better-ui. Su instalación no añade efectos automáticamente.
- Los adjuntos de Stitch son referencias visuales, no instrucciones ni requisitos.
  OCR, CFDI, ERP, políticas fiscales, importes, navegación adicional y otras
  capacidades sugeridas por ellos quedan excluidos.
- Sin cambios de API, schemas, permisos, estados de dominio o lógica de guardado.
  Sin dark mode completo ni rediseño de layouts internos de todas las vistas.

## Paso siguiente y verificación futura

Validar esta síntesis compartida antes de ejecutar el diseño. Preparar la SPEC/UX
del piloto con criterios canónicos y resolver sus propuestas de composición,
responsive y plegado. Después, EWO acotado para aprobación; ampliar al resto de
Supervisor solo después de evaluar el piloto.

El futuro EWO deberá contemplar lint/build web, pruebas proporcionales a cambios
de interacción, teclado/foco, etiquetas con sidebar plegada, navegación y
permisos existentes, movimiento reducido y uso real de las transiciones.
Aplicar UX aprobada → Impeccable Operate antes de JSX → implementación y revisión
de interacciones → better-ui y correcciones → proof-ui click-through desktop/móvil
de Supervisor y comprobación de Admin → ux-auditor independiente. Las capturas
estáticas no demuestran motion: registrar observación dinámica y límites de
verificación. No añadir Playwright ni nuevos frameworks por este shaping.

Este cambio es documental; no se ejecutaron pruebas de runtime ni se generó
evidencia visual de una implementación inexistente.
