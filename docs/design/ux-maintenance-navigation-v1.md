# UX — Ubicación y navegación visual de mantenimiento

Aprobado por usuario en sesión2026-10-11: aplicar orientación a todas las vistas de mantenimiento, iconos en filtros y configuración separada con menor énfasis. Continuación de EWO029, sin reglas/API nuevas.

Hermano: PageHeader de Andon/listados existentes y HubIdentityHeader de ficha. Conservar patrones2–8, navegación, tokens y un CTA operativo naranja máximo.

- Inicio: H1 «Inicio» estable; saludo y conteo en lede. Acceso «Configurar alertas» como engranaje quiet, con nombre accesible y tooltip, junto al título; hit44px móvil. No ocupa fila del saludo/filtros. Configuración sigue disponible por shell/menú.
- Fichas: ubicación visible «Ficha de unidad · [sección]» sobre identidad; conservar unidad como H1 y riel con sección activa. Órdenes: ubicación «Orden de mantenimiento» / «Orden cerrada» arriba de identidad. No segundo H1.
- Resto: conservar los títulos explícitos existentes de listados, altas, edición, inventario/configuración/notificaciones; auditar rutas del área. No inyectar título duplicado en shell.
- ListFilter admite iconos opcionales16px, decorativos aria-hidden, con texto/conteos. Inicio: List/Truck/Package; estado en Andon y stock: iconos acordes. Sin naranja en filtros. Periodos mantienen texto sencillo.
- Prueba: d1440/m390 Inicio y filtro; click configuración; ficha secciones y orden; vistas representativas con título existente; ambos roles. Sin overflow ni pérdidas de targets44px. Revisión ux-auditor independiente.

Reemplaza en ux-alert-attention-v1 únicamente saludo como H1 y botón secondary grande de configuración. Lo demás permanece.

## Actualización aprobada — Compras

Usuario acepta2026-10-11 separar Compras tras propuesta Todos/Mantenimiento/Inventario/Compras. Inicio filtra por kind: maintenance/stock/purchase; Inventario contiene sólo existencias y Compras comprobantes pendientes. Todos cuenta cada problema una vez. Iconos List/Wrench/Package/ReceiptText. Mobile cuatro filtros en grid2columnas; desktopfila. URL antigua area=FLOTA se interpreta como Mantenimiento; nuevas selecciones usan MANTENIMIENTO/COMPRAS. Contrato API y dueños intactos. Empty por categoría y errores existentes conservados.

## Ajuste de affordance de configuración

Petición explícita de usuario: configuración debe parecer botón secundario, con menos enfoque que filtros. Engranaje mantiene ubicación/tamaño/icono/nombre accesible y adopta Button secondary: fondo blanco, borde gris1px y texto muted; sin borde invisible. No restaura la fila grande de configuración.
