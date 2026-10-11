# Desarrollo local en Windows y CD desde GitHub

Este camino ejecuta API Nest, web Next y Postgres en Docker Desktop. Railway no
es necesario para probar localmente; esta configuración no cambia sus servicios.
Los agentes cloud trabajan sobre GitHub y no necesitan acceso a tu PC.

## Primer arranque

Requisitos: Docker Desktop abierto con Linux containers/WSL2, Compose >= 2.24.4,
Git y [PowerShell 7](https://learn.microsoft.com/powershell/scripting/install/installing-powershell-on-windows)
(`pwsh`, distinto de Windows PowerShell 5.1).

```powershell
git clone https://github.com/aldovargaslt-dotcom/team-mex-MTTO.git
cd team-mex-MTTO
pwsh -File .\script\deploy-local.ps1
```

Si ya tienes el repo, usa esa carpeta. No ejecutes otro stack con los mismos
puertos/nombres a la vez. Si usabas el Compose anterior, detenlo primero con
`docker compose --profile app down` desde su carpeta, sin `-v`.

Abre http://localhost:3000. API: http://localhost:3001/health;
Swagger: http://localhost:3001/docs. La primera compilación puede tardar.
Desde PowerShell puedes comprobar la API:

```powershell
Invoke-RestMethod http://localhost:3001/health
```

Se construyen imágenes de desarrollo y se comprueba la salud de Postgres, API y
web. El código se copia a las imágenes: si editas código local, vuelve a ejecutar
el script para incorporarlo. No hay montaje de código desde Windows.
No necesitas instalar Node en el host.

## Activar actualización automática

1. Integra estos archivos en la rama `main` del repo mediante un PR.
2. En GitHub: **Settings → Actions → Runners → New self-hosted runner**,
   selecciona **Windows / x64**. Descarga y configura el runner siguiendo los
   comandos que GitHub muestra; el token de registro no se guarda en el repo.
3. Durante la configuración agrega la etiqueta **`team-mex-local`**.
   Instálalo en una carpeta separada de tu checkout de trabajo, por ejemplo
   `C:\actions-runner-team-mex`. Su checkout es independiente; no sobrescribe
   los cambios sin commit de tu carpeta de desarrollo.
4. Para Docker Desktop, ejecuta **`.\run.cmd`** como tu usuario de Windows,
   desde una terminal, con sesión iniciada y Docker Desktop abierto. No lo
   instales como servicio de Windows: la cuenta del servicio puede carecer de
   acceso al motor de Docker Desktop. Comprueba que `docker info` y `pwsh`
   funcionan desde esa terminal. Reinicia el runner si instalaste PowerShell
   después de abrirla, para que reciba el PATH actualizado.
5. Protege `main`: exige revisión de PR y los checks **api test + e2e** y
   **web lint + build**. El CD ejecuta código de `main` en tu PC; autoriza sólo
   código confiable. No asignes este runner a tests de PR ni a forks. Si el
   repositorio es público o acepta colaboradores no confiables, usa una máquina
   dedicada para el runner en lugar de tu PC personal.
6. En **Settings → Secrets and variables → Actions → Variables**, agrega la
   variable de repositorio **`LOCAL_DEPLOY_ENABLED` = `true`**. Es una variable,
   no un secret. Actívala después del primer arranque local exitoso.
7. El próximo push/merge a `main` ejecuta **Verify** en GitHub. Si ambos jobs
   pasan, **Deploy local Windows** despliega el mismo SHA verificado en tu PC.

El runner hace conexiones salientes a GitHub. No hay que abrir puertos de router
ni publicar Docker. La PC debe estar encendida, conectada, con Docker Desktop y
el runner activos. Si no, el job quedará esperando y puede expirar. GitHub y los
agentes conservan los límites/costos de sus respectivos planes.

Verify también sigue ejecutándose en PR. El CD sólo acepta el evento de push a
`main` del mismo repo, con CI exitoso y la variable activada. Las actualizaciones
se serializan y las revisiones anteriores se omiten cuando `main` ya avanzó.
Si el build falla, no se reinician los contenedores anteriores. Si falla el
arranque, el job falla; no hay rollback automático de imágenes ni de la base.

## Datos y autenticación local

Postgres mantiene el volumen **`team-mex-mtto_team_mex_pgdata`**, independiente
del checkout temporal del runner. El script usa siempre el mismo nombre de
proyecto. No ejecuta `down -v`, prune, restore ni migraciones CHECK/Auth.

Este camino usa los defaults existentes de desarrollo: acceso de prueba por
rol, `DB_SYNCHRONIZE=true`, `DB_DROP_SCHEMA=false`, Andon `noop`. No acredita
identidad confiable para CHECK ni valida la integración OIDC de producción.
La sincronización de TypeORM puede modificar el esquema cuando cambien las
entidades: usa una base de desarrollo, con respaldo si sus datos importan.
No conectes esta configuración a Postgres de Railway ni restaures una base de
producción para sincronizarla automáticamente. Por defecto comienza con la
base demo local; no descarga datos de Railway.

Para respaldar la base local sin corromper datos binarios por redirección de
Windows PowerShell:

```powershell
docker exec team-mex-mtto-db pg_dump -U team_mex -d team_mex_mtto -Fc -f /tmp/local-backup.dump
docker cp team-mex-mtto-db:/tmp/local-backup.dump .\local-backup.dump
```

Verifica el éxito de ambos comandos. Guarda el respaldo fuera del repo; no lo
subas a GitHub. Exportar/importar los datos de Railway es una tarea aparte.

## Pausar y diagnosticar

Para pausar CD, cambia `LOCAL_DEPLOY_ENABLED` a `false` y cancela los jobs ya
pendientes: un job encolado pudo evaluar la variable antes del cambio.
Luego, desde la raíz del repo:

```powershell
docker compose -p team-mex-mtto -f docker-compose.yml -f compose.local.yml --profile app logs --tail 100 api web
docker compose -p team-mex-mtto -f docker-compose.yml -f compose.local.yml --profile app down
```

`down` conserva el volumen; evita `down -v`. Para actualizar manualmente:
`git pull --ff-only`, luego `pwsh -File .\script\deploy-local.ps1`.
Para volver a una revisión, pausa CD, respalda los datos y ejecuta el script en
un checkout del commit deseado. Volver al código anterior no revierte el esquema.

Retira Railway sólo después de validar el stack local y respaldar los datos
que quieras conservar. Desactivar este CD no desactiva los despliegues de Railway.
