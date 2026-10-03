export const REQUIRED_EVIDENCE_TAGS = [
  'ODOMETER',
  'FUEL',
  'WITNESSES',
] as const;

export function evidenceReadiness(items: Array<{ tags: string[] }>) {
  const tags = new Set(items.flatMap((item) => item.tags));
  const coverage = {
    odometer: tags.has('ODOMETER'),
    fuel: tags.has('FUEL'),
    witnesses: tags.has('WITNESSES'),
  };
  return {
    count: items.length,
    coverage: { ...coverage, complete: Object.values(coverage).every(Boolean) },
    ready:
      items.length >= 2 &&
      items.length <= 5 &&
      Object.values(coverage).every(Boolean),
  };
}

export function detectImageMime(content: Buffer): string | null {
  if (
    content
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return 'image/png';
  if (
    content[0] === 0xff &&
    content[1] === 0xd8 &&
    content[content.length - 2] === 0xff &&
    content[content.length - 1] === 0xd9
  )
    return 'image/jpeg';
  if (
    content.subarray(0, 4).toString() === 'RIFF' &&
    content.subarray(8, 12).toString() === 'WEBP'
  )
    return 'image/webp';
  return null;
}
