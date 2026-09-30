# Auditoría — experiencia Supervisor v0

## Estado y alcance

**Estado:** discovery / propuesta; no aprobada.
**Base revisada:** `main` en `26c22e5` (`feat(unidades): add photo crop editor (#81)`).

Esta auditoría cubre Inicio, Órdenes, Unidades, ficha de unidad, wizard de visita y Alertas para `SUPERVISOR`. No evalúa `/flota`: es una superficie de Logística y el Supervisor recibe 403 en sus endpoints.

### Tipo de evidencia

- **Código/documentación:** rutas, permisos, acciones y estados fueron inspeccionados en `web/src` y `api/src`.
- **Interfaz observada:** verificada contra PostgreSQL efímero en `127.0.0.1:5433`, API local y semilla del repositorio. Se recorrieron Inicio, Órdenes, Unidades, hub, creación de borrador, wizard, Alertas y hub de alerta en escritorio y 390×844. No se guardaron PNG en el repositorio.
- **Propuesta:** las recomendaciones de este documento requieren decisión de producto antes de implementación.

## Mapa actual

| Recorrido | Ruta / capacidad | Permiso Supervisor | Evidencia |
|---|---|---:|---|
| Entrada | `/inicio` | Sí | Cola de excepciones de Andon, stock bajo/agotado y compras por recibir; cada fila navega a su lista. |
| Órdenes | `/ordenes` | Sí | Lista borradores y cerradas, busca por unidad/placa/chofer y abre ficha sin abandonar la cola. |
| Retomar | `/unidades/:id/visitas/:visitaId` | Sí, solo borrador | En el hub, `Continuar` abre el wizard; en Órdenes, el enlace observado se llama `Editar` y abre el mismo wizard. |
| Alertas | `/notificaciones` | Sí | Bandeja con Andon, Inventario y Salud; la fila se marca leída y navega por `deeplinkPath`. |
| Andon | `/andon` | Sí | Avisos de mantenimiento; el Supervisor puede marcar `Enterado`, que no resuelve la alerta. |
| Consulta de unidad | `/unidades` → `/unidades/:id` | Sí | Búsqueda/filtros; el hub muestra salud, Andon, estado, km, actividad, borradores e historial. |
| Crear visita | Hub de unidad | Solo unidad `ACTIVA` | `puedeCrearVisita` exige `SUPERVISOR` + `ACTIVA`; además el wizard exige chofer activo para cerrar. |
| Flota Logística | `/flota`, `/logistica/*` | No | Exclusivo Admin/Logística; no usar como navegación de Supervisor. |

### Modelo real de órdenes

No existe asignación individual ni ownership por Supervisor. La cola se construye listando unidades y sus visitas; los borradores son compartidos por unidad. Los únicos estados existentes son `BORRADOR` y `CERRADO`; no existen «pausada», «en progreso», prioridad ni vencimiento.

## Evaluación por expectativa

| Capacidad | Evaluación | Nota |
|---|---|---|
| Entender qué requiere atención | Existe, pero requiere evolución a Dashboard | Inicio lista excepciones; debe sumar un resumen direccional de órdenes abiertas, Salud y alertas abiertas por defecto. |
| Encontrar y retomar pendientes | Existe y funciona en código | Órdenes abre en `Abiertas`, permite buscar y tiene CTA Continuar. Requiere verificación de interfaz/datos. |
| Alertas con problema, unidad y acción | Existe, pero desigual | Andon enlaza a la unidad; Inbox depende del `deeplinkPath` y primero marca leído. La capacidad de resolver/acknowledge no se comunica como modelo común. |
| Consultar estado e historial de unidad | Existe y funciona en código | Catálogo, filtros, hub, Health, Andon e historial están presentes. Salud, estado administrativo y situación operativa son conceptos distintos; Logística no aparece en este hub. |
| Navegar sin perder contexto | Existe parcialmente | Órdenes conserva selección/filtros en URL. Unidades conserva filtros solo en estado local; al volver desde el hub no hay contrato de retorno con filtro/scroll. |
| Móvil | No verificado | El shell usa Sheet y las specs declaran objetivos de 390 px, pero no hubo ejecución en viewport móvil. |

## Hallazgos priorizados

### UX-01 — Inicio no muestra la dirección hacia órdenes abiertas

- **Recorrido:** entrada → entender prioridades.
- **Evidencia:** `web/src/app/inicio/page.tsx` consulta Andon, stock y compras; no consulta borradores ni muestra salud. `web/src/app/ordenes/page.tsx` es la única cola de borradores. En ejecución, tras crear el borrador local de DUCATO 2021, Inicio solo mostró «1 mantenimiento vencido» y «1 refacción con stock bajo».
- **Problema:** tras crear un borrador local, Inicio solo mostró alertas. El Supervisor no recibe la señal de que existen órdenes abiertas ni un acceso direccional a `/ordenes`.
- **Impacto:** la pantalla de dirección no comunica todo el trabajo abierto del Supervisor.
- **Severidad:** 3 (mayor).
- **Recomendación:** añadir un resumen de `Órdenes abiertas` —conteo y enlace a `/ordenes`— sin reproducir la lista, la ficha ni acciones de la cola.
- **Criterio verificable propuesto:** con una o más órdenes abiertas, Inicio muestra el conteo y un enlace a `/ordenes`; con cero, omite el resumen.

