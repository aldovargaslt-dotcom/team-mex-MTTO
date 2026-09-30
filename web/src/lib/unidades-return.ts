export function safeUnidadesReturnTo(value: string | null | undefined): string {
  if (!value) return '/unidades';
  return /^\/unidades(?:\?[^#]*)?$/.test(value) ? value : '/unidades';
}

export function withUnidadesReturnTo(path: string, returnTo: string): string {
  const params = new URLSearchParams({ returnTo: safeUnidadesReturnTo(returnTo) });
  return `${path}?${params.toString()}`;
}
