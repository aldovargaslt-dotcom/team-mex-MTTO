# UX — Autenticación web V1

Autorización de sesión / SPEC-AUTH-001; ADR-003 y ADR-018.
Reusar la superficie home/home-card de `/`, shell y Button actuales.

- Inicio sin sesión: título «Operación de unidades», explicación corta y un CTA
  «Iniciar sesión». El proveedor recoge credenciales; no formulario de contraseñas local.
- Loading: «Verificando sesión…». Error: mensaje accesible y reintento sin IDs,
  credenciales ni detalle técnico. Configuración ausente no simula login exitoso.
- Con sesión: nombre del servidor y botones únicamente para roles autorizados;
  uno primario, restantes secundarios. Mecánico → `/mi-trabajo`, Logística →
  `/flota`, otros → `/inicio`, conservando destinos existentes.
- Shell: «Cerrar sesión» sustituye cambio libre de rol; volver al inicio permite
  escoger otro rol ya otorgado. «Elegir rol» aparece sólo para cuentas con varios
  roles del servidor y lleva a `/` sin terminar la sesión, en desktop y menú móvil.
  Fallo de logout debe impedir una falsa confirmación.
- Desarrollo local mantiene picker anterior con leyenda de acceso de prueba.
- Revisar d1440 y m390: login, sesión, error, expiración/logout y menú móvil.
  Proof con proveedor sintético no acredita integración productiva.
