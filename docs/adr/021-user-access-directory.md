# ADR-021 — Directorio persistente de accesos OIDC

Estado: decisión de implementación del panel autorizado en esta sesión.

Kernel/Auth posee schema `auth`, tablas `users` y `user_audit`. Sin nuevas
clasificaciones de Bounded Context, FKs ni JOINs cruzadas. El catálogo existente
de facilities se lee por FacilityDirectoryPort; Auth no lo escribe.

OIDC verifica identidad; DATABASE resuelve autorización vigente en PostgreSQL por
issuer+subject. CONFIG conserva el contrato previo de EWO-024. Activación explícita
AUTH_ACTOR_STORE=DATABASE; ningún fallback entre ambas fuentes.

Bootstrap transaccional sólo con directorio vacío importa el mapping explícito
AUTH_OIDC_ACTORS y exige ADMIN_DIRECTIVO y patios válidos. El operador configura
la cuenta inicial, no se genera contraseña ni se atribuye una cuenta inexistente.

ADMIN_DIRECTIVO administra globalmente los accesos locales. Escrituras y bootstrap
usan advisory transaction lock compartido; permiso se revalida bajo lock, versión
de registro evita pérdidas de actualización, último administrador no se desactiva
ni pierde el rol. Auditoría antes/después se escribe atómicamente. Cada solicitud
resuelve estado actual, sin caché de roles. No se promete revocar solicitudes ya
en ejecución ni la sesión del proveedor. No cambia firma histórica ni permisos de
negocio. Invitaciones/creación de cuentas externas requieren proveedor elegido.

Migración Auth separada del historial CHECK con synchronize/dropSchema false;
no se ejecuta automáticamente. Riesgos: dependencia DB para autenticar, acceso
administrativo global y datos personales en auditoría (sin tokens ni contraseñas).
