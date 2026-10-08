# Deploy — Vercel web + Railway API/Postgres

Topología: Next.js en Vercel; NestJS y PostgreSQL en Railway. Producción requiere
OIDC con sesión privada en Next.js y JWT verificado por API. El selector/header
legacy sólo es desarrollo local; no habilitarlo como solución de despliegue.
Andon notify conserva `noop` y el dual-stack existente.

## Antes de desplegar

La base contiene visitas históricas. No arrancar el código nuevo usando
synchronize. Seguir [Railway CHECK/Auth](docs/migrations/railway-check-auth-release.md):
inspección real de sólo lectura, writers pausados, migraciones y provisionamiento
antes del nuevo arranque. La preparación local no acredita el estado de la base real.
Sin backup no hay recuperación desde copia; el usuario autorizó preparar el
release sin respaldo, no inventar garantías de restore.

[Auth0](docs/design/auth0-staging.md), [directorio de usuarios](docs/design/usuarios-admin-staging.md)
y [Monterrey/Aldo](docs/design/monterrey-admin-bootstrap.md) contienen los inputs y gates.
La autenticación no otorga permisos operativos pendientes ni activa CHECK/storage/scheduler.

## Vercel

1. Proyecto Team Mex, repositorio `aldovargaslt-dotcom/team-mex-MTTO`.
   Root Directory **web**. El `vercel.json` de la raíz falla intencionalmente si
   se intenta desplegar el monorepo desde allí; `web/vercel.json` usa Next.js.
2. Configurar las variables en el entorno que realmente usa el despliegue:
   **Production** para el dominio estable, **Preview** para ramas de revisión.
   `API_URL` es la URL HTTPS verificada de la API y se lee en el servidor.
   No existe fallback hardcoded a una API productiva ni se requiere NEXT_PUBLIC_API_BASE.
3. `AUTH_APP_ORIGIN` debe coincidir con el origin de entrada al login, sin path ni
   slash final. Registrar exactamente ese origin + `/api/auth/callback` en Auth0.
   Una URL Preview y el dominio Production no comparten la cookie de login.
4. Configurar OIDC/client/session según auth-web-staging; client secret y clave
   de sesión sólo en servidor, nunca NEXT_PUBLIC ni Git. Un cambio de variables
   requiere nuevo despliegue para aplicarse.
5. Mantener Deployment Protection según la configuración del proyecto. El login
   de Vercel y Auth0 son distintos: protección de Preview no otorga acceso a la API.
6. Verificar dominio y commit efectivos. Promover/main sólo tras gates de release;
   no inferir que el login completo funciona por ver una pantalla o build verde.

Dominio estable proporcionado: `https://team-mex-mtto-eight.vercel.app`.
Las URLs Preview cambian; revisar callbacks/origin del entorno utilizado.

## Railway

No recrear proyecto ni base. Servicio API `team-mex-MTTO`: Root Directory `api`
con `api/Dockerfile` / `api/railway.toml`, o raíz con Dockerfile/railway.toml de API.
Postgres aporta DATABASE_URL; jamás copiar contraseña/conexión al chat o Git.
El servicio histórico `web` es una alternativa distinta de la web Vercel, no
prueba que ambos usen el mismo artefacto/configuración.

- `HOST=0.0.0.0`; PORT lo inyecta Railway.
- `DB_SYNCHRONIZE=false`, `DB_DROP_SCHEMA=false`.
- AUTH_MODE=OIDC, issuer/audience/JWKS y directorio DATABASE provisionado.
- `ANDON_NOTIFY_PROVIDER=noop`. No unificar fábricas ni habilitar Evolution aquí.
- CORS_ORIGIN conserva los orígenes autorizados; el navegador usa proxy same-origin.
- `/health` verifica arranque, no sustituye prueba de login, migrations ni scopes.

El usuario proporcionó `https://team-mex-mtto-production-e7a6.up.railway.app` y las
capturas muestran también `https://team-mex-mtto-production.up.railway.app`.
Confirmar dominio y conexión del servicio efectivo antes de fijar API_URL.
Railway puede desplegar automáticamente la rama configurada; confirmar Source
antes de actualizar main. No habilitar migración automática recurrente en startup.

Si se usa el servicio web de Railway, respetar su PORT inyectado; no fijar el
dominio a puerto 3000. API_URL y auth origin corresponden al servidor web usado.

## Validación

Orden de release: inspección/migraciones/config de base → API nueva (health e
identidad) → web correspondiente → login real de Aldo → permisos de patio/panel,
logout/expiración y denegación de usuario no provisionado. Ver checklists enlazadas.
No existe evidencia de migración/login real acreditada por este documento.

## Desarrollo local

```bash
docker compose up -d
cd api && cp .env.example .env && npm install && npm run start:dev
```

En otra terminal:

```bash
cd web && npm install && npm run dev
```

LAN completo: `docker compose --profile app up -d --build` (README).
Proveedor sintético y proofs en auth-web-staging no requieren cuentas externas.

La guía histórica de #60 describía main `12f0704`, header X-Role, URLs viejas y
fallback API. Esas instrucciones quedan sustituidas por OIDC y migración
controlada. No se afirma que sus checks históricos validen el release actual.
