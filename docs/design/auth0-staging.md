# Auth0 temporal — sesión en Next.js

Decisión del usuario (2026-10-08): conservar la sesión privada en el servidor
Next.js. No usar Auth0Provider/useAuth0 ni crear `src/main.jsx`: este frontend
es Next.js y ya tiene login OIDC con PKCE, callback y proxy privado. El proveedor
puede reemplazarse después sin mover roles/patios fuera del directorio local.

## Aplicación Auth0

En Applications → Settings de la aplicación indicada por el usuario:

- Application Type: **Regular Web Application** (la guía compartida era SPA).
- Client ID proporcionado: `5PydPwDikNwaZOOBv0yEW7A1fO9N2Vni`.
  Si se crea otra aplicación en vez de cambiar el tipo, usar su nuevo Client ID.
- Advanced Settings → OAuth: Token Endpoint Authentication Method **POST**
  (`client_secret_post`), ID Token Signature Algorithm **RS256**.
- Advanced Settings → Grant Types: **Authorization Code** habilitado.
- Allowed Callback URLs: origin real + `/api/auth/callback`.
  Desarrollo con OIDC: `http://localhost:3000/api/auth/callback` si Next usa 3000.
  Staging: registrar el dominio HTTPS estable elegido, no un placeholder.
- Guardar Client Secret sólo en el entorno del servidor web. No enviarlo al chat
  ni guardarlo en Git; no usar `NEXT_PUBLIC_*`.

El logout implementado termina la sesión local. No requiere Allowed Logout URLs
porque aún no redirige al logout global de Auth0. Tampoco requiere Allowed Web
Origins para un SDK SPA: el intercambio de tokens ocurre en el servidor.

## API Auth0

En Applications → APIs, crear o seleccionar la API de Team Mex:

1. **Identifier** compartido por el usuario en la guía posterior:
   `https://api.team-mex-mtto`. No se deduce del Client ID ni del host de la API.
   El Identifier `https://dev-u65j6nt6tw8w5fc4.us.auth0.com/api/v2/` compartido
   después corresponde a **Auth0 Management API**, no a Team Mex. No usarlo
   para autorizar nuestros endpoints; crear una API propia con RS256.
2. Signing Algorithm **RS256**. Configurar el mismo Identifier en
   `AUTH_OIDC_AUDIENCE` de web y API. La web lo envía en `/authorize`.
3. Conservar tokens compactos: los roles y patios se resuelven en nuestra API,
   sin añadir esos grants al token. No solicitar `offline_access` en este flujo.

## Variables del servidor

Valores públicos confirmados por discovery del tenant:

```dotenv
AUTH_OIDC_ISSUER=https://dev-u65j6nt6tw8w5fc4.us.auth0.com/
AUTH_OIDC_JWKS_URL=https://dev-u65j6nt6tw8w5fc4.us.auth0.com/.well-known/jwks.json
AUTH_OIDC_AUDIENCE=https://api.team-mex-mtto
```

API: `AUTH_MODE=OIDC`, issuer/audience/JWKS anteriores y
`AUTH_ACTOR_STORE=DATABASE`. Aplicar la migración y provisionar al administrador
con subject y patios reales siguiendo [usuarios-admin-staging](usuarios-admin-staging.md).

Web: `WEB_AUTH_MODE=OIDC`, mismo issuer y audience, Client ID anterior si se
conserva, `AUTH_OIDC_CLIENT_SECRET`, `AUTH_OIDC_SCOPE=openid profile`,
`AUTH_APP_ORIGIN`, `API_URL` y `AUTH_SESSION_SECRET` (32 bytes aleatorios base64).
JWKS_URL se configura sólo en API; web lo descubre del issuer. La barra final
del issuer es necesaria para coincidir exactamente con los tokens de Auth0.

Crear la cuenta inicial en User Management → Users de Auth0 y copiar su User ID
(`sub`) al bootstrap local autorizado. Registrar una cuenta en Auth0 no concede
roles ni patios. El panel local vincula cuentas existentes; no crea cuentas en
Auth0 ni envía invitaciones. Crear/invitar mediante Management API queda pendiente.

## Estado y validación

Discovery público verificado: issuer exacto, JWKS, S256, RS256 y
`client_secret_post` soportados por el tenant. Esto no demuestra la configuración
de la aplicación individual ni un login real.

El usuario confirmó la aplicación confidencial y variables de Vercel; sus valores
privados y despliegue efectivo siguen sin verificarse. Patio y administrador
iniciales definidos en [Monterrey/Aldo](monterrey-admin-bootstrap.md).
Falta inspeccionar/migrar la base real, provisionar ese catálogo/directorio y
validar los despliegues/configuración efectivos antes del login real.
Ejecutar la checklist de [auth-web-staging](auth-web-staging.md) y la del panel.
No se modificó el dashboard ni se desplegó en esta ejecución.

Referencias oficiales: [Authorization Code](https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow/add-login-auth-code-flow),
[clientes públicos y confidenciales](https://auth0.com/docs/get-started/applications/confidential-and-public-applications).
