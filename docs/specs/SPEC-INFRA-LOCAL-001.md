# SPEC-INFRA-LOCAL-001 — Windows local y CD

Alcance derivado de la solicitud del usuario en este chat: seguir desarrollando
sin Railway, conservar CI/CD y agentes cloud, con Windows y Docker Desktop en
el repo team-mex-MTTO. Implementación de infraestructura de desarrollo, sin
cambio de reglas de dominio ni autenticación de producción.

## Criterios verificables

- AC1: el override local selecciona targets development y configura el proxy
  web hacia api:3001; no requiere Node en Windows.
- AC2: Postgres, API y web publican sólo en 127.0.0.1; Postgres conserva un
  volumen con nombre estable; deploy no borra ni restaura datos.
- AC3: Verify corre en PR y push a main; CD sólo corre tras Verify exitoso de
  push a main en este repo, con activación explícita y runner Windows etiquetado.
- AC4: CD usa el SHA verificado, serializa despliegues, omite revisiones viejas,
  construye antes de reiniciar y espera servicios saludables; errores fallan el job.
- AC5: la guía explica instalación/activación en Windows, pausa, respaldos,
  datos demo locales, límites de synchronize y verificación pendiente en la PC.

No incluye transferir/restaurar Railway, desplegar producción, migraciones
CHECK/Auth, integración OIDC ni auto-merge de PR.
