# UX — Editor de foto de unidad v0

Complementa [SPEC-UNIT-PHOTO-CROP-001](../specs/unit-photo-crop-v0.md) y [ADR-014](../adr/014-foto-unidad.md).

## Screen purpose

Admin confirma qué recorte de la unidad se guardará como foto principal.

## Primary user

`ADMIN_DIRECTIVO`; desktop y mobile, con prioridad de interacción mobile al capturar.

## Questions the screen must answer

- ¿Qué estoy viendo? La foto de unidad que se está editando.
- ¿Debo actuar? Ajustar encuadre, cancelar o confirmar.
- ¿Cuál es el estado ahora? El marco 4:3 es el resultado que quedará guardado.
- ¿Qué apoyo hay? Instrucción breve de arrastre y zoom.

## Primary action

`Usar foto` (`Button` default).

## Secondary actions

- `Cancelar` (`secondary`).
- `Restablecer` (`outline` o quiet).

## Information hierarchy

- P0: previsualización 4:3 con overlay exterior y límite visible.
- P1: `Usar foto`.
- P2: slider etiquetado `Zoom` y `Restablecer`.
- P3: texto “Lo que está dentro del marco se guardará.”

No exponer calidad, codec, dimensiones ni peso.

## Pattern

Dialog existente (`web/src/components/ui/dialog.tsx`) sobre el formulario largo de unidad. En móvil ocupar ancho disponible, mantener el recorte visible y acciones alcanzables; evitar navegación a otra ruta.

## States

- loading: “Preparando foto…” mientras se decodifica.
- error: “No se pudo abrir esta foto. Elige otra imagen.”
- normal: editor listo; zoom inicia en el mínimo que cubre el marco.
- warning: errores de lectura o exportación en `FormAlert` del diálogo.

## Interaction notes

- Abrir con `Agregar foto` / `Tomar o subir`; input conserva `accept="image/*"` y `capture="environment"` como sugerencia de cámara trasera.
- Arrastre de mouse/un dedo y pinch de dos dedos ajustan posición/zoom sin permitir huecos dentro del marco.
- Slider controla zoom; rueda de mouse puede ajustarlo cuando el puntero está sobre la imagen.
- `Restablecer` regresa al encuadre inicial.
- `Cancelar` y Escape descartan el archivo temporal. `Usar foto` produce la imagen y la asigna al formulario.
- La imagen existente se ve en su presentación 4:3 y la acción `Quitar foto` se mantiene en el formulario.

## Mobile / responsive

- Desktop 1440: diálogo centrado, editor amplio sin desbordar el viewport.
- 390: marco 4:3 ocupa el ancho disponible; controles y botones con altura/hit mínimo de 44 px; acciones visibles sin scroll horizontal.

## Fuera / Don’t

- No editar fotos de visita ni cambiar la ficha/catálogo, contrato de API, almacenamiento o schema.
- No agregar opciones técnicas de codificación ni controles de rotación.
- No permitir guardar mientras el editor esté preparando/exportando.

## Proof

- `unidad_foto_editor_d1440.png`
- `unidad_foto_editor_m390.png`
- Click-through desde el role picker → Unidades → Editar → Tomar o subir → ajustar → cancelar y confirmar.

