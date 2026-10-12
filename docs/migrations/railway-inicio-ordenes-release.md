# Railway — release de Inicio y Órdenes

Autorización del usuario: aplicar las vistas aprobadas a main para producción.
La UI requiere prioridad/umbrales de alertas y marca explícita de apertura de
mantenimiento; publicar sólo JSX contra la API anterior no ofrece esas funciones.

## Paso previo de despliegue

`railway.toml` y `api/railway.toml` ejecutan
`node dist/db/run-ui-release-migrations.js` como preDeployCommand. Funciona con
las imágenes productivas sin ts-node. `startCommand` permanece node dist/main.js:
no se migra en cada arranque/reinicio. No cambia la configuración de Vercel/web.

El paso usa la misma conexión configurada que la API, compara el nombre efectivo
de base contra el nombre de esa conexión, exige DB_SYNCHRONIZE=false y
DB_DROP_SCHEMA=false, y bloquea migraciones concurrentes con advisory lock.
No imprime credenciales ni migra CHECK/Auth ni ejecuta seed. Usa los ledgers de
las dos migraciones manuales existentes; redeploys posteriores no las repiten.
Cada migración corre transaccionalmente. Si la segunda falla después de la primera,
la primera queda registrada y el reintento continúa con la pendiente. Un fallo
impide lanzar la nueva API; la versión anterior debe conservarse en Railway.

Cambios: columnas critical_overdue_km/days en andon.umbrales, critical_qty en
inventario.stock, tabla nueva alert_catalog.threshold_change; opened_at/by/actor_name
nullable en public.visitas. Conserva intervalos, mínimos, cantidades, registros,
evidencias y estados. No abre automáticamente órdenes históricas.

## Configuración existente necesaria

- Servicio API conectado al repo/main y que lea railway.toml de raíz o api según
  su Root Directory. No usar el config web para el servicio API.
- DATABASE_URL (o DB_* explícitos) del servicio existente y flags synchronize/drop
  en false. No copiar conexiones/secretos al repo/chat ni habilitar synchronize.
- Schemas/capacidades CHECK/Auth previamente provisionados según su procedimiento.
  Este release no intenta suplir sus gates ni cargar usuarios/patios de prueba.
- Verificar Railway muestra y ejecuta el preDeployCommand de este commit; si una
  configuración del dashboard lo sustituye, aplicar el mismo comando antes de API.

Comandos manuales alternativos en imagen nueva y conexión correcta: establecer
ALERT_MIGRATION_DATABASE y ORDERS_MIGRATION_DATABASE al nombre efectivo exacto,
y ejecutar `node dist/db/run-alert-migrations.js` y
`node dist/db/run-orders-migrations.js` (ambos requieren flags false).

## Verificación y límites

Rehearsal local descartable prueba conservación de datos, doble despliegue
concurrente, repetición sin reaplicar y rechazo de synchronize/drop.
GitHub CI valida unit/E2E/migrations/web. Los checks no acreditan una ejecución
en la base de producción. Tras merge, comprobar deployment efectivo de Railway
(pre-deploy complete + API health) y Vercel, seguido de login real y vistas por rol.
Sin acceso al panel/identidad real no declarar migraciones/login productivos hechos.
Rollback de aplicación conserva las columnas/tablas aditivas; no ejecutar down
para borrar historial de aperturas o cambios de umbrales.
