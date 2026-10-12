# ADR024 — Guard de schema antes de inicializar la API

Estado: aceptado para reparar el release de Inicio/Órdenes autorizado por el usuario.

El log productivo suministrado por el usuario demuestra SQLSTATE42703:
AndonService.seedUmbrales consulta critical_overdue_km ausente durante bootstrap.
El preDeployCommand del repositorio no aseguró las migraciones en esa base. No
se acredita el motivo del override/config de Railway; la incompatibilidad de
schema y código sí está confirmada. Un reintento idéntico no la resuelve.

La API production ejecuta prepareUiRelease antes de NestFactory.create. Usa sólo
las dos migraciones aditivas ya autorizadas del release; ledger, advisory lock,
conexión verificada y synchronize/drop=false permanecen. Si ya están registradas,
no vuelve a aplicarlas; si falta alguna, la aplica antes de consultar sus columnas.
Error aborta el arranque con exit1. Desarrollo/test no ejecuta este guard automático.

Excepción acotada a la instrucción anterior de DEPLOY/EWO037 que evitaba toda
migración en startup. Queda reemplazada por este guard production específico,
para que el release funcione incluso si Railway no ejecuta pre-deploy. No es un
migrador general: no CHECK/Auth, seed, down, sincronización ni borrado. Pre-deploy
sigue como fase preferida; el guard sólo completa pendientes de estos dos ledgers.
Sin cambio de ownership, lifecycle o tipos de alerta. Reparación necesaria dentro
de la autorización de publicar/recuperar producción de esta misma sesión.

Regresión: schema legacy reproduce42703; guardproduction lo migra; reentrada y
concurrencia no repitenDDL; Nest inicializa con synchronize/drop=false y columnas
presentes. Conservación de datos y rechazo de flags inseguros se verifican en
ui-release-migrations.e2e-spec.ts. El archivo de logs original no se publica.
