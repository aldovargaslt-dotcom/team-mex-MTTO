# E43 — límite tipográfico recuperado al cerrar servidor

Al detener el servidor web local, el registro recuperado mediante `write_stdin` de la sesión de `npm run dev` contiene el aviso:

```text
Failed to download `Roboto` from Google Fonts. Using fallback font instead.
```

El trace apunta a `[next]/internal/font/google/roboto_df779bc8.module.css`, generado desde `web/src/app/layout.tsx`; el recurso solicitado es la hoja de Roboto con pesos 400/500/700 en fonts.googleapis.com. No se modificó la fuente ni la configuración para sortear el fallo.

Los JSON de capturas conservan la familia CSS configurada, pero no prueban por sí solos qué fuente dibujó los glifos. El aviso del servidor confirma la limitación de descarga. No se afirma aprobación de Roboto en esos PNG ni se atribuye al despliegue público. Se mantienen las capturas como evidencia de UI del entorno local y se requiere recaptura visual con el asset disponible. Estado/error, foco, permisos y contraste del color observado conservan sus evidencias; la apariencia tipográfica tiene este límite adicional.
