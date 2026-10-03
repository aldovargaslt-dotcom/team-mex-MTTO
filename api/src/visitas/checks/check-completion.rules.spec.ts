import { deflateSync } from 'zlib';
import { canonicalHash, canonicalJson, verifyNonblankCanvasPng } from './check-completion.rules';

function chunk(type: string, data: Buffer) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  let crc = 0xffffffff;
  for (const byte of body) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1)
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([length, body, checksum]);
}

function png(width: number, height: number, pixel: [number, number, number, number]) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: width }, () => pixel).flat())]);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  const content = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  return `data:image/png;base64,${content.toString('base64')}`;
}

describe('CHECK completion rules', () => {
  it('serializes object keys canonically before hashing', () => {
    expect(canonicalJson({ z: 1, a: { y: 2, x: 3 } })).toBe('{"a":{"x":3,"y":2},"z":1}');
    expect(canonicalHash({ a: 1, b: 2 })).toBe(canonicalHash({ b: 2, a: 1 }));
  });

  it('accepts a PNG only after finding an opaque non-white pixel', () => {
    const result = verifyNonblankCanvasPng(png(2, 2, [36, 40, 77, 255]), 2, 2, 10_000);
    expect(result).toMatchObject({ width: 2, height: 2, sha256: expect.stringMatching(/^[a-f0-9]{64}$/) });
  });

  it.each([
    ['transparent', png(2, 2, [0, 0, 0, 0]), 'SIGNATURE_BLANK'],
    ['white', png(2, 2, [255, 255, 255, 255]), 'SIGNATURE_BLANK'],
    ['wrong dimensions', png(2, 2, [36, 40, 77, 255]), 'SIGNATURE_DIMENSIONS_INVALID'],
  ])('rejects a %s canvas behaviorally', (_name, dataUrl, code) => {
    const width = _name === 'wrong dimensions' ? 3 : 2;
    expect(() => verifyNonblankCanvasPng(dataUrl, width, 2, 10_000)).toThrow(code);
  });
});
