# Bootstrap inicial — Monterrey / Aldo Vargas

Usuario confirmó: sólo existe el patio Monterrey, Aldo tiene acceso a él y las
demás sucursales todavía no se cubren. No wildcard, grants a futuras sucursales,
asignación de vehículos ni permisos nuevos de mantenimiento.

Esto es configuración preparada; no se ha escrito en Railway. Primero completar
la inspección/migraciones del [procedimiento de release](../migrations/railway-check-auth-release.md).

## Patio real

Consultar después de las migraciones:

```sql
SELECT id, name FROM public.facilities ORDER BY name;
```

Si Monterrey ya existe, conservar su ID y usarlo en facilityScopes. Si no existe
ningún patio, se prepara `monterrey` como identificador técnico estable del patio
real **Monterrey**. Crear únicamente ese registro durante el provisionamiento
autorizado, sin reasignar unidades:

```sql
INSERT INTO public.facilities (id, name, timezone, version)
VALUES ('monterrey', 'Monterrey', 'America/Mexico_City', 1);
```

Sin ON CONFLICT que sobrescriba datos. Si ya hay otro registro/ID o una colisión,
detenerse y revisar el catálogo; no crear duplicados ni renombrar patios. Timezone
es el contrato V1 aprobado para todos los facilities, no una decisión nueva.

## Administrador inicial

En las variables privadas del servicio **API Railway**:

```dotenv
AUTH_ACTOR_STORE=DATABASE
```

`AUTH_OIDC_ACTORS`, como JSON en una sola variable (con ID `monterrey` sólo cuando
el catálogo verificado usa ese ID):

```json
{"auth0|6ac7ef8f2cf3ff248d3e60db":{"displayName":"Aldo Vargas","roles":["ADMIN_DIRECTIVO"],"facilityScopes":["monterrey"]}}
```

Configurar junto a AUTH_MODE=OIDC y issuer/audience/JWKS según la guía Auth0.
No arrancar hasta aplicar la migración Auth y verificar que el patio existe.
Bootstrap sólo importa en un directorio vacío para el issuer. Si el directorio
ya tiene usuarios, este mapping no los modifica; usar el panel con un administrador
existente o preparar recuperación explícita, sin borrar el directorio.

El rol ADMIN_DIRECTIVO mantiene la administración global del directorio existente.
El scope operativo de Aldo es Monterrey. No se concede MECANICO ni capacidad de
firma mecánica por ser administrador. Las firmas históricas conservan atribución.

## Pendiente operativo

Publicación a rama no significa despliegue. Inspeccionar base real, detener
writers, migrar y provisionar Monterrey antes de activar el nuevo backend.
Validar login real de Aldo y panel en Vercel. No hay cambios en Railway realizados
por esta actualización documental.
