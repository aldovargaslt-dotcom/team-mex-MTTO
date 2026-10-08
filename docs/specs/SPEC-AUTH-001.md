# SPEC-AUTH-001 — Autenticación web OpenID Connect

Autorización: usuario «necesitamos implementar la autenticacion web» y respuesta
«No tenemos proveedor; preparar integración OpenID Connect». Implementa ADR-018;
el proveedor y sus credenciales son inputs de despliegue pendientes.

## Criterios de aceptación

- AUTH-01: login Authorization Code + PKCE S256, state y nonce; validar issuer,
  audience, firma RS256 y vigencia del ID token, y `at_hash` cuando esté presente.
  No aceptar callback no solicitado.
  Auth0 requiere enviar `audience` configurado en servidor para solicitar el
  access token de la API; no inferir el Identifier ni permitir elegirlo al navegador.
- AUTH-02: access token JWT validado por API con issuer/audience/JWKS configurados.
  Subject estable; nombre, roles y patios de un registro autorizado del servidor.
  Token inválido, usuario no provisionado o sin scope: denegar, sin fallback a headers.
- AUTH-03: sesión web cifrada, HttpOnly, SameSite=Lax, Secure en producción,
  duración acotada por access token (máximo una hora), sin tokens en localStorage.
  No refresh tokens en este incremento; al vencer se requiere iniciar sesión.
- AUTH-04: proxy same-origin agrega credencial en servidor, elimina identidad
  aportada por cliente, preserva respuestas/archivos privados y no cachea datos.
  Operaciones con sesión por cookie exigen Origin autorizado para prevenir CSRF.
- AUTH-05: UI obtiene identidad del servidor; selector solo para roles otorgados.
  Cerrar sesión elimina cookies, volver a una pantalla exige identidad nuevamente.
- AUTH-06: proveedor/API no configurados o indisponibles se muestran como error;
  producción nunca presenta picker de roles sin autenticación.
- AUTH-07: stub legacy conserva funcionamiento únicamente en desarrollo local;
  activar OIDC exige identidad confiable en todos los endpoints protegidos de API.

No cambia permisos de dominio, estados CHECK, mantenimiento ni esquemas de DB.
No incluye administración de cuentas, recuperación de contraseña, refresh,
revocación central de sesiones ni logout global del proveedor. El proveedor debe
emitir access tokens JWT RS256 para la audiencia de API y soportar PKCE.
