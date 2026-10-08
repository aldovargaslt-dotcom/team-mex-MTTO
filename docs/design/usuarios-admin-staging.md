# Configurar el panel de usuarios

Requiere OIDC configurado según [auth-web-staging](auth-web-staging.md), proveedor
compatible y catálogo de patios existente. No se ha desplegado ni creado una
cuenta externa. No guardar contraseñas ni tokens en el directorio de usuarios.

1. Crear/habilitar la cuenta inicial en el proveedor y obtener su `sub` estable
   para el mismo issuer configurado en la API. Si el provider usa subjects
   diferentes para ID/access tokens, ajustar su configuración al contrato OIDC
   existente antes de habilitar login.
2. Con respaldos y revisión de la base destino, ejecutar sólo la migración Auth:
   `cd api`, configurar `DB_SYNCHRONIZE=false`, `DB_DROP_SCHEMA=false`, conexión
   real y `AUTH_MIGRATION_DATABASE` con el nombre exacto de esa base; ejecutar
   `npm run auth:migration:up`. Historial `auth_schema_migrations`, independiente
   de CHECK. No ejecutar sincronización destructiva en staging/producción.
3. Configurar `AUTH_MODE=OIDC`, `AUTH_ACTOR_STORE=DATABASE` y el issuer/audience/JWKS
   de EWO-024. `AUTH_OIDC_ACTORS` contiene el mapping inicial: subject real →
   displayName, roles (incluye `ADMIN_DIRECTIVO` para al menos una cuenta) y
   facilityScopes (IDs de patios existentes). No se asigna `SYSTEM` a personas.
4. Arrancar API. Bootstrap sólo importa si no hay usuarios para ese issuer, bajo
   lock, con auditoría. Si faltan administrador o patios válidos, arranque falla
   y revierte toda la importación. Con directorio ya poblado, el mapping se
   ignora; puede retirarse de la configuración y no restaura usuarios al reiniciar.
5. Iniciar sesión como administrador → Configuración → Usuarios. Agregar la
   cuenta ya creada en el proveedor, nombre, roles y patios; guardar. Vincular el
   subject habilita acceso local, no envía una invitación ni verifica que el
   proveedor haya creado esa cuenta. Crear e invitar desde el proveedor queda
   pendiente de elegir su API de administración.

CONFIG (default) mantiene EWO-024; el panel muestra error controlado si no se
habilita DATABASE. Cambiar a CONFIG restaura esa fuente de permisos: es una
decisión operativa explícita, no un mecanismo de recuperación automático.

En DATABASE los roles/patios/activo se leen en cada solicitud, sin cache:
desactivar bloquea nuevos requests incluso con token vigente. No cancela una
operación ya iniciada ni la sesión global del proveedor; el siguiente 401 limpia
la sesión web. Reactivar permite nuevo login. Un JWT de proveedor aún vigente
puede recuperar autorización si se reactiva su cuenta.

ADMIN_DIRECTIVO gestiona el directorio global. Al menos un administrador activo
debe permanecer; cambios concurrentes usan versión y requieren recargar antes
de reintentar. No se borran usuarios; auditoría guarda antes/después/ejecutor/fecha,
sin tokens, y no altera firmas históricas.

API: GET/POST `/admin/users`, GET `/admin/users/options`, PATCH `/admin/users/:id`
(nombre/roles/patios/activo y versión), GET `/admin/users/:id/audit` (últimos 100).
Todos requieren identidad confiable y ADMIN_DIRECTIVO. Subject es inmutable,
issuer proviene de configuración y no puede elegirse desde el navegador.

Validación staging pendiente: administrador inicial real, otro Admin, mecánico
con patios reales, alta/edición/desactivación, sesión previamente iniciada que
reciba 401, auditoría y acceso denegado de no administrador. CHECK y Mantenimiento
conservan sus políticas: otorgar rol no agrega permisos operativos pendientes.

Fixture local reproducible (Node 24, OpenSSL, PostgreSQL desechable): tras builds
de API/web, desde `web`: `EWO_DISPOSABLE_DB=true DATABASE_URL='' AUTH_PROOF_KEEP=1
node script/verify-users.cjs`. Limpia únicamente el schema Auth y su historial en
`team_mex_mtto_test`; no ejecutarlo mientras corren otros E2E. Puertos3210–3213.
Proveedor sintético HTTPS, API real Auth con PostgreSQL y frontend construido;
vistas vacías de otros dominios sólo facilitan la navegación. SIGTERM limpia
procesos/certificados propios. Nunca acredita proveedor real ni envío de correos.
