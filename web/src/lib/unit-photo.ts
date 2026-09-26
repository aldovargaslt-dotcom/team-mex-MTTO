const MAX_OUTPUT_BYTES = 1_000_000;
const MAX_DIMENSION = 1600;

export function loadOrientedImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No se pudo abrir esta foto. Elige otra imagen.'));
    image.src = src;
  });
}

function canvasBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo preparar la foto.'))),
      type,
      quality,
    );
  });
}

function blobDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('No se pudo preparar la foto.'));
    reader.onerror = () => reject(new Error('No se pudo preparar la foto.'));
    reader.readAsDataURL(blob);
  });
}

/** Exports the selected 4:3 source rectangle, normalizing orientation and size. */
export async function exportUnitPhoto(
  image: HTMLImageElement,
  crop: { x: number; y: number; width: number; height: number },
): Promise<string> {
  const canvas = document.createElement('canvas');
  const outputWidths = [MAX_DIMENSION, 1280, 1024];
  const types = ['image/webp', 'image/jpeg'];

  for (const width of outputWidths) {
    const height = Math.round((width * 3) / 4);
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se pudo preparar la foto.');
    context.drawImage(
      image,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      width,
      height,
    );

    for (const type of types) {
      for (const quality of [0.85, 0.8, 0.76, 0.72]) {
        const blob = await canvasBlob(canvas, type, quality);
        if (blob.type !== type) continue;
        if (blob.size <= MAX_OUTPUT_BYTES) return blobDataUrl(blob);
      }
    }
  }

  throw new Error('La foto no se pudo comprimir lo suficiente. Elige otra imagen.');
}
