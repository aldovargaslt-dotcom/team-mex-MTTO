# SPEC-UNIT-PHOTO-CROP-001 — Previsualización y ajuste de foto de unidad

## Objetivo

Permitir que Admin tome o seleccione una fotografía, ajuste el encuadre y confirme el resultado antes de guardar la foto principal de la unidad. El procesamiento ocurre en el navegador y conserva el contrato vigente `fotoDataUrl` / `foto_data_url` de ADR-014.

## Alcance

- Solo la foto principal de unidad editada desde `UnidadForm`.
- Crop fijo 4:3, movimiento, zoom dentro y fuera, recentrado y restablecimiento.
- Salida optimizada a WebP cuando canvas lo soporte, con JPEG de respaldo, máximo 1600×1200 y objetivo de peso menor a 1 MB.
- El API conserva validación de contenido y límite de seguridad independiente.

Fuera: fotos de visitas/órdenes, almacenamiento de objetos, cambios de endpoint/schema/contrato, galería o historial, rotación manual y edición posterior de fotos ya guardadas.

## Decisiones de procesamiento

- Canvas del navegador decodifica la orientación EXIF antes del crop; la salida no conserva metadatos EXIF.
- El rectángulo visible del editor determina directamente los píxeles exportados; la previsualización y el archivo confirmado comparten el mismo encuadre 4:3.
- Exportar a 1600×1200 como máximo. Preferir `image/webp`; usar `image/jpeg` si WebP no está disponible. Ajustar calidad y, si hace falta, reducir dimensiones para mantener el archivo resultante por debajo del objetivo de 1 MB.
- Enviar la salida como Data URL mediante el contrato actual. Los topes API, DTO y parser permanecen como defensa independiente.

## Criterios de aceptación

- **AC-01** En smartphone, `Agregar foto` puede abrir la cámara trasera sugerida; el usuario también puede elegir una imagen existente.
- **AC-02** Al seleccionar una imagen, se abre el editor con una previsualización y un marco fijo 4:3; el exterior del marco queda visualmente atenuado.
- **AC-03** Arrastrar con mouse o un dedo desplaza la imagen, con límites que impiden áreas vacías dentro del marco.
- **AC-04** Slider permite acercar y alejar sin descubrir áreas vacías. En dispositivos táctiles, pellizcar con dos dedos cambia el zoom.
- **AC-05** `Restablecer` vuelve al encuadre inicial que cubre el marco y centra la imagen.
- **AC-06** `Cancelar` cierra el editor sin sustituir la foto del formulario. `Usar foto` aplica la selección y permite continuar con el guardado normal.
- **AC-07** El archivo guardado conserva la proporción del marco y coincide con el encuadre confirmado, sin deformación.
- **AC-08** La orientación de fotos con metadatos EXIF se corrige antes de previsualizar/exportar.
- **AC-09** El archivo se redimensiona y comprime en el cliente; WebP es preferido, JPEG es fallback y el objetivo es <1 MB.
- **AC-10** La foto procesada continúa guardándose y mostrándose por el contrato de ADR-014, sin cambios de schema ni endpoint.
- **AC-11** Los límites existentes del backend siguen rechazando payloads fuera del límite o que no sean imágenes.
- **AC-12** Una foto de smartphone de alta resolución normalmente puede confirmarse sin error de tamaño.
- **AC-13** Editor y controles funcionan con teclado, exponen nombres accesibles y tienen targets táctiles de al menos 44 px en móvil.

## Compatibilidad y validación

- Contrato persistido actual: `unidades.foto_data_url` nullable; creación/edición via POST/PATCH `/unidades`; lecturas de unidad y Logística consumen el mismo Data URL.
- Validación actual del DTO: `@MaxLength(1_500_000)`; parser JSON: `10mb`; conservarlos salvo evidencia de que el archivo optimizado permitido no cabe en el límite de seguridad.
- Verificar build/lint web, pruebas focales de editor/procesamiento disponibles en el repo y API build/tests focales si se toca API. Completar proof UI con interacción real, d1440 y m390.

