# Evidencia reproducible del sprint 1

Resultado canónico, comandos y matriz AC: [EWO-029](../EWO-029.md). [Preparación histórica](../EWO-029-preparacion.md). [Pase experto final](ux-auditor-final.md).

## Lecturas controladas

`reproduce-baseline.mjs`, `reproduce-additional.mjs` y `reproduce-remaining.mjs` registran antes; `verify-states.mjs` registra después; `verify-access-contrast.mjs` complementa teclado, foco, Roboto, contraste y relaciones. `cdp-session.mjs` contiene utilidades CDP. Ejecutar con Node desde raíz, Next development en localhost3000 y Chromium remoto9223 (baseline9222), perfil temporal; sin Playwright. Responses `/backend` sintéticas en memoria, registros PRUEBA; no acreditan DB.

Canónicos: [99 estados PASS](after-states-cdp.json), [23 complementarios PASS](after-access-contrast-cdp.json), [Admin](admin-recapture.json). Los `after-states-attempt*.json` son intentos históricos, no resultado final. Todos los PNG: [carpeta](../../screenshots/mtto-sprint-1/).

## Recorrido persistente propio

`verify-own-journey.mjs` y `resume-own-journey.mjs` usan API local3999 y base nativa nueva dedicada `team_mex_ux_sprint1`. **Sólo ejecutar contra fixtures nuevos propios y una base local descartable**: el recorrido guarda y cierra visitas/consumos/comprobantes. No usar registros existentes ni instancia pública. [own-fixtures.json](own-fixtures.json) contiene IDs de esta ejecución; crear registros nuevos antes de repetir (la visita registrada ya está cerrada). Evidencia/firma/ticket sintéticos.

[Primer tramo](own-journey-cdp.json) conserva el fallo del runner al pulsar antes de habilitación; [continuación](own-journey-resume-cdp.json) completó reanudación/cierre/consulta; [readback](persistence-readback.json) confirma relaciones. No equivalen a pruebas humanas.

Roboto final se sirvió con los archivos originales descargados vía proxy, temporalmente en localhost4020; el CSS/archivos temporales no son modificación del producto. El build y las capturas iniciales tenían limitaciones de descarga documentadas en EWO-029.
