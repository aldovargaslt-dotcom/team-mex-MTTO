# Auth — matriz rol→permisos (EWO-068)

Estado: **preparada, no ejecutada** en ningún entorno compartido. Esta nota no autoriza ejecutarla en producción.

## Qué agrega

Tres tablas aditivas en el schema `auth`: `role_permission_versions`, `role_permissions` y `role_permission_audit`, sembradas con el acceso vigente (EWO-067). Ledger propio: `auth_permission_schema_migrations`. No toca `auth.users`, `auth.user_audit` ni `auth_schema_migrations`.

## Efecto en acceso

Ninguno. La matriz está en **modo sombra**: ningún endpoint ni servicio la consulta para decidir acceso. Editarla vía `PUT /admin/permissions/roles/:rol` solo cambia lo que `GET /admin/permissions` informa (`enforced:false`).

## Orden recomendado

1. Respaldo de la base (esta tarea no demuestra restore).
2. Ejecutar la migración Auth existente si aún no se aplicó (`auth:migration:up`).
3. Ejecutar esta, con base y flags explícitos:

```bash
cd api && npm run build
DB_SYNCHRONIZE=false DB_DROP_SCHEMA=false AUTH_MIGRATION_DATABASE=<nombre_de_la_base> npm run permissions:migration:up
```

`AUTH_MIGRATION_DATABASE` debe coincidir con la base efectiva; si no, el runner aborta.

## Desplegar sin migrar es seguro

Sin las tablas, `GET`/`PUT /admin/permissions` responden 503 (`PERMISSION_MATRIX_UNAVAILABLE`, fallo cerrado) y el resto de la API opera igual; el arranque no depende de ellas (verificado en e2e).

## Requisitos de modo

La edición requiere `AUTH_ACTOR_STORE=DATABASE` y `AUTH_MODE=OIDC`. Con `CONFIG`, `GET` devuelve los valores por defecto (solo lectura) y `PUT` responde 409.

## Reversión

`down` elimina las tres tablas (los datos de la matriz y su auditoría se pierden): `permission-migration-data-source` + `undoLastMigration`. Como nada depende de ellas para decidir acceso, revertir no cambia el acceso.
