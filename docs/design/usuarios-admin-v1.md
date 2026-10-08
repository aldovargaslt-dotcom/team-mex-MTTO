# UX — Usuarios

Panel nuevo `/configuracion/usuarios`, sólo ADMIN_DIRECTIVO. Acceso desde
Configuración existente y menú móvil. Patrón listado→formulario; tokens y
primitivas ADR-003, sin dashboard ni nuevo kit.

P0 Usuarios; P1 Agregar usuario único naranja; P2 búsqueda/estado, nombre,
roles, patios y activo/inactivo; P3 explicación de cuenta del proveedor.
Listado DataTable denso; nombre como botón accesible abre edición. Mobile permite
scroll horizontal de tabla; diálogos dentro del viewport con scroll vertical.

Formulario: nombre, identificador de cuenta del proveedor (necesario para vincular
identidad, inmutable al editar), roles y patios con etiquetas, activo. Checkbox
de rol/patio con zona clickeable >=44px móvil. Guardar único naranja en diálogo,
Cancelar secundario, CTA de listado secundario mientras diálogo abierto.
Desactivar requiere confirmación explícita con nombre; nunca acción destructiva
primaria. Se muestra error último administrador o edición concurrente.

Loading y error con reintento; fallo no conserva listado obsoleto. Sin permiso no
consulta usuarios. Guardado fallido conserva formulario y no anuncia éxito.
Confirmación sólo tras respuesta; recarga revalida sesión para cambios propios.

Proof: login→rol Admin→Configuración→Usuarios; listado desktop/mobile, agregar,
editar, desactivar/cancelar, error/reintento y denegación. No proveedor externo
real: cuentas y patios de fixture explícitos, nunca producto demo en producción.
