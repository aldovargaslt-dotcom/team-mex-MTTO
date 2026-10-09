# OpenID Connect — configuración de staging

Implementación: SPEC-AUTH-001 / EWO-024 / ADR-018. No proveedor ni despliegue
creados en esta sesión. Configurar secretos desde el entorno de cada servicio,
no en el navegador ni archivos versionados. Credenciales de prueba no habilitan producción.

## Requisitos del proveedor

- OpenID Connect discovery sobre HTTPS; Authorization Code + PKCE S256.
- Cliente web confidencial con autenticación `client_secret_post`.
- ID tokens RS256; audience del cliente web. Access tokens JWT RS256 con audience
  propia de la API, distinta del cliente web, y claims `iss`, `sub`, `iat`, `exp`.
- Subject de ID token y access token debe identificar al mismo usuario.
- Issuer exacto (incluida barra final si la hay) y URL JWKS confiable; no roles
  obtenidos del navegador o de claims del token.
- Access token debe caber en una sesión cifrada de cookie: cookie máximo 3800
  caracteres. Tokens muy grandes requieren otro incremento con session store.

## API (Railway u otro backend)

| Variable | Valor requerido |
|---|---|
| `AUTH_MODE` | `OIDC` |
| `AUTH_OIDC_ISSUER` | Issuer exacto del proveedor |
| `AUTH_OIDC_AUDIENCE` | Audience de access token para API |
| `AUTH_OIDC_JWKS_URL` | URL HTTPS JWKS del proveedor |
| `AUTH_OIDC_ACTORS` | JSON de subjects autorizados con nombre, roles y facilityScopes |

Formato del mapping (placeholders, no usuarios/patios reales):

```json
{
  "SUBJECT_DEL_PROVEEDOR": {
    "displayName": "NOMBRE_AUTORIZADO",
    "roles": ["MECANICO"],
    "facilityScopes": ["ID_REAL_DEL_PATIO"]
  }
}
```

EWO-025 añade [panel y directorio persistente](usuarios-admin-staging.md) con
`AUTH_ACTOR_STORE=DATABASE`: importar mapping inicial sólo en directorio vacío y
administrar después desde PostgreSQL, sin reiniciar para cambiar accesos.

En modo CONFIG (default), el mapping es configuración del servidor: no hay
registro público ni grants predeterminados. Cambiar/revocar entradas
requiere reiniciar/desplegar la API; los tokens dejan de autorizar cuando el nuevo
mapping se carga. No se reescriben firmas históricas. Revocación en el proveedor
no es instantánea: tokens JWT siguen vigentes hasta vencer, salvo revocación del
mapping local. No se agregan permisos de mantenimiento al rol por autenticarse.

## Web (Vercel, Root Directory `web`)

| Variable | Valor requerido |
|---|---|
| `WEB_AUTH_MODE` | `OIDC` |
| `AUTH_APP_ORIGIN` | Origin HTTPS estable del staging, sin path/query |
| `AUTH_OIDC_ISSUER` | Mismo issuer de API |
| `AUTH_OIDC_CLIENT_ID` | Cliente web registrado |
| `AUTH_OIDC_CLIENT_SECRET` | Secreto del cliente web |
| `AUTH_OIDC_AUDIENCE` | Para Auth0: Identifier de la API, igual al audience del backend; opcional para otros proveedores que no lo requieran |
| `AUTH_OIDC_SCOPE` | `openid profile` más scopes necesarios para obtener token API |
| `AUTH_SESSION_SECRET` | 32 bytes aleatorios codificados base64 |
| `API_URL` | URL HTTPS explícita de API staging |

Registrar callback exacto: `AUTH_APP_ORIGIN/api/auth/callback`. El origin debe
corresponder al host usado por el navegador; usar dominio staging estable en vez
de previews cambiantes. Rotar AUTH_SESSION_SECRET invalida sesiones existentes.
No usar variables `NEXT_PUBLIC_*` para secretos. No existe fallback a API producción.

Proveedor temporal elegido: [Auth0 y configuración concreta](auth0-staging.md).

Rutas implementadas: GET `/api/auth/login`, GET `/api/auth/callback`,
GET `/api/auth/session`, POST `/api/auth/logout`, proxy `/backend/*`;
API GET `/auth/me` exige identidad confiable. La web envía cookie same-origin,
el proxy agrega Bearer del lado servidor. Las escrituras exigen Origin exacto.
La sesión vence como máximo a la hora o al vencer el token; no refresh automático.
Cerrar sesión termina la sesión local; no cierra sesión global del proveedor ni
revoca un token ya emitido. Cookies HttpOnly/Secure/SameSite=Lax, sin caché privada.

El picker de prueba sólo aparece con servidor Next en `development` sin OIDC.
Una imagen Docker construida para producción también requiere configurar OIDC;
no obtiene acceso de prueba por ejecutarse en una computadora local.

## Validación antes de habilitar

1. Login de una persona provisionada: subject/nombre del servidor y solo roles otorgados.
2. Usuario no provisionado, sin patios o token falso/vencido: denegación.
3. Alterar localStorage/X-Role/X-User-Id no concede privilegios.
4. CHECK dentro/fuera de patio autorizado, fotos y firma con la misma identidad;
   la firma histórica conserva el subject/nombre del servidor.
5. Logout y sesión vencida impiden leer/escribir; cookies y respuestas no cacheadas.
6. Correctivos/preventivos/tickets/formulario de liberación: validar sus permisos
   cuando se implementen los contratos pendientes; no se incluyen en este incremento.

## Recorrido local reproducible

Con dependencias instaladas, compilar API y web. Desde `web`:
`node script/verify-auth.cjs`. Usa puertos locales 3210–3213, HTTPS con una CA
local generada y confiada únicamente en los procesos de prueba, tokens firmados,
adaptador real de API y servidor Next construido. No usa DB ni cuentas reales.
Requiere Node 24 (trust CA de fixture), OpenSSL y puertos disponibles.
`AUTH_PROOF_KEEP=1` mantiene los fixtures para click-through con Chromium;
terminar ese proceso limpia su carpeta temporal. No desactiva validación TLS en
la aplicación. El proveedor sintético acredita el protocolo, no un proveedor real.
