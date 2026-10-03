import { createHash } from 'crypto';
import { inflateSync } from 'zlib';

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
    .join(',')}}`;
}

export function canonicalHash(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

function paeth(a: number, b: number, c: number) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function crc32(content: Buffer) {
  let crc = 0xffffffff;
  for (const byte of content) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export type VerifiedCanvasPng = {
  content: Buffer;
  width: number;
  height: number;
  sha256: string;
};

/** Decodes the pixels, so an empty/white canvas cannot pass as a signature. */
export function verifyNonblankCanvasPng(
  dataUrl: string,
  expectedWidth: number,
  expectedHeight: number,
  maxBytes: number,
): VerifiedCanvasPng {
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw new Error('SIGNATURE_FORMAT_INVALID');
  if (match[1].length > Math.ceil(maxBytes * 4 / 3) + 8)
    throw new Error('SIGNATURE_TOO_LARGE');
  const content = Buffer.from(match[1], 'base64');
  if (!content.length || content.length > maxBytes)
    throw new Error('SIGNATURE_TOO_LARGE');
  if (!content.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    throw new Error('SIGNATURE_FORMAT_INVALID');

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = -1;
  let interlace = -1;
  const compressed: Buffer[] = [];
  while (offset + 12 <= content.length) {
    const length = content.readUInt32BE(offset);
    const end = offset + 12 + length;
    if (end > content.length) throw new Error('SIGNATURE_FORMAT_INVALID');
    const type = content.toString('ascii', offset + 4, offset + 8);
    const data = content.subarray(offset + 8, offset + 8 + length);
    const expectedCrc = content.readUInt32BE(offset + 8 + length);
    if (crc32(content.subarray(offset + 4, offset + 8 + length)) !== expectedCrc)
      throw new Error('SIGNATURE_FORMAT_INVALID');
    if (type === 'IHDR') {
      if (length !== 13) throw new Error('SIGNATURE_FORMAT_INVALID');
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'IDAT') compressed.push(data);
    else if (type === 'IEND') break;
    offset = end;
  }
  if (
    width !== expectedWidth ||
    height !== expectedHeight ||
    bitDepth !== 8 ||
    ![2, 6].includes(colorType) ||
    interlace !== 0 ||
    !compressed.length
  ) throw new Error('SIGNATURE_DIMENSIONS_INVALID');

  const bytesPerPixel = colorType === 6 ? 4 : 3;
  const stride = width * bytesPerPixel;
  const inflated = inflateSync(Buffer.concat(compressed));
  if (inflated.length !== height * (stride + 1))
    throw new Error('SIGNATURE_FORMAT_INVALID');
  let previous = Buffer.alloc(stride);
  let ink = 0;
  for (let row = 0; row < height; row += 1) {
    const start = row * (stride + 1);
    const filter = inflated[start];
    const raw = inflated.subarray(start + 1, start + 1 + stride);
    const scanline = Buffer.alloc(stride);
    for (let index = 0; index < stride; index += 1) {
      const left = index >= bytesPerPixel ? scanline[index - bytesPerPixel] : 0;
      const up = previous[index] ?? 0;
      const upperLeft = index >= bytesPerPixel ? previous[index - bytesPerPixel] : 0;
      const predictor = filter === 0 ? 0
        : filter === 1 ? left
        : filter === 2 ? up
        : filter === 3 ? Math.floor((left + up) / 2)
        : filter === 4 ? paeth(left, up, upperLeft)
        : -1;
      if (predictor < 0) throw new Error('SIGNATURE_FORMAT_INVALID');
      scanline[index] = (raw[index] + predictor) & 0xff;
    }
    for (let index = 0; index < stride; index += bytesPerPixel) {
      const alpha = bytesPerPixel === 4 ? scanline[index + 3] : 255;
      const luminance = (scanline[index] + scanline[index + 1] + scanline[index + 2]) / 3;
      if (alpha > 16 && luminance < 245) ink += 1;
    }
    previous = scanline;
  }
  if (ink === 0) throw new Error('SIGNATURE_BLANK');
  return {
    content,
    width,
    height,
    sha256: createHash('sha256').update(content).digest('hex'),
  };
}
