# Page patterns

Recetas que **ya** usa el producto. Nueva UI = una de estas, no un quinto layout.

Tokens y primitivas: [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md). Jerarquía: [VISUAL_HIERARCHY.md](VISUAL_HIERARCHY.md).

---

## 1. Role picker

**Ruta:** `/`. **Chrome:** sin nav.

`home` centrado + `home-card` (sí, una card: es la única superficie). H1 “Operación de unidades”. Un primary (Supervisor), secondary (Admin), outline (Logística). Post-login → `/inicio` o `/flota`.

No dashboard. No tres cards de producto.

---

## 2. Cola de excepciones (Inicio)

**Ruta:** `/inicio`. Supervisor + Admin.

`PageHeader` (saludo + lede). **Cero** CTA naranja. Lista `.inbox-list`: solo lo que sigue abierto (Andon, stock bajo, agotado, por recibir). Vacío: una línea.

No gráficas, no KPIs, no feed, no campanita duplicada.

---

## 3. Listado denso + filtro

**Rutas:** Andon, Existencias, Refacciones, Movimientos, Por recibir, Flota, Logística (asignación), Choferes, Sitios, Notificaciones.

```
PageHeader (H1 + lede + acciones)
ListFilter | búsqueda  (P2)
FormAlert
DataTable | inbox-list
empty-state | “Cargando …”
```

- Un naranja en header si hay alta/entrada; Flota Sitios / Configurar alertas = secondary.
- Fila clickeable → ficha o hub. Evitar “Detalle”.
- Filtros enumerados = `ListFilter` (chips). Búsqueda de texto = `Input` en el header o una fila, **sin** card de un solo campo (Choferes es deuda).
- URL comparte filtros cuando el corte lo pide (`?alerta=`, `?filtro=`, movimientos).

---

## 4. Listado agrupado (Unidades)

Igual que (3) pero secciones por **tipo**: H2 14/13px + resumen de aviso en muted + tabla por grupo. Acciones de tipo = outline en el grupo; primary de la vista = Nueva unidad (si ya hay tipos).

Búsqueda `q` + tipo + estado. Empty de filtros ≠ empty de catálogo.

---

## 5. Hub / ficha de objeto

**Rutas:** `/unidades/:id` (MTTO), `/flota/unidades/:id` (viaje).

```
PageHeader: id + StatusBadge + lede (tipo · placas)
P0 excepción (Andon / Note warn / Atención)
P1 CTA (Nueva visita | Registrar salida/entrada) — un naranja
P2 hechos actuales (dl .dl o panel Situación)
P3 historial / refacciones / ciclos
```

MTTO: `.hub-grid` dos columnas (ficha | mantenimiento). Flota: una columna (situación + form de movimiento + historial). **No** unificar esos dos BCs.

No tabs de expediente. No card por cada dl.

---

## 6. Wizard de visita (WO)

**Ruta:** `/unidades/:id/visitas/:visitaId` en borrador. Solo Supervisor.

```
H1 = U-xxx + badge Borrador
Lede = tipo · km · chofer
Stepper: mobile “Paso N de 7”; desktop .steps
Un paso visible; Card del paso OK
Sticky Continuar / Cerrar visita (primary) + Atrás/Cancelar (secondary)
```

Pasos: Datos → Trabajos → Obs → Fotos → Piezas → Firmas → Confirmar. Hits 44px `<768`. Piezas: card por línea en mobile está permitido. Dropzone: **Tomar o subir**.

Detalle **cerrado**: patrón (5) documento, no siete cards apiladas (deuda).

---

## 7. Formulario de alta / edición

Corta: **Dialog** (tipo, chofer, alertas, sitio, nueva refacción).

Larga: página + `UnidadForm` en `Card` de una vez (no un campo = una card). Footer: primary Guardar + secondary Cancelar.

Sheets: ficha refacción, movimiento inventario — no dialog centrado.

---

## 8. Inbox (campanita)

**Ruta:** `/notificaciones`. Mismo esqueleto que (3) con `.inbox-row`. Unread = fondo cálido + punto naranja. Acción quiet: Marcar todas leídas. Deeplink; no es Inicio.

---

## 9. Catálogo detrás de ops

Inventario: `.subnav` Refacciones · Existencias · Movimientos · Por recibir · **Catálogo**. Familias/Proveedores solo con Catálogo activo (segundo subnav).

No mezclar Familias en la barra diaria.

---

## 10. Estados de pantalla (todos los patrones)

| Estado | UI |
|--------|-----|
| loading | `p.muted` una línea |
| empty | `.empty-state` título 14 + por qué 12; CTA opcional si desbloquea (Nuevo tipo) |
| error | `.error-state` o `FormAlert`; no toast genérico |
| warning | `Note warn` / `.row-warn` / badge warning |
| critical | badge danger + magnitud; no rediseñar la página en rojo |
| normal | tabla/ficha sin tinte |

---

## Elegir patrón

| El usuario viene a… | Patrón |
|---------------------|--------|
| Ver qué está vencido / faltante | 2 o 3 (cola o lista filtrada) |
| Encontrar un objeto y abrirlo | 3 o 4 |
| Entender un objeto y actuar | 5 |
| Completar un procedimiento | 6 |
| Crear/editar un registro corto | 7 dialog |
| Revisar eventos | 8 |

Si no encaja, escribe spec UX y **justifica** el layout nuevo. El default es (3) o (5).