### UX-02 — Una alerta vista desaparece del filtro operativo predeterminado

- **Recorrido:** alerta → entender problema → unidad afectada → acción.
- **Evidencia:** `web/src/app/notificaciones/page.tsx`, función `abrir`, primero `POST /notifications/:id/read` y después `router.push(item.deeplinkPath)`.
- **Problema:** el filtro predeterminado es «No leídas». Abrir una alerta la marca leída, por lo que deja de estar en la superficie predeterminada aun cuando la condición fuente sigue abierta.
- **Impacto:** contradice la definición de producto recibida: una alerta abierta debe permanecer visible.
- **Severidad:** 3 (mayor).
- **Recomendación:** la vista operativa por defecto debe ser «Abiertas» (no expiradas), no «No leídas». «Vista» no es una acción de resolución.
- **Criterio verificable propuesto:** una alerta vista continúa en Dashboard/Alertas hasta que el dominio fuente la expire o resuelva; la fila comunica problema, sujeto y siguiente acción.

### UX-03 — Regresar desde la ficha de unidad borra el contexto de búsqueda

- **Recorrido:** Flota de mantenimiento → unidad → regreso al panel.
- **Evidencia:** `web/src/app/unidades/page.tsx` mantiene `q`, filtros y atención en estado React; `HubIdentityHeader` enlaza literalmente a `/unidades`.
- **Problema:** el Supervisor que localizó una unidad con búsqueda/filtros vuelve a un catálogo reiniciado.
- **Impacto:** trabajo repetitivo y desorientación, especialmente en catálogos grandes o móvil.
- **Severidad:** 2 (menor).
- **Recomendación:** representar filtros y vista de Unidades en URL, o llevar un `returnTo` validado desde el catálogo al hub. No persistir datos de Logística ni crear rutas nuevas sin spec.
- **Criterio verificable propuesto:** al volver desde una unidad abierta desde una búsqueda, se restauran búsqueda, filtros y lista previamente visibles.

### UX-04 — Las capacidades de alerta no se presentan como una jerarquía de acción

- **Recorrido:** Inicio/Alertas → unidad → acción.
- **Evidencia:** Inicio usa conteos sin severidad ordenada; Inbox muestra fuentes diversas; Andon tiene `Enterado`; Salud es derivada y se resuelve por cambios en las fuentes, no por «cerrar alerta».
- **Problema:** la UI ofrece fuentes, pero no explica la diferencia entre revisar, reconocer y resolver. El usuario puede asumir que `Enterado` cierra el mantenimiento vencido.
- **Impacto:** acciones incompletas y expectativas erróneas.
- **Severidad:** 2 (menor).
- **Recomendación:** usar copy contextual: Andon «Marcar como enterado — sigue activa hasta cerrar una visita»; Salud «revisar factores en la ficha»; inventario «abrir existencias». No unificar schemas ni estados.
- **Criterio verificable propuesto:** cada fila/CTA explica su efecto y su siguiente acción sin afirmar que una alerta se resuelve cuando el dominio no lo permite.

### FUNC-01 — La cola de órdenes escala con una consulta por unidad

- **Recorrido:** panel de órdenes.
- **Evidencia:** `web/src/app/ordenes/page.tsx` obtiene `/unidades` y luego solicita `/unidades/:id/visitas` para cada unidad con `Promise.allSettled`.
- **Problema:** la carga y el error parcial dependen del número de unidades; no existe endpoint de cola explícito.
- **Impacto:** latencia, estados incompletos y diagnóstico pobre conforme crece la flota.
- **Severidad:** 3 (mayor).
- **Recomendación:** decidir en producto/arquitectura si una cola compartida merece una lectura dedicada y paginable. No implementar sin ADR/spec porque cruza Mantenimiento, permisos y posible ordenamiento.
- **Criterio verificable propuesto:** una cola de 50 unidades carga con resultado completo, error accionable y sin solicitudes N+1 desde el navegador.

### UX-05 — La ficha de orden comunica estados que el producto no soporta

- **Recorrido:** Órdenes abiertas → ficha de borrador.
- **Evidencia observada:** el borrador local de DUCATO 2021 se abrió correctamente en `/ordenes`; su ficha renderizó «Abierta · Pausada · En progreso · Hecha». Código y documentación establecen solo `BORRADOR` y `CERRADO`; `docs/design/ux-ordenes-trabajo-v0.md` confirma que Pausada y En progreso no se guardan.
- **Problema:** la franja se lee como ciclo de vida o acción disponible, aunque tres rótulos no corresponden a estados persistidos ni reglas de negocio. Además, el enlace de retomar en la misma ficha se observó como `Editar`, mientras el hub y la UX existente lo llaman `Continuar`.
- **Impacto:** expectativa falsa sobre pausado/progreso/completado y menor claridad al retomar una orden.
- **Severidad:** 3 (mayor).
- **Recomendación:** expresar solo el estado existente (`Borrador` o `Cerrada`), rotular el enlace como `Continuar` y, si se requiere progreso del wizard, usar el indicador real «Paso n de 7» dentro del wizard. No crear nuevos estados.
- **Criterio verificable propuesto:** una ficha de orden no muestra Pausada, En progreso ni Hecha como estados mientras el dominio solo soporte Borrador/Cerrada, y su CTA de borrador dice `Continuar`.

