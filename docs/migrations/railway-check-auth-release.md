# Railway — actualizar CHECK y Auth sin synchronize

## Diagnóstico observado

Logs del despliegue fallido de `531e37a` (2026-10-03): PostgreSQL 23502 en
`ALTER TABLE visitas ADD work_order_type character varying NOT NULL`, ejecutado
por RdbmsSchemaBuilder. La aplicación no terminó el arranque; el healthcheck
falló. Railway conserva activo el despliegue anterior de Logística. La tabla
`public.facilities` no aparece en la captura enviada de la base.

Usuario autorizó preparar/ensayar sin respaldo, no ejecutar contra Railway.
Una transacción revierte el trabajo de este runner ante un fallo; **no sustituye
un respaldo** ni protege contra daño externo, fallos posteriores o errores de
operación. No existe evidencia de backup/restore ni ensayo con copia real.

## Artefacto disponible

`api/src/db/run-controlled-check-migrations.ts`, compilado como
`dist/db/run-controlled-check-migrations.js`. Scripts de npm funcionan en la
imagen productiva (sin ts-node). DataSource aislado: sin Nest, seed, synchronize
ni dropSchema. Reutiliza las 13 migraciones CHECK aprobadas. El runner descartable
`migration:up/down` conserva sus restricciones.

El runner acepta sólo legacy sin expansión/historial o las 13 migraciones
completas. Schema parcial, historial desconocido, datos ambiguos o constraints
inválidos requieren investigación, no reparación automática. Inspección no
crea historial. Apply bloquea tablas históricas, toma lock de migrador y verifica
conteos/checksums de columnas originales de visitas/hijos/unidades/choferes/tipos
y outbox antes del commit. No imprime blobs, hashes de contenido ni credenciales.
Lock timeout 5s, statement timeout 120s: adaptar sólo después de ensayo con
volumen real. La ventana de mantenimiento no tiene duración prometida.

## Preparar release (sin escribir en la base real)

1. Reunir los cambios EWO-023–027 en un artefacto versionado. El usuario autorizó
   commit y push a `codex/auth0-users-railway-ready`; PR, merge y despliegue siguen
   pendientes. Publicar una rama no instala el paquete en Railway/Vercel.
2. Confirmar base efectiva y servicio correctos, PostgreSQL y credenciales de
   migración. Nunca copiar DATABASE_URL/contraseña a evidencia o chat.
3. Compilar `cd api && npm run build`. Usar esa imagen/artefacto en un entorno
   controlado con conexión real y herramientas Node. No reemplazar temporalmente
   el start command de la API viva por el migrador ni arrancar Nest antes de
   preparar la base. El modo de ejecutar un job único en Railway debe verificarse
   con sus opciones disponibles; esta sesión no instaló Railway CLI ni accedió
   a sus credenciales.
4. Para inspección, en **el proceso aislado**, configurar:

   ```dotenv
   DB_SYNCHRONIZE=false
   DB_DROP_SCHEMA=false
   CHECK_MIGRATION_DATABASE=NOMBRE_EXACTO_DE_LA_BASE
   ```

   Conexión DB configurada privadamente. Ejecutar `npm run check:migration:inspect`.
   Salida: nombre efectivo, LEGACY/COMPLETE, migraciones pendientes y counts por
   tabla. Si falla, detener release y preparar corrección revisable. No habilitar
   una base real como `_test` ni establecer EWO_DISPOSABLE_DB para eludir gates.

## Aplicación real — pendiente

Requiere artefacto publicado, ejecución operativa definida e inspección real PASS.
No se autoriza ni se realiza desde esta documentación.

1. Pausar **todos** los writers, API antigua, réplicas, jobs/schedulers y seed.
   Comprobar que no se reinician ni vuelven a instalar índices legacy. La variable
   de drain es una declaración del operador: el runner no puede demostrar que
   una aplicación apagada no volverá a arrancar.
2. En el job aislado, añadir:

   ```dotenv
   CHK_LEGACY_WRITERS_DRAINED=true
   CHECK_MIGRATION_WITHOUT_BACKUP=ACKNOWLEDGED
   ```

   Ejecutar `npm run check:migration:apply`. Sólo continuar si devuelve COMPLETE,
   las migraciones esperadas y preservación PASS. DDL/backfill/historial/validación
   van en una transacción. Una segunda ejecución completa no repite backfill.
3. Si falla, no reanudar una versión antigua hasta comprobar schema efectivo.
   No ejecutar down ni borrar visitas/configuración para forzar rollback. Con
   datos CHECK nuevos, recuperación hacia adelante y writes detenidos.

## Auth y configuración operativa — pendiente

Después de CHECK, aplicar únicamente migración Auth con conexión confirmada,
`AUTH_MIGRATION_DATABASE` exacto y synchronize/drop desactivados. En imagen
productiva: `node dist/db/run-auth-migrations.js` (el script npm histórico usa
ts-node y no sirve en una imagen sin devDependencies).

No arrancar OIDC DATABASE hasta tener patios **reales** en `public.facilities`
y administrador inicial. No fabricar un patio a partir de sitios de Flota, ni
interpretar «todos» como wildcard. Usuario aprobó:

- Subject: `auth0|6ac7ef8f2cf3ff248d3e60db`.
- Nombre: `Aldo Vargas`.
- Rol: `ADMIN_DIRECTIVO`.
- Alcance: todos los patios existentes; IDs reales aún pendientes. La migración
  no crea datos de patios ni asigna vehículos. Si no hay patios, solicitar sus
  nombres/IDs y provisionamiento explícito antes del bootstrap.

Configurar Auth0 conforme a [auth0-staging](../design/auth0-staging.md) y directorio
conforme a [usuarios-admin-staging](../design/usuarios-admin-staging.md).
URLs públicas proporcionadas:

- Web: `https://team-mex-mtto-eight.vercel.app`.
- API: `https://team-mex-mtto-production-e7a6.up.railway.app`.
  Otra captura muestra un dominio sin sufijo; comprobar en Networking cuál
  pertenece al servicio/base efectivos antes de usarlo como API_URL.

Producción ahora desactiva synchronize por defecto y rechaza overrides que
activen synchronize/dropSchema. Configurarlos explícitamente en Railway. OIDC,
storage privado/config CHECK/documentos/PSI siguen sus gates; migrar el schema
no inventa ni habilita esas capacidades.

## Validación post-release pendiente

- `/health` exitoso; logs sin schema sync y versión nueva realmente activa.
- Conteos/históricos/firmas/fotos/outbox intactos y contrato mantenimiento legacy.
- Login Auth0 de Aldo, identidad verificada y acceso a panel; desconocidos denegados.
- Alta/desactivación de otro usuario, expiración/logout y CSRF según EWO-024/025.
- CHECK ABC y Mantenimiento continúan separados. No declarar operaciones de
  correctivos/preventivos/tickets habilitadas por conceder un rol.
