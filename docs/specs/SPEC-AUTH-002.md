# SPEC-AUTH-002 — Administración de usuarios

Autorizado por el usuario en esta sesión: administrador inicial y panel para
agregar usuarios y asignar accesos. Extiende SPEC-AUTH-001; no amplía permisos de
Mantenimiento, CHECK, Flota ni Inventario.

- USR-01: sólo identidad confiable con ADMIN_DIRECTIVO administra usuarios.
  Headers, roles del navegador y claims del proveedor no otorgan permisos.
- USR-02: acceso local persistente por issuer+subject OIDC, nombre, roles existentes
  y patios existentes. Agregar, editar, activar/desactivar; subject inmutable.
  No contraseñas locales ni alta/invitación del proveedor hasta elegirlo.
- USR-03: modo DATABASE explícito sustituye el mapping en memoria. Cada solicitud
  consulta el acceso vigente; desactivación o cambio de rol afecta solicitudes
  siguientes incluso con JWT vigente. No fallback a configuración ni headers.
- USR-04: bootstrap importa AUTH_OIDC_ACTORS sólo en directorio vacío, bajo lock,
  requiere un administrador y patios válidos. No restaura accesos al reiniciar.
- USR-05: conservar al menos un administrador activo; serializar mutaciones y
  volver a comprobar permiso del ejecutor dentro de la transacción. Versión
  obligatoria en edición evita sobrescribir cambios concurrentes.
- USR-06: altas y cambios guardan auditoría actor/antes/después/fecha en la misma
  transacción. No eliminación de usuarios ni reescritura de firmas históricas.
- USR-07: panel listado→formulario, búsqueda y estado; error/reintento, sin datos
  anteriores tras falla, sin falsa confirmación. Sólo roles asignables actuales,
  patios del catálogo; sin SYSTEM. ADMIN_DIRECTIVO gestiona el directorio global
  de accesos, sin obtener permisos nuevos sobre operaciones de otros dominios.
- USR-08: CONFIG sigue funcionando para preservar EWO-024; panel responde error
  controlado si no se habilita DATABASE. Migración Auth independiente de CHECK,
  sin ejecución automática en despliegues ni datos/usuarios ficticios.

Input de despliegue pendiente: proveedor OIDC, subjects reales, patios existentes,
administrador inicial y configuración staging. Invitaciones por correo necesitan
la API del proveedor y no se simulan como enviadas.