## Preferencias visuales (no defectos verificados)

- No se emitieron hallazgos de contraste, densidad, espaciado o responsive como hechos visuales: no hubo interfaz ejecutada.
- La propuesta debe conservar el patrón de excepción, no añadir KPIs/gráficas ni usar `/flota` como home de Supervisor.

## Propuesta de experiencia

```text
Inicio (Supervisor)
  Requiere atención
    Mantenimiento vencido → Andon / ficha de unidad
    Inventario → Existencias
    Evidencia pendiente de compra externa → Pendientes
    Salud de unidad → ficha / factores
  Órdenes abiertas → /ordenes

Órdenes
  Abiertas | Cerradas + búsqueda/filtros
  fila seleccionada → ficha → Continuar borrador

Unidades
  búsqueda/filtros conservables → Hub de unidad
  Salud + Andon + estado administrativo + km
  Continuar o Registrar mantenimiento según regla existente
```

La propuesta reutiliza Inicio, Órdenes, Unidades, hub, wizard, Andon e Inbox. Requiere comportamiento nuevo: Dashboard Supervisor con Salud, alertas abiertas por defecto y resumen direccional de órdenes abiertas; preservación de retorno de Unidades y semántica explícita de alertas. Órdenes permanece como panel de trabajo. El futuro panel de Inventario y sus máximos requieren shaping de dominio independiente.

## Mejoras prioritarias

1. **Dashboard Supervisor de alertas y órdenes abiertas.** Beneficio: dirección completa sin duplicar trabajo; cambio UI/navegación. Dependencia: lectura resumida de órdenes y copy por fuente.
2. **Mantener alertas abiertas aunque estén vistas.** Beneficio: no se pierden excepciones; cambio UI/consulta. Dependencia: conservar expiración de cada dominio.
3. **Conservar búsqueda/filtros de Unidades.** Beneficio: retorno orientado; cambio de navegación. Dependencia: definir URL/returnTo.
4. **Aclarar estados y CTA de Órdenes.** Beneficio: no inventar estados; cambio visual/copy. Dependencia: ninguna regla nueva.
5. **Shaping de Inventario Control.** Beneficio: configuración entendible; cambio producto/dominio. Dependencia: definir `max_qty` y KPIs autorizados antes de SPEC/ADR.

## Verificación

| Comando / recorrido | Resultado | Nota |
|---|---|---|
| `git ls-remote --heads …team-mex-MTTO.git` | PASS | Confirmó remoto y `main`. |
| `git fetch origin main` + checkout tracking | PASS | Workspace en `main` `26c22e5`. |
| Revisión estática de rutas, permisos y docs | PASS | Evidencia enlazada arriba. |
| `cd web && npm ci` | PASS | Dependencias instaladas localmente; npm reportó 2 vulnerabilidades no corregidas. |
| `cd web && npm run lint` | PASS | ESLint no emitió errores antes de finalizar. |
| `cd api && npm test -- --runInBand` | PASS | 28 suites y 175 pruebas pasaron. Los avisos de adapters de prueba no fallaron la ejecución. |
| `cd web && npm run build` | SKIPPED | El runner dejó procesos Next/Turbopack sin resultado final; no se marca como éxito. |
| Docker + PostgreSQL aislado | PASS | `team-mex-mtto-audit-db` en `127.0.0.1:5433`; no se tocó el PostgreSQL existente en `5432`. |
| API local + semilla | PASS | `GET /health` devolvió 200 en `3001`; el catálogo tenía 13 unidades. |
| Inicio Supervisor desktop y 390 px | PASS | Mostró Andon y stock; borrador creado no apareció. |
| Órdenes desktop y 390 px | PASS | Borrador encontrado, seleccionado y abierto; el panel mostró estados no soportados. |
| Unidad → crear borrador → wizard | PASS | DUCATO 2021 Activa creó borrador y abrió «Paso 1 de 7 · Datos». |
| Alertas → unidad afectada → acción | PASS | Al abrir mantenimiento vencido de FOTON, la fila se marcó leída y llevó al hub con Health crítica, alerta y «Marcar como enterado». |

## Preguntas que requieren decisión humana

Input de producto recibido el 2026-09-28; este documento sigue en discovery y no constituye aprobación de implementación:

1. Inicio es el dashboard direccional: muestra alertas y el resumen de órdenes abiertas; Órdenes sigue siendo el único panel de trabajo. Inicio no duplica lista, ficha ni acciones de órdenes.
2. No se autorizan prioridad, vencimiento ni ownership en esta etapa. Ownership se evaluará después, junto con creación de usuarios.
3. «Visto» no controla visibilidad: las alertas deben seguir apareciendo mientras su condición de dominio esté abierta. Futuras prioridades o destinatarios requieren decisión posterior.
