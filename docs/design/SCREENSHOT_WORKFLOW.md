# Screenshot workflow

Objetivo: **implementar → renderizar → capturar → Visual QA → corregir → recapturar**. No es una plataforma de visual regression.

## Qué hay (y qué no)

| | |
|--|--|
| Usar | Skill [`proof-ui`](../../.cursor/skills/proof-ui/SKILL.md): click-through, PNG en `docs/screenshots/`. Agentes: browser / computer use. Humanos: ventana real o DevTools **sin** marco en el PNG. |
| No usar | Playwright, Cypress, Chromatic, pixel-diff en CI. `web/` no tiene E2E. CI = lint + build. `@playwright/test` en el lockfile es **transitiva**, no herramienta del repo. |
| Por qué no añadir Playwright | Overlay explícito (“sin Playwright”). El fallo que nos importa es jerarquía/copy, no un diff de 2px. Añadir runner + browsers + fixtures de rol duplica el stack. |

Si en el futuro un humano pide regression automática, eso es otro ADR/CI — no este sistema.

---

## Viewports

| Nombre | Tamaño | Cuándo |
|--------|--------|--------|
| `d1440` | 1440×900 | **Siempre** en pantallas tocadas (Admin / Flota / listados) |
| `d1280` | 1280×800 | Si hay tabla ancha o header con 3 acciones |
| `d1024` | 1024×768 | Si el corte cambia grid / `.hub-grid` / filtros a columna |
| `m390` | 390×844 | Wizard WO, shell `<768`, sticky Continuar, hits 44px |

No hace falta la matriz completa en un PR de una columna copy. Sí hace falta **d1440 + el flujo clickeado**. WO: **m390** obligatorio (Continuar visible, sin recorte).

---

## Cómo capturar (agente)

1. App en `http://localhost:3000` (API 3001). Rol stub desde `/`.
2. Viewport al tamaño de la tabla. Entrar por el **role picker**.
3. Clicar el flujo (abrir dialog, filtrar, sticky, disabled→enabled). Una URL pegada no es proof.
4. PNG **sin** DevTools, device-toolbar, ni barra de inspect.
5. Guardar en `docs/screenshots/` (o artefactos del agente listados en el PR).

Nombres:

```text
{corte}_{pantalla}_{estado}_{viewport}.png
```

Ejemplos: `existencias_tabla_consulta_d1440.png`, `wo_piezas_continuar_enabled_m390.png`.

Los briefs viejos sin sufijo de viewport siguen válidos; los nuevos lo llevan.

---

## Catálogo (páginas clave)

| Ruta | Rol | Patrón | Notas de captura |
|------|-----|--------|------------------|
| `/` | — | Role picker | Una vez por PR que toque shell/home |
| `/inicio` | Supervisor, Admin | Cola | Con excepciones y vacío si el corte las toca |
| `/unidades` | ambos | Listado agrupado | Buscar + grupos |
| `/unidades/:id` | ambos | Hub | U-101; Andon + Nueva visita (un naranja) |
| `/unidades/:id/visitas/:id` | Supervisor | WO | m390 pasos + sticky; desktop stepper |
| `/andon` | ambos | Listado + chips | Pendientes / empty |
| `/inventario` | ambos | Listado + subnav | Fila → ficha sheet |
| `/inventario/stock` | ambos | Listado | `?alerta=BAJO`; CTA entrada |
| `/inventario/movimientos` | ambos | Listado | Filtros en URL |
| `/inventario/pendientes` | ambos | Listado | Por recibir |
| `/notificaciones` | ambos | Inbox | Unread + quiet action |
| `/flota` | Logística, Admin | Tablero | Chips viaje; Atención ámbar |
| `/flota/unidades/:id` | Logística, Admin | Ficha viaje | Form salida/entrada |
| `/flota/sitios` | Logística, Admin | Listado | |
| `/logistica` | Logística, Admin | Listado asignación | Chips Disponibles/En ruta; sheet; d1440 |
| `/choferes` | Admin | Listado | |

Semilla: U-101, `PAST-FR-01` Bajo. Ver README.

---

## Loop de corrección

```text
Implementer captura
    → ux-auditor (3–5 hallazgos)  [no edita]
    → Implementer corrige + recaptura solo lo roto
    → ux-auditor confirma o frena
```

Un video de walkthrough **no** sustituye PNG si es setup o pelea con DevTools (`proof-ui`).

---

## PR

Sección Proof: lista de paths. Visual QA: veredicto + hallazgos. Hold hasta SD / visual OK.
